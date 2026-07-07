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
  windowMs:         config.RATE_LIMIT_WINDOW_MS,
  max:              config.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders:  true,
  legacyHeaders:    false,
  handler:          onLimitReached,
  skip: (req) => {
    // Never rate-limit the health-check endpoint
    if (req.path === '/health') return true;
    // Session checks fire on every mount/reload (incl. after payment
    // redirects) — don't let them share a budget with everything else
    if (req.path === '/api/auth/session') return true;
    return false;
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

