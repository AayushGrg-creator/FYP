'use strict';

/**
 * auth.routes.js
 * TaskTide – Authentication route definitions
 *
 * Endpoints
 * ─────────
 *  POST  /api/auth/register  → register      (email/password sign-up)
 *  POST  /api/auth/login     → login         (email/password sign-in)
 *  POST  /api/auth/google    → googleSignIn  (sign-up or sign-in via Google OAuth)
 *  GET   /api/auth/session   → checkSession  (restore AuthContext on page reload)
 *  POST  /api/auth/logout    → logout        (clear session cookie)
 *
 * Security layers applied per route
 * ──────────────────────────────────
 *  1. express-rate-limit  – per-route IP throttling
 *  2. express-validator   – input schema validation before controller runs
 *  3. helmet              – applied globally in app.js (not repeated here)
 *
 * Rate-limit rationale
 * ────────────────────
 *  /register – 10 req / 15 min → same budget as /google, prevents mass account creation
 *  /login    – 10 req / 15 min → credential stuffing / brute-force prevention
 *  /google   – 10 req / 15 min → credential stuffing prevention (expensive verify call)
 *  /session  – 60 req / 15 min → polled by React AuthContext on mount & tab focus
 *                                 (reduced from 120 — still generous for normal usage)
 *  /logout   – 20 req / 15 min → no real attack surface; prevents automated spam
 *
 * NOTE on double rate-limiting:
 *  app.js applies authLimiter globally to /api/auth/*.
 *  These per-route limiters are MORE restrictive and act as a second tighter layer.
 *  The global limiter is a broad catch-all; per-route limiters enforce tighter budgets
 *  on sensitive operations. This is intentional and documented.
 */

const { Router }                 = require('express');
const rateLimit                  = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const authController = require('../controllers/auth.controller');
const logger         = require('../config/logger');

const router = Router();

// ─── Rate-limit factory ───────────────────────────────────────────────────────

/**
 * _makeRateLimiter
 * ────────────────
 * Factory that returns a configured express-rate-limit middleware instance.
 * Centralising this avoids repeating boilerplate for every route.
 *
 * @param {object} opts
 * @param {number} opts.windowMs  - Window size in milliseconds
 * @param {number} opts.max       - Max requests per window per IP
 * @param {string} opts.message   - Human-readable error message for 429 responses
 * @returns {import('express-rate-limit').RateLimitRequestHandler}
 */
function _makeRateLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders : true,   // Emit RateLimit-* headers (RFC 6585)
    legacyHeaders   : false,  // Suppress deprecated X-RateLimit-* headers
    handler(req, res) {
      logger.warn('Rate limit exceeded', {
        ip   : req.ip,
        path : req.path,
      });
      res.status(429).json({
        success : false,
        message,
      });
    },
  });
}

// Per-route rate limit instances
const registerRateLimit = _makeRateLimiter({
  windowMs : 15 * 60 * 1000,
  max      : 10,
  message  : 'Too many registration attempts from this IP. Please wait 15 minutes and try again.',
});

const loginRateLimit = _makeRateLimiter({
  windowMs : 15 * 60 * 1000,
  max      : 10,
  message  : 'Too many login attempts from this IP. Please wait 15 minutes and try again.',
});

const googleRateLimit = _makeRateLimiter({
  windowMs : 15 * 60 * 1000,
  max      : 10,
  message  : 'Too many sign-in attempts from this IP. Please wait 15 minutes and try again.',
});

const sessionRateLimit = _makeRateLimiter({
  windowMs : 15 * 60 * 1000,
  max      : 60,              // ✅ reduced from 120 — still generous for normal usage
  message  : 'Too many session-check requests. Please slow down.',
});

const logoutRateLimit = _makeRateLimiter({
  windowMs : 15 * 60 * 1000,
  max      : 20,
  message  : 'Too many logout requests. Please wait before trying again.',
});

// ─── Validation helpers ───────────────────────────────────────────────────────

/**
 * _validateRequest
 * ────────────────
 * Generic express-validator result handler.
 * Must be placed AFTER the field validation chains in the route definition.
 * Returns 400 with a structured error array on failure; calls next() on success.
 *
 * @param {import('express').Request}      req
 * @param {import('express').Response}     res
 * @param {import('express').NextFunction} next
 */
function _validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success : false,
      message : 'Validation failed.',
      errors  : errors.array().map((e) => ({
        field   : e.path,
        message : e.msg,
      })),
    });
  }
  next();
}

// ─── Validation chains ────────────────────────────────────────────────────────

/**
 * Validation chain for POST /register
 *
 * Rules:
 *  - name      required, string, 2-100 chars
 *  - email     required, valid email, normalized
 *  - password  required, min 6 chars
 *  - role      required, must be client|freelancer
 */
const registerValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required.')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters.'),

  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('Enter a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required.')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters.'),

  body('role')
    .notEmpty()
    .withMessage('Role is required.')
    .isIn(['client', 'freelancer'])
    .withMessage('role must be "client" or "freelancer".'),

  _validateRequest,
];

/**
 * Validation chain for POST /login
 *
 * Rules:
 *  - email     required, valid email, normalized
 *  - password  required, non-empty
 */
const loginValidation = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required.')
    .isEmail()
    .withMessage('Enter a valid email address.')
    .normalizeEmail(),

  body('password')
    .notEmpty()
    .withMessage('Password is required.'),

  _validateRequest,
];

/**
 * Validation chain for POST /google
 *
 * Rules:
 *  - credential  required, string, min 100 chars (Google JWTs are always long)
 *  - isSignUp    optional boolean (string "true"/"false" coerced via toBoolean)
 *  - role        required only when isSignUp === true; must be client|freelancer
 */
const googleSignInValidation = [
  body('credential')
    .exists({ checkFalsy: true })
    .withMessage('credential is required.')
    .isString()
    .withMessage('credential must be a string.')
    .isLength({ min: 100 })
    .withMessage('credential appears to be malformed (too short).'),

  body('isSignUp')
    .optional()
    .isBoolean()
    .withMessage('isSignUp must be a boolean.')
    .toBoolean(),     // coerce "true"/"false" strings from form-encoded bodies

  // ✅ FIXED: use custom() predicate instead of .equals(true) to reliably
  //    match the boolean true produced by .toBoolean() above.
  body('role')
    .if(body('isSignUp').custom((val) => val === true))
    .notEmpty()
    .withMessage('role is required when isSignUp is true.')
    .isIn(['client', 'freelancer'])
    .withMessage('role must be "client" or "freelancer".'),

  _validateRequest,
];

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/register
 * ────────────────────────
 * Create a new account using name/email/password.
 *
 * Body: { name: string, email: string, password: string, role: 'client'|'freelancer' }
 */
router.post(
  '/register',
  registerRateLimit,
  registerValidation,
  authController.register,
);

/**
 * POST /api/auth/login
 * ─────────────────────
 * Authenticate an existing account using email/password.
 *
 * Body: { email: string, password: string }
 */
router.post(
  '/login',
  loginRateLimit,
  loginValidation,
  authController.login,
);

/**
 * POST /api/auth/google
 * ─────────────────────
 * Accept a Google ID token from the frontend (One Tap or OAuth popup).
 * Performs sign-in or sign-up depending on the isSignUp flag.
 *
 * Body: { credential: string, isSignUp?: boolean, role?: 'client'|'freelancer' }
 */
router.post(
  '/google',
  googleRateLimit,
  googleSignInValidation,
  authController.googleSignIn,
);

/**
 * GET /api/auth/session
 * ─────────────────────
 * Validate the existing tt_session cookie and return the current user context.
 * Called by React AuthContext.Provider on app mount and browser tab focus.
 *
 * No body required.
 */
router.get(
  '/session',
  sessionRateLimit,
  authController.checkSession,
);

/**
 * POST /api/auth/logout
 * ─────────────────────
 * Clear the tt_session cookie to end the client session.
 *
 * No body required.
 */
router.post(
  '/logout',
  logoutRateLimit,
  authController.logout,
);

// ─── Export ───────────────────────────────────────────────────────────────────

module.exports = router;