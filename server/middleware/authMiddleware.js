/**
 * TaskTide Auth Middleware
 * Path: server/src/middleware/authMiddleware.js
 *
 * Responsibilities:
 *  - Extract & verify the tt_token JWT from cookies
 *  - Load the full User document from the database
 *  - Run account health checks (status, verification)
 *  - Attach req.user for downstream route handlers
 *  - Provide an optional role-based access control (RBAC) guard via `authorize()`
 */

'use strict';

const jwt  = require('jsonwebtoken');
const User = require('../models/User');

// ─── Constants ────────────────────────────────────────────────────────────────

const COOKIE_NAME = 'tt_session';
const SELECTED_FIELDS  = '+accountStatus +isVerified +role +email +tokenVersion';

// ─────────────────────────────────────────────────────────────────────────────
// Helper — build a uniform 401 / 403 / 500 response
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sends a standardised error response and ends the request cycle.
 *
 * @param {import('express').Response} res
 * @param {number}  statusCode
 * @param {string}  message
 * @param {string}  [code]       - Machine-readable error code for the client
 */
const sendAuthError = (res, statusCode, message, code) =>
  res.status(statusCode).json({
    success : false,
    code    : code ?? null,
    message,
  });


// ─────────────────────────────────────────────────────────────────────────────
// protect  —  primary authentication guard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Express middleware that authenticates every inbound request.
 *
 * Flow:
 *  1. Read tt_token cookie
 *  2. Verify JWT signature + expiry
 *  3. Validate decoded payload structure
 *  4. Load User document from DB
 *  5. Token-version check (supports global session invalidation)
 *  6. Account health checks  (suspended / unverified)
 *  7. Attach `req.user` and call next()
 *
 * @type {import('express').RequestHandler}
 */
const protect = async (req, res, next) => {
  try {

    // ── 1. Extract token from cookie ────────────────────────────────────────

    const token = req.cookies?.[COOKIE_NAME];

    if (!token) {
      return sendAuthError(
        res, 401,
        'Authentication required. Please log in.',
        'AUTH_TOKEN_MISSING'
      );
    }

    // ── 2. Verify JWT signature and expiry ──────────────────────────────────

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (jwtErr) {
      // Surface the exact reason to the client for better UX
      if (jwtErr.name === 'TokenExpiredError') {
        return sendAuthError(
          res, 401,
          'Your session has expired. Please log in again.',
          'AUTH_TOKEN_EXPIRED'
        );
      }

      if (jwtErr.name === 'JsonWebTokenError') {
        return sendAuthError(
          res, 401,
          'Invalid authentication token. Please log in.',
          'AUTH_TOKEN_INVALID'
        );
      }

      // NotBeforeError or any other JWT-specific error
      return sendAuthError(
        res, 401,
        'Token is not yet valid. Please try again.',
        'AUTH_TOKEN_NOT_BEFORE'
      );
    }

    // ── 3. Validate decoded payload structure ───────────────────────────────

   if (!decoded?.sub || typeof decoded.sub !== 'string') {
  return sendAuthError(
    res, 401,
    'Malformed token payload. Please log in again.',
    'AUTH_TOKEN_MALFORMED'
  );
}
    // ── 4. Fetch user from database ─────────────────────────────────────────

    let user;

    try {
      user = await User.findById(decoded.sub).select(SELECTED_FIELDS);
    } catch (dbErr) {
      // Separate DB errors from auth errors for cleaner logging
      console.error('[authMiddleware] DB lookup failed:', dbErr.message);
      return sendAuthError(
        res, 500,
        'Authentication service error. Please try again later.',
        'AUTH_DB_ERROR'
      );
    }

    if (!user) {
      return sendAuthError(
        res, 401,
        'The account associated with this token no longer exists.',
        'AUTH_USER_NOT_FOUND'
      );
    }

    // ── 5. Token-version check (global session invalidation) ────────────────
    //
    //  When a user changes their password or clicks "Log out all devices",
    //  increment user.tokenVersion in the DB.  Any token carrying an old
    //  version is immediately rejected without touching the JWT expiry.

    if (
      user.tokenVersion !== undefined &&
      decoded.tokenVersion !== undefined &&
      decoded.tokenVersion !== user.tokenVersion
    ) {
      return sendAuthError(
        res, 401,
        'Your session is no longer valid. Please log in again.',
        'AUTH_TOKEN_REVOKED'
      );
    }

    // ── 6. Account health checks ────────────────────────────────────────────

    const STATUS_RESPONSES = {
      suspended : {
        status  : 403,
        message : 'Your account has been suspended. Please contact support.',
        code    : 'ACCOUNT_SUSPENDED',
      },
      banned : {
        status  : 403,
        message : 'Your account has been permanently banned.',
        code    : 'ACCOUNT_BANNED',
      },
      deactivated : {
        status  : 403,
        message : 'Your account is deactivated. Please contact support to reactivate.',
        code    : 'ACCOUNT_DEACTIVATED',
      },
    };

    const statusEntry = STATUS_RESPONSES[user.accountStatus];

    if (statusEntry) {
      return sendAuthError(
        res,
        statusEntry.status,
        statusEntry.message,
        statusEntry.code
      );
    }

    if (!user.isVerified) {
      return sendAuthError(
        res, 403,
        'Please verify your email address before continuing.',
        'ACCOUNT_UNVERIFIED'
      );
    }

    // ── 7. Attach user to request and continue ──────────────────────────────

    req.user = user;
    return next();

  } catch (err) {
    // Catch-all for anything unexpected (e.g. mongoose schema crash)
    console.error('[authMiddleware] Unexpected error:', err.message);

    return sendAuthError(
      res, 500,
      'An unexpected error occurred. Please try again later.',
      'AUTH_UNEXPECTED_ERROR'
    );
  }
};


// ─────────────────────────────────────────────────────────────────────────────
// authorize  —  role-based access control (RBAC) guard
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Factory that returns a middleware enforcing role-based access.
 * Must be used AFTER `protect` in the middleware chain.
 *
 * @param  {...string} roles - Allowed roles (e.g. 'admin', 'manager')
 * @returns {import('express').RequestHandler}
 *
 * @example
 * router.delete('/users/:id', protect, authorize('admin'), deleteUser);
 */
const authorize = (...roles) => (req, res, next) => {
  // Guard: protect() must have run first
  if (!req.user) {
    return sendAuthError(
      res, 401,
      'Authentication required. Please log in.',
      'AUTH_TOKEN_MISSING'
    );
  }

  if (!roles.includes(req.user.role)) {
    return sendAuthError(
      res, 403,
      `Access denied. Required role: [${roles.join(', ')}]. Your role: ${req.user.role}.`,
      'AUTHZ_INSUFFICIENT_ROLE'
    );
  }

  return next();
};


// ─────────────────────────────────────────────────────────────────────────────

module.exports = { protect, authorize };
