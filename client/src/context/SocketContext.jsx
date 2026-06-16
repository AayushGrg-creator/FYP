/**
 * auth.routes.js
 * TaskTide – Authentication Route Definitions & Enterprise Gateway Controls
 *
 * Endpoints
 * ─────────
 * POST   /api/auth/google    → googleSignIn  (Sign-up or Sign-in via OAuth 2.0 Identity Token)
 * GET    /api/auth/session   → checkSession  (Re-verify token session lifecycle on application focus)
 * POST   /api/auth/logout    → logout        (Clear HTTP-only application tracking session cookie)
 *
 * Security Topology Layers:
 * 1. express-rate-limit   – Tight operational bucket intervals mapped dynamically per identity string.
 * 2. express-validator    – Structural type casting and payload sanitization prior to controller execution.
 * 3. Winston Logger       – Security audit trails tracking isolated validation exception matrices.
 */

'use strict';

const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

const authController = require('../controllers/auth.controller');
const logger = require('../config/logger');

const router = Router();

// ─── Operational Rate-Limiter Factory Framework ───────────────────────────────

/**
 * _makeRateLimiter
 * ────────────────
 * Generates an isolated rate-limiting handler configured for reverse-proxy deployment environments.
 * Extracts explicit client identifiers safely using upstream network headers.
 *
 * @param {object} opts
 * @param {number} opts.windowMs   - Timeframe window boundary duration in milliseconds.
 * @param {number} opts.max        - Absolute allocation threshold capacity ceiling per tracking IP.
 * @param {string} opts.message    - Human-readable localized security alert string context.
 * @returns {import('express-rate-limit').RateLimitRequestHandler}
 */
function _makeRateLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,   // Exposes clean RateLimit-* headers complying with RFC 6585 RFC standards
    legacyHeaders: false,    // Disables legacy X-RateLimit-* headers to block network data footprint leaks
    
    // Dynamic key generator to ensure real client IPs are caught behind Nginx configurations
    keyGenerator(req) {
      return req.headers['x-forwarded-for'] 
        ? req.headers['x-forwarded-for'].split(',')[0].trim() 
        : req.ip || req.connection.remoteAddress;
    },
    
    handler(req, res) {
      logger.warn('Security Alert: Authentication Rate Limit Threshold Overrun Encountered', {
        ip: req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : req.ip,
        path: req.originalUrl,
        method: req.method,
        timestamp: new Date().toISOString()
      });
      
      return res.status(429).json({
        success: false,
        message,
        code: 'ERR_RATE_LIMIT_EXCEEDED'
      });
    },
  });
}

// /google – Strict limit layer protecting authentication endpoints from credential-stuffing botnets
const googleRateLimit = _makeRateLimiter({
  windowMs: 15 * 60 * 1000,  // 15-minute verification loop interval
  max: 10,                   // Strict 10-attempt baseline cap
  message: 'Too many authentication signatures initiated from this address. Core access locked for 15 minutes.',
});

// /session – Elevated limit mapping designed to absorb React AuthContext synchronization polling routines
const sessionRateLimit = _makeRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 120,                  // Supports high tab-focus refresh overhead lines comfortably
  message: 'Session synchronization polling frequency threshold exceeded. Execution loop throttled.',
});

// /logout – Standard security bounds protection to block automated denial-of-service (DoS) routines
const logoutRateLimit = _makeRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Excessive session destruction signals identified. Execution loop locked.',
});

// ─── Inline Validator Middleware Interceptors ─────────────────────────────────

/**
 * _validateRequest
 * ────────────────
 * Evaluates sanitization results compiled during structural type processing.
 * Isolates and logs unexpected malformed inputs prior to executing controller logic.
 */
function _validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logger.warn('Data Validation Exception Encountered on Auth Pipeline', {
      path: req.originalUrl,
      errorCount: errors.array().length,
      fields: errors.array().map(e => e.path)
    });

    return res.status(400).json({
      success: false,
      message: 'Payload structural schema validation failed.',
      errors: errors.array().map((e) => ({
        field: e.path,
        // Escapes text safely to prevent XSS reflection inside client validation panels
        message: String(e.msg).replace(/[&<>"']/g, (m) => ({
          '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;'
        })[m]),
      })),
    });
  }
  return next();
}

// Structural schema evaluation pipeline tracking Google OAuth payloads
const googleSignInValidation = [
  body('credential')
    .exists({ checkFalsy: true })
    .withMessage('Authentication credentials token is required.')
    .isString()
    .withMessage('Authentication credentials token formatting must be a string value.')
    .trim()
    .isLength({ min: 100 }) // Confirms presence of a dense JWT structural body typical of Google signatures
    .withMessage('Supplied identity structure appears completely malformed or truncated.'),

  body('isSignUp')
    .optional()
    .isBoolean()
    .withMessage('Sign-up status field mapping parameter must be a clear boolean.')
    .toBoolean(),

  body('role')
    .if(body('isSignUp').equals(true)) // Restricts field validation strictly to new user creation pipelines
    .notEmpty()
    .withMessage('An explicit administrative profile role definition is required during registration.')
    .isIn(['client', 'freelancer'])
    .withMessage('Target profile role registration context must strictly equal "client" or "freelancer".')
    .trim()
    .escape(),

  _validateRequest,
];

// ─── Route Declarations & Middleware Integration Lines ────────────────────────

/**
 * POST /api/auth/google
 * Processes identity assertions extracted via frontend OAuth pipelines.
 * Orchestrates seamless implicit creation layers or existing session recoveries.
 */
router.post(
  '/google',
  googleRateLimit,
  googleSignInValidation,
  authController.googleSignIn
);

/**
 * GET /api/auth/session
 * Queries browser cookie states to verify the active validity of the `tt_session` payload.
 * Invoked reactively by the React frontend framework layout containers on interface initialization.
 */
router.get(
  '/session',
  sessionRateLimit,
  authController.checkSession
);

/**
 * POST /api/auth/logout
 * Directs immediate server-side destruction protocols over the `tt_session` HTTP-only payload.
 */
router.post(
  '/logout',
  logoutRateLimit,
  authController.logout
);

module.exports = router;