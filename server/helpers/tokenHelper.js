const jwt  = require('jsonwebtoken');
const User = require('../models/User');

/**
 * protect
 *
 * Reads the tt_token cookie, verifies the JWT signature,
 * loads the full User document, and populates req.user.
 * Blocks the request with 401 if any step fails.
 */
const protect = async (req, res, next) => {
  try {
    // ── 1. Extract token from cookie ─────────────────────────────────────────
    const token = req.cookies && req.cookies.tt_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please log in.',
      });
    }

    // ── 2. Verify signature and decode payload ────────────────────────────────
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      // Distinguish between expired and otherwise invalid tokens
      const message =
        jwtErr.name === 'TokenExpiredError'
          ? 'Your session has expired. Please log in again.'
          : 'Invalid authentication token. Please log in.';

      return res.status(401).json({ success: false, message });
    }

    // ── 3. Defensive check — decoded payload must contain a user id ───────────
    if (!decoded || !decoded.id) {
      return res.status(401).json({
        success: false,
        message: 'Malformed token payload. Please log in again.',
      });
    }

    // ── 4. Fetch user from database ───────────────────────────────────────────
    const user = await User.findById(decoded.id).select(
      '+accountStatus +isVerified +role +email'
    );

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'The account associated with this token no longer exists.',
      });
    }

    // ── 5. Account health checks ──────────────────────────────────────────────
    if (user.accountStatus === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact support.',
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email address before continuing.',
      });
    }

    // ── 6. Attach user to request and proceed ─────────────────────────────────
    req.user = user;
    return next();

  } catch (err) {
    // Catch any unexpected errors (e.g. DB connection issues)
    console.error('[authMiddleware] Unexpected error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Authentication service error. Please try again later.',
    });
  }
};

module.exports = { protect };