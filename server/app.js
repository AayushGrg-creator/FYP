'use strict';

/**
 * app.js
 * TaskTide – Express application factory
 *
 * Creates and configures the Express application but does NOT start the
 * HTTP server — that responsibility belongs to server.js.
 *
 * Keeping them separate allows supertest to import the app for integration
 * testing without binding a port.
 *
 * Middleware order (intentional — do not rearrange):
 *   1.  Security headers  (helmet)
 *   2.  CORS
 *   3.  Global rate limiter
 *   4.  Body parsers
 *   5.  Cookie parser
 *   6.  HTTP request logger (dev only)
 *   7.  Health check route
 *   8.  API routes
 *   9.  404 handler
 *   10. Global error handler  ← must always be last
 *
 * NOTE: dotenv is intentionally NOT loaded here.
 * server.js is the true entry point and loads dotenv first.
 * Loading it here too would cause silent double-initialisation.
 */

require('express-async-errors'); // patches async handlers so thrown errors reach errorHandler

const express      = require('express');
const helmet       = require('helmet');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const morgan       = require('morgan');

const config          = require('./config/env');
const logger          = require('./config/logger');
const { healthCheck } = require('./config/db');

const { globalLimiter, authLimiter } = require('./middleware/rateLimiter');
const errorHandler                   = require('./middleware/errorHandler');

// ── Route imports (uncomment as each subsystem is built) ─────────────────────
const authRoutes         = require('./routes/auth.routes');
const profileRoutes      = require('./routes/profile.routes');
const jobRoutes          = require('./routes/job.routes');
const proposalRoutes     = require('./routes/proposal.routes');
const matchRoutes        = require('./routes/match.routes'); // FIX: was commented out
// const paymentRoutes   = require('./routes/payment.routes');
// const messageRoutes   = require('./routes/message.routes');
// const reputationRoutes = require('./routes/reputation.routes');
// const adminRoutes     = require('./routes/admin.routes');

// ─── Create app ───────────────────────────────────────────────────────────────
const app = express();

// ─── 1. Security headers via Helmet ──────────────────────────────────────────
app.use(
  helmet({
    crossOriginResourcePolicy : { policy: 'cross-origin' },
    // Disable CSP in development so React dev tools / hot reload work freely.
    // In production, let Helmet apply its strict default CSP.
    contentSecurityPolicy     : config.IS_PROD ? undefined : false,
  })
);

// ─── 2. CORS ──────────────────────────────────────────────────────────────────
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:5173',   // Vite default
  'http://localhost:4173',   // Vite preview
  config.CLIENT_URL,         // production front-end URL from env
].filter(Boolean);            // remove undefined / empty values

app.use(
  cors({
    origin(origin, callback) {
      // Allow server-to-server requests (no Origin header, e.g. Postman, curl)
      if (!origin) return callback(null, true);

      // In development: allow any localhost port (e.g. Storybook, test runners)
      const isLocalhost = /^http:\/\/localhost:\d+$/.test(origin);
      if (config.IS_DEV && isLocalhost) return callback(null, true);

      if (allowedOrigins.includes(origin)) return callback(null, true);

      // ✅ FIXED: attach status code so Express errorHandler formats it correctly
      logger.warn(`[CORS] Blocked request from disallowed origin: ${origin}`);
      const corsErr    = new Error(`CORS policy: origin '${origin}' is not allowed.`);
      corsErr.status   = 403;
      callback(corsErr);
    },
    credentials          : true,  // required for httpOnly cookies to be sent cross-origin
    methods              : ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders       : ['Content-Type', 'Authorization', 'X-Idempotency-Key'],
    exposedHeaders       : ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
    optionsSuccessStatus : 204,
  })
);

// ─── 3. Global rate limiter ───────────────────────────────────────────────────
// Broad catch-all limiter for the entire API.
// Per-route limiters in auth.routes.js enforce tighter budgets on
// sensitive endpoints on top of this.
app.use(globalLimiter);

// ─── 4. Body parsers ─────────────────────────────────────────────────────────
// ✅ FIXED: reduced JSON limit from 10mb → 50kb for auth routes.
// File uploads should use multipart middleware on specific routes only.
// rawBody is preserved for Stripe / Khalti webhook HMAC verification.
app.use(
  express.json({
    limit  : '50kb',
    verify(req, _res, buf) {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

// ─── 5. Cookie parser ─────────────────────────────────────────────────────────
app.use(cookieParser());

// ─── 6. HTTP request logger (development only) ───────────────────────────────
if (config.IS_DEV) {
  app.use(
    morgan('dev', {
      stream: {
        write: (msg) => logger.debug(`[HTTP] ${msg.trim()}`),
      },
    })
  );
}

// ─── 7. Health check ─────────────────────────────────────────────────────────
// Intentionally placed before API routes so it is never intercepted by
// route-level middleware (auth, rate-limit, etc.).
app.get('/health', (_req, res) => {
  const db = healthCheck();
  res.status(db.status === 'connected' ? 200 : 503).json({
    service   : 'tasktide-api',
    status    : db.status === 'connected' ? 'healthy' : 'degraded',
    database  : db,
    timestamp : new Date().toISOString(),
    env       : config.NODE_ENV,
  });
});

// ─── 8. API routes ────────────────────────────────────────────────────────────
// authLimiter applies a broad budget to all /api/auth/* endpoints.
// Each individual route inside auth.routes.js has a tighter per-operation limit.
app.use('/api/auth',        authLimiter, authRoutes);
app.use('/api/profile',     profileRoutes);
app.use('/api/jobs',        jobRoutes);
app.use('/api/proposals',   proposalRoutes);
app.use('/api/match',       matchRoutes); // FIX: was commented out
// app.use('/api/payments',   paymentRoutes);
// app.use('/api/messages',   messageRoutes);
// app.use('/api/reputation', reputationRoutes);
// app.use('/api/admin',      adminRoutes);

// ─── 9. 404 handler ───────────────────────────────────────────────────────────
app.use((req, res) => {
  logger.warn(`[Router] 404 — no route matched: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success : false,
    status  : 404,
    message : `Route '${req.method} ${req.originalUrl}' not found.`,
  });
});

// ─── 10. Global error handler (MUST be last middleware) ───────────────────────
app.use(errorHandler);

module.exports = app;