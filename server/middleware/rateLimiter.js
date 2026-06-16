'use strict';

/**
 * server/src/middleware/rateLimiter.js
 *
 * Two-tier express-rate-limit configuration for Task Tide.
 *
 * globalLimiter  — applied to every route    : 100 req / 15 min per IP
 * authLimiter    — applied to /api/auth/*    :  10 req / 15 min per IP
 *                  (brute-force protection on login / register)
 *
 * Both limits are read from env.js so they can be tuned per environment
 * without touching source code.
 *
 * Usage in app.js:
 *   const { globalLimiter, authLimiter } = require('./middleware/rateLimiter');
 *   app.use(globalLimiter);
 *   app.use('/api/auth', authLimiter, authRoutes);
 */

const rateLimit = require('express-rate-limit');
const config    = require('../config/env');
const logger    = require('../config/logger');

// ─── Shared handler called when a client exceeds their limit ──────────────────
function onLimitReached(req, res, options) {
  logger.warn(
    '[RateLimit]',
    `IP ${req.ip} exceeded limit on ${req.method} ${req.originalUrl}`
  );
  res.status(429).json({
    success: false,
    message: 'Too many requests — please slow down and try again shortly.',
    retryAfter: Math.ceil(options.windowMs / 1000 / 60) + ' minutes',
  });
}

// ─── Global limiter (all routes) ─────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs:         config.RATE_LIMIT_WINDOW_MS,       // default 15 min
  max:              config.RATE_LIMIT_MAX_REQUESTS,     // default 100
  standardHeaders:  true,   // Return rate-limit info in RateLimit-* headers
  legacyHeaders:    false,   // Disable X-RateLimit-* headers (deprecated)
  handler:          onLimitReached,
  skip: (req) => {
    // Never rate-limit the health-check endpoint
    return req.path === '/health';
  },
});

// ─── Auth limiter (stricter — brute-force protection) ─────────────────────────
const authLimiter = rateLimit({
  windowMs:        config.RATE_LIMIT_WINDOW_MS,        // same window
  max:             config.RATE_LIMIT_AUTH_MAX,          // default 10
  standardHeaders: true,
  legacyHeaders:   false,
  handler:         onLimitReached,
  // Key by IP + path so /login and /register have independent counters
  keyGenerator: (req) => `${req.ip}:${req.path}`,
});

module.exports = { globalLimiter, authLimiter };

