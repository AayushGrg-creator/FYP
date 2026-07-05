'use strict';

require('express-async-errors');

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

const authRoutes         = require('./routes/auth.routes');
const profileRoutes      = require('./routes/profile.routes');
const jobRoutes          = require('./routes/job.routes');
const proposalRoutes     = require('./routes/proposal.routes');
const matchRoutes        = require('./routes/match.routes');
// const paymentRoutes   = require('./routes/payment.routes'); // NOTE: currently broken — see payment.routes.js authorise/checkRole mismatch. Fix before uncommenting.
 const messageRoutes   = require('./routes/message.routes');
// const reputationRoutes = require('./routes/reputation.routes');
// const adminRoutes     = require('./routes/admin.routes');
const projectRoutes = require('./routes/project.routes');
const milestoneRoutes = require('./routes/milestone.routes');
const gamificationRoutes = require('./routes/gamification.routes');

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy : { policy: 'cross-origin' },
    contentSecurityPolicy     : config.IS_PROD ? undefined : false,
  })
);

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:3002',
  'http://localhost:3003',
  'http://localhost:5173',
  'http://localhost:4173',
  config.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      const isLocalhost = /^http:\/\/localhost:\d+$/.test(origin);
      if (config.IS_DEV && isLocalhost) return callback(null, true);

      if (allowedOrigins.includes(origin)) return callback(null, true);

      logger.warn(`[CORS] Blocked request from disallowed origin: ${origin}`);
      const corsErr    = new Error(`CORS policy: origin '${origin}' is not allowed.`);
      corsErr.status   = 403;
      callback(corsErr);
    },
    credentials          : true,
    methods              : ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders       : ['Content-Type', 'Authorization', 'X-Idempotency-Key'],
    exposedHeaders       : ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
    optionsSuccessStatus : 204,
  })
);

app.use(globalLimiter);

app.use(
  express.json({
    limit  : '50kb',
    verify(req, _res, buf) {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '50kb' }));

app.use(cookieParser());

if (config.IS_DEV) {
  app.use(
    morgan('dev', {
      stream: {
        write: (msg) => logger.debug(`[HTTP] ${msg.trim()}`),
      },
    })
  );
}

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

app.use('/api/auth',        authLimiter, authRoutes);
app.use('/api/profile',     profileRoutes);
app.use('/api/jobs',        jobRoutes);
app.use('/api/proposals',   proposalRoutes);
app.use('/api/match',       matchRoutes);
// app.use('/api/payments',   paymentRoutes);
app.use('/api/messages',   messageRoutes);
// app.use('/api/reputation', reputationRoutes);
// app.use('/api/admin',      adminRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/milestones', milestoneRoutes);
app.use('/api/gamification', gamificationRoutes);

app.use((req, res) => {
  logger.warn(`[Router] 404 — no route matched: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success : false,
    status  : 404,
    message : `Route '${req.method} ${req.originalUrl}' not found.`,
  });
});

app.use(errorHandler);

module.exports = app;