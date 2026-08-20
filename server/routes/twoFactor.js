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
      return res.status(400).json({ error: 'User identity missing from token.' });
    }

    const otpKey = `login_otp:${userId}`;
    const cooldownKey = `login_cooldown:${userId}`;

    // 1. Cooldown Rate Limiting Check (60 seconds)
    const activeCooldown = await redis.get(cooldownKey);
    if (activeCooldown) {
      return res.status(429).json({
        error: 'Please wait 60 seconds before requesting another code.',
        cooldownRemaining: 60
      });
    }

    // 2. Generate secure 6-digit OTP & HMAC SHA-256 Hash
    const otp = generateOTP();
    const otpHash = hashOTP(otp);

    // 3. Save challenge to In-Memory TTL Store (TTL: 300s / 5 minutes - NO SQL Table Needed!)
    const challengeData = {
      otpHash,
      attempts: 0,
      createdAt: new Date().toISOString(),
      lastSentAt: new Date().toISOString(),
      email
    };

    await redis.set(otpKey, challengeData, 300);

    // 4. Set 60s Resend Cooldown
    await redis.set(cooldownKey, 'active', 60);

    // 5. Send OTP via Brevo API v3 or Console Fallback
    const emailResult = await sendBrevoOTPEmail(email, otp);

    // 6. Security Audit Log
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
      emailMode: emailResult.mode || 'success'
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
    const { code } = req.body;

    const otpInput = code || req.body.otp;
    if (!otpInput || typeof otpInput !== 'string' || otpInput.trim().length !== 6) {
      return res.status(400).json({ error: 'Please enter a complete 6-digit verification code.' });
    }

    const otpKey = `login_otp:${userId}`;
    const challenge = await redis.get(otpKey);

    // 1. Check Expiration / Existence
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
      await redis.del(otpKey);

      await logSecurityAudit({
        action: 'OTP_MAX_ATTEMPT',
        status: 'blocked',
        email,
        userId,
        description: 'OTP challenge invalidated after maximum failed verification attempts.'
      });

      return res.status(429).json({
        error: 'Too many failed attempts. Please request a new verification code.',
        maxAttemptsExceeded: true
      });
    }

    // 3. Hash Comparison
    const inputHash = hashOTP(otpInput.trim());

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
          error: 'Too many failed attempts. Please request a new verification code.',
          maxAttemptsExceeded: true,
          attemptsRemaining: 0
        });
      }

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
        error: `Invalid login verification code. ${attemptsRemaining} attempt(s) remaining.`,
        attemptsRemaining
      });
    }

    // 4. VERIFICATION SUCCESSFUL!
    // ONE-TIME USE: Delete challenge key immediately
    await redis.del(otpKey);

    // Issue Secure 2FA Session Verification Token
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
      description: 'Email second-step verification completed successfully.'
    });

    return res.json({
      success: true,
      verified: true,
      verifiedSessionToken,
      message: 'Second-step verification completed successfully.'
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

    if (activeCooldown) {
      return res.status(429).json({
        error: 'Please wait 60 seconds before requesting another code.',
        cooldownRemaining: 60
      });
    }

    const otpKey = `login_otp:${userId}`;
    await redis.del(otpKey);

    const newOtp = generateOTP();
    const newOtpHash = hashOTP(newOtp);

    await redis.set(otpKey, {
      otpHash: newOtpHash,
      attempts: 0,
      createdAt: new Date().toISOString(),
      lastSentAt: new Date().toISOString(),
      email
    }, 300);

    await redis.set(cooldownKey, 'active', 60);

    const emailResult = await sendBrevoOTPEmail(email, newOtp);

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
      verified: isVerified,
      userId: req.user.id,
      email: req.user.email
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch 2FA status.' });
  }
});

// POST /api/2fa/logout
router.post('/logout', async (req, res) => {
  try {
    res.clearCookie('haka_2fa_verified');
    return res.json({ success: true, message: '2FA session cleared.' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to clear session.' });
  }
});

module.exports = router;
