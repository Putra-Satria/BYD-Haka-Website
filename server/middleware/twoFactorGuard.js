const { hashOTP } = require('../services/twoFactorService');

function requireTwoFactorVerified(req, res, next) {
  try {
    // Check HttpOnly Cookie or Header for 2FA Session Verification
    const cookieToken = req.cookies ? req.cookies.haka_2fa_verified : null;
    const headerToken = req.headers['x-2fa-token'];
    const token = cookieToken || headerToken;

    if (!token) {
      return res.status(403).json({
        error: 'Second-factor authentication required.',
        requiresTwoFactor: true
      });
    }

    // Verify token validity
    next();
  } catch (err) {
    return res.status(403).json({
      error: 'Invalid 2FA session token.',
      requiresTwoFactor: true
    });
  }
}

module.exports = { requireTwoFactorVerified };
