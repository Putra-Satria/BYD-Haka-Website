const express = require('express');
const router = express.Router();
const { authenticateSupabaseUser } = require('../middleware/supabaseAuth');
const {
  redis,
  generateOTP,
  hashOTP,
  sendBrevoOTPEmail,
  logSecurityAudit
} = require('../services/twoFactorService');

// POST /api/2fa/send
router.post('/send', authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const email = req.user.email;

    if (!userId || !email) {
      return res.status(400).json({ error: 'User email and ID are required.' });
    }

    const otpKey = `login_otp:${userId}`;
    const cooldownKey = `login_cooldown:${userId}`;

    // 1. Rate Limiting Check: 60-second resend cooldown
    const activeCooldown = await redis.get(cooldownKey);
    if (activeCooldown) {
      return res.status(429).json({
        error: 'Please wait 60 seconds before requesting another verification code.',
        cooldownRemaining: 60
      });
    }

    // 2. Cryptographically secure 6-digit OTP generation
    const otp = generateOTP();
    const otpHash = hashOTP(otp);

    // 3. Save challenge to Redis (TTL: 300s / 5 minutes)
    const challengeData = {
      otpHash,
      attempts: 0,
      createdAt: new Date().toISOString(),
      lastSentAt: new Date().toISOString(),
      email
    };

    await redis.set(otpKey, challengeData, 300);

    // 4. Set 60-second Resend Cooldown
    await redis.set(cooldownKey, 'active', 60);

    // 5. Send Email via Brevo API
    const emailResult = await sendBrevoOTPEmail(email, otp);

    // 6. Security Audit Event Log (NEVER log OTP plaintext)
    await logSecurityAudit({
      action: 'OTP_SENT',
      status: 'success',
      email,
      userId,
      description: 'Login verification code sent to registered email.'
    });

    return res.json({
      success: true,
      message: 'Verification code sent successfully.',
      expiresInSeconds: 300,
      resendCooldownSeconds: 60,
      emailMode: emailResult.success ? 'brevo_delivered' : 'brevo_queued'
    });
  } catch (error) {
    console.error('[2FA Send Error]:', error);
    return res.status(500).json({ error: 'Internal server error generating verification code.' });
  }
});

// POST /api/2fa/verify
router.post('/verify', authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const email = req.user.email;
    const { otp } = req.body;

    if (!otp || typeof otp !== 'string' || otp.trim().length !== 6) {
      return res.status(400).json({ error: 'Please enter a complete 6-digit verification code.' });
    }

    const otpKey = `login_otp:${userId}`;
    const challenge = await redis.get(otpKey);

    // 1. Expiration / Challenge Existence Check
    if (!challenge) {
      await logSecurityAudit({
        action: 'OTP_EXPIRED',
        status: 'failed',
        email,
        userId,
        description: 'Attempted to verify an expired or non-existent OTP challenge.'
      });

      return res.status(400).json({
        error: 'Verification code has expired. Please request a new code.',
        expired: true
      });
    }

    // 2. Maximum Attempts Check (Limit: 5 attempts)
    const currentAttempts = challenge.attempts || 0;
    if (currentAttempts >= 5) {
      // Invalidate Redis Key immediately
      await redis.del(otpKey);

      await logSecurityAudit({
        action: 'OTP_MAX_ATTEMPT',
        status: 'blocked',
        email,
        userId,
        description: 'OTP challenge invalidated after maximum failed verification attempts.'
      });

      return res.status(429).json({
        error: 'Too many failed attempts. This verification code has been invalidated. Please request a new code.',
        maxAttemptsExceeded: true
      });
    }

    // 3. Hash comparison
    const inputHash = hashOTP(otp.trim());

    if (inputHash !== challenge.otpHash) {
      const newAttempts = currentAttempts + 1;
      const attemptsRemaining = 5 - newAttempts;

      if (attemptsRemaining <= 0) {
        await redis.del(otpKey);

        await logSecurityAudit({
          action: 'OTP_MAX_ATTEMPT',
          status: 'blocked',
          email,
          userId,
          description: 'OTP challenge invalidated after 5 failed attempts.'
        });

        return res.status(429).json({
          error: 'Too many failed attempts. This verification code has been invalidated. Please request a new code.',
          maxAttemptsExceeded: true,
          attemptsRemaining: 0
        });
      }

      // Update attempt count in Redis
      challenge.attempts = newAttempts;
      await redis.set(otpKey, challenge, 300);

      await logSecurityAudit({
        action: 'OTP_VERIFY_FAILED',
        status: 'failed',
        email,
        userId,
        description: 'Invalid login verification code.'
      });

      return res.status(400).json({
        error: `Invalid verification code. ${attemptsRemaining} attempt(s) remaining.`,
        attemptsRemaining
      });
    }

    // 4. VERIFICATION SUCCESS!
    // One-Time Use: Delete Redis challenge key immediately
    await redis.del(otpKey);

    // Generate Secure 2FA Session Verification Token
    const verifiedSessionToken = hashOTP(`${userId}:${Date.now()}:verified_session`);

    // Set Secure HttpOnly Cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('haka_2fa_verified', verifiedSessionToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 8 * 60 * 60 * 1000 // 8 Hours Session TTL
    });

    // Log Security Audit Event
    await logSecurityAudit({
      action: 'OTP_VERIFY_SUCCESS',
      status: 'success',
      email,
      userId,
      description: 'Email second-factor verification completed successfully.'
    });

    return res.json({
      success: true,
      verified: true,
      verifiedSessionToken,
      message: 'Second-factor authentication verified successfully.'
    });
  } catch (error) {
    console.error('[2FA Verify Error]:', error);
    return res.status(500).json({ error: 'Internal server error verifying code.' });
  }
});

// POST /api/2fa/resend
router.post('/resend', authenticateSupabaseUser, async (req, res) => {
  try {
    const userId = req.user.id;
    const email = req.user.email;

    const cooldownKey = `login_cooldown:${userId}`;
    const activeCooldown = await redis.get(cooldownKey);

    // 1. Check 60-second Cooldown Protection
    if (activeCooldown) {
      return res.status(429).json({
        error: 'Please wait 60 seconds before requesting another code.',
        cooldownRemaining: 60
      });
    }

    const otpKey = `login_otp:${userId}`;

    // 2. Invalidate previous OTP challenge
    await redis.del(otpKey);

    // 3. Generate new secure 6-digit OTP
    const newOtp = generateOTP();
    const newOtpHash = hashOTP(newOtp);

    // 4. Reset attempts to 0, Redis TTL back to 300s
    await redis.set(otpKey, {
      otpHash: newOtpHash,
      attempts: 0,
      createdAt: new Date().toISOString(),
      lastSentAt: new Date().toISOString(),
      email
    }, 300);

    // 5. Reset 60s cooldown
    await redis.set(cooldownKey, 'active', 60);

    // 6. Send new email via Brevo
    await sendBrevoOTPEmail(email, newOtp);

    // 7. Security Audit Logging
    await logSecurityAudit({
      action: 'OTP_RESEND',
      status: 'success',
      email,
      userId,
      description: 'Login verification code resend requested.'
    });

    return res.json({
      success: true,
      message: 'New verification code sent successfully.',
      expiresInSeconds: 300,
      resendCooldownSeconds: 60
    });
  } catch (error) {
    console.error('[2FA Resend Error]:', error);
    return res.status(500).json({ error: 'Internal server error resending code.' });
  }
});

// GET /api/2fa/status
router.get('/status', authenticateSupabaseUser, async (req, res) => {
  try {
    const cookieToken = req.cookies ? req.cookies.haka_2fa_verified : null;
    const headerToken = req.headers['x-2fa-token'];
    const isVerified = !!(cookieToken || headerToken);

    return res.json({
      userId: req.user.id,
      email: req.user.email,
      verified: isVerified
    });
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error fetching status.' });
  }
});

// POST /api/2fa/logout
router.post('/logout', async (req, res) => {
  try {
    res.clearCookie('haka_2fa_verified');
    return res.json({ success: true, message: '2FA session invalidated.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to clear session.' });
  }
});

module.exports = router;
