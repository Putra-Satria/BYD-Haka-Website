const express = require('express');
const router = express.Router();
const { authenticateSupabaseUser } = require('../middleware/supabaseAuth');
const {
  otpStore,
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
      return res.status(400).json({ error: 'User identity missing from authenticated token.' });
    }

    // 1. Cooldown Rate Limiting Check (60 seconds)
    const existingChallenge = await otpStore.get(userId);
    if (existingChallenge && existingChallenge.lastSentAt) {
      const secondsSinceLastSent = (Date.now() - new Date(existingChallenge.lastSentAt).getTime()) / 1000;
      if (secondsSinceLastSent < 60) {
        const remaining = Math.ceil(60 - secondsSinceLastSent);
        return res.status(429).json({
          error: `Please wait ${remaining} seconds before requesting another code.`,
          cooldownRemaining: remaining
        });
      }
    }

    // 2. Generate secure 6-digit OTP & HMAC SHA-256 Hash
    const otp = generateOTP();
    const otpHash = hashOTP(otp);

    // 3. Save challenge to Supabase PostgreSQL table (public.login_otp_challenges, TTL: 300s / 5 minutes)
    await otpStore.set(userId, { otpHash, attempts: 0, ttlSeconds: 300 });

    // 4. Send OTP via Brevo Transactional Email REST API v3
    const emailResult = await sendBrevoOTPEmail(email, otp);

    if (!emailResult.success) {
      // Brevo failed: Invalidate/delete challenge immediately so orphan challenges do not remain
      await otpStore.del(userId);

      return res.status(500).json({
        error: 'Failed to send verification code. Please try again.',
        reason: emailResult.reason
      });
    }

    // 5. Security Audit Log (NEVER log OTP plaintext)
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
      resendCooldownSeconds: 60
    });
  } catch (error) {
    console.error('[2FA Send Endpoint Error]:', error);
    return res.status(500).json({ error: 'Failed to send verification code. Please try again.' });
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

    // 1. Fetch Challenge from Supabase PostgreSQL (public.login_otp_challenges)
    const challenge = await otpStore.get(userId);

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

    // 2. Enforce Maximum 5 Failed Attempts Limit
    const currentAttempts = challenge.attempts || 0;
    if (currentAttempts >= 5) {
      // Invalidate & Delete Challenge from Supabase PostgreSQL immediately
      await otpStore.del(userId);

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

    // 3. Hash Comparison (HMAC SHA-256)
    const inputHash = hashOTP(otpInput.trim());

    if (inputHash !== challenge.otpHash) {
      const newAttempts = currentAttempts + 1;
      const attemptsRemaining = 5 - newAttempts;

      if (attemptsRemaining <= 0) {
        await otpStore.del(userId);

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

      // Update attempt count in Supabase PostgreSQL
      await otpStore.updateAttempts(userId, newAttempts);

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
    // ONE-TIME USE: Delete challenge from Supabase PostgreSQL immediately
    await otpStore.del(userId);

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

    // Log Security Audit Success Event
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

    // 1. Check 60-second Cooldown
    const existingChallenge = await otpStore.get(userId);
    if (existingChallenge && existingChallenge.lastSentAt) {
      const secondsSinceLastSent = (Date.now() - new Date(existingChallenge.lastSentAt).getTime()) / 1000;
      if (secondsSinceLastSent < 60) {
        const remaining = Math.ceil(60 - secondsSinceLastSent);
        return res.status(429).json({
          error: `Please wait ${remaining} seconds before requesting another code.`,
          cooldownRemaining: remaining
        });
      }
    }

    // 2. Invalidate previous OTP challenge
    await otpStore.del(userId);

    // 3. Generate new 6-digit OTP & HMAC Hash
    const newOtp = generateOTP();
    const newOtpHash = hashOTP(newOtp);

    // 4. Reset attempts to 0, expires_at to +5 minutes
    await otpStore.set(userId, { otpHash: newOtpHash, attempts: 0, ttlSeconds: 300 });

    // 5. Send new OTP via Brevo REST API v3
    const emailResult = await sendBrevoOTPEmail(email, newOtp);

    if (!emailResult.success) {
      await otpStore.del(userId);
      return res.status(500).json({
        error: 'Failed to send verification code. Please try again.',
        reason: emailResult.reason
      });
    }

    // 6. Security Audit Log
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
    console.error('[2FA Resend Endpoint Error]:', error);
    return res.status(500).json({ error: 'Failed to send verification code. Please try again.' });
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
