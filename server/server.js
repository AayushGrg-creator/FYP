'use strict';

/**
 * server.js
 * TaskTide – HTTP server entry point
 *
 * Boot sequence
 * ─────────────
 *   1. Load & validate env vars  (dotenv + config/env.js)
 *   2. Connect to MongoDB        (abort on failure — no point listening)
 *   3. Start HTTP server         (bind PORT)
 *   4. Register graceful shutdown handlers
 *
 * Graceful shutdown
 * ─────────────────
 *   On SIGTERM (Render / Docker / Kubernetes) or SIGINT (Ctrl+C):
 *     a. Stop accepting new HTTP connections  (server.close())
 *     b. Drain in-flight requests             (up to SHUTDOWN_TIMEOUT_MS)
 *     c. Close MongoDB connection pool        (disconnect())
 *     d. Exit cleanly with code 0
 *
 *   If shutdown exceeds SHUTDOWN_TIMEOUT_MS the process is force-killed
 *   with exit code 1 to prevent indefinite hanging.
 *
 * NOTE: dotenv is loaded HERE (entry point) and NOT in app.js.
 * Double-loading is harmless but indicates unclear ownership.
 * server.js owns the process lifecycle; app.js owns request handling.
 */

// ── Must be first — load env vars before any other require ───────────────────
require('dotenv').config();

const config                  = require('./config/env');      // validates required vars; exits on missing
const logger                  = require('./config/logger');
const { connect, disconnect } = require('./config/db');
const app                     = require('./app');

// ─── Constants ────────────────────────────────────────────────────────────────

// Max milliseconds to wait for in-flight requests to drain before force-killing
const SHUTDOWN_TIMEOUT_MS = 10_000;

// ─── Boot ─────────────────────────────────────────────────────────────────────

/**
 * boot
 * ────
 * Async startup sequence. Awaits MongoDB before binding the port so the
 * server never accepts requests before the DB is ready.
 */
async function boot() {
  logger.info(`[Boot] Task Tide API — ${config.NODE_ENV.toUpperCase()}`);

  // ── Step 1: Connect to MongoDB ─────────────────────────────────────────────
  try {
    await connect();
  } catch (err) {
    logger.error(`[Boot] MongoDB connection failed — aborting startup: ${err.message}`);
    process.exit(1);
  }

  // ── Step 2: Start HTTP server ──────────────────────────────────────────────
  const server = app.listen(config.PORT, () => {
    logger.info(`[Server] HTTP server listening on http://localhost:${config.PORT}`);
    logger.info(`[Server] Health check → http://localhost:${config.PORT}/health`);
    logger.info(`[Server] Environment  → ${config.NODE_ENV}`);
  });

  // Surface bind errors (e.g. port already in use) before they become silent crashes
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.error(`[Server] Port ${config.PORT} is already in use. Set a different PORT in .env`);
    } else {
      logger.error(`[Server] HTTP server error: ${err.message}`);
    }
    process.exit(1);
  });

// ── Step 3: Attach Socket.io ────────────────────────────────────────────
  const { init } = require('./socket');
  init(server);
  logger.info('[Socket] Socket.io attached to HTTP server');

  // ── Step 4: Start background cron jobs (uncomment as each is built) ────────
  // require('./jobs/rebuildTfidfIndex');
  // require('./jobs/updateLeaderboard');
  // require('./jobs/sendPaymentReminders');

  // ── Step 5: Register graceful shutdown handlers ────────────────────────────
  registerShutdownHandlers(server);
}

// ─── Graceful shutdown ────────────────────────────────────────────────────────

/**
 * registerShutdownHandlers
 * ────────────────────────
 * Attach OS signal listeners and unhandled error listeners to the process.
 * All shutdown paths funnel through the single async shutdown() function.
 *
 * @param {import('http').Server} server
 */
function registerShutdownHandlers(server) {
  // ✅ FIXED: once-flag prevents double process.exit() if two signals or
  //    errors fire in rapid succession (e.g. two unhandledRejections at once)
  let isShuttingDown = false;

  /**
   * shutdown
   * ────────
   * Core shutdown logic — shared by SIGTERM, SIGINT, and error handlers.
   *
   * @param {string} signal - Name of the signal or event that triggered shutdown
   */
  async function shutdown(signal) {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`[Shutdown] ${signal} received — starting graceful shutdown…`);

    // Force-kill timer — if graceful drain stalls, hard-exit after timeout
    const forceKill = setTimeout(() => {
      logger.error(
        `[Shutdown] Graceful shutdown timed out after ${SHUTDOWN_TIMEOUT_MS}ms — forcing exit`
      );
      process.exit(1);
    }, SHUTDOWN_TIMEOUT_MS);

    // Prevent the timer from keeping the event loop alive indefinitely
    forceKill.unref();

    try {
      // ── a. Stop accepting new connections ────────────────────────────────
      await new Promise((resolve, reject) => {
        server.close((err) => {
          if (err) return reject(err);
          logger.info('[Shutdown] HTTP server closed — no longer accepting requests');
          resolve();
        });
      });

      // ── b. Close MongoDB connection pool cleanly ──────────────────────────
      await disconnect();

      clearTimeout(forceKill);
      logger.info('[Shutdown] Graceful shutdown complete ✓');
      process.exit(0);

    } catch (err) {
      logger.error(`[Shutdown] Error during shutdown: ${err.message}`);
      clearTimeout(forceKill);
      process.exit(1);
    }
  }

  /**
   * emergencyExit
   * ─────────────
   * Used by unhandledRejection and uncaughtException.
   * Gives the logger a single tick to flush before exiting.
   * The isShuttingDown flag prevents concurrent emergency exits.
   *
   * @param {string} reason - Human-readable description for the log
   */
  function emergencyExit(reason) {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.error(`[Process] Emergency exit triggered: ${reason}`);
    // One tick for logger to flush; then hard exit
    setTimeout(() => process.exit(1), 100);
  }

  // ── OS signal handlers ────────────────────────────────────────────────────
  // SIGTERM — sent by Render, Docker, Kubernetes, PM2 when stopping the process
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // SIGINT — sent by Ctrl+C in a development terminal
  process.on('SIGINT',  () => shutdown('SIGINT'));

  // ── Process error handlers ────────────────────────────────────────────────
  // Catch unhandled promise rejections — log and restart rather than running
  // in an unknown broken state. The process manager will restart the service.
  process.on('unhandledRejection', (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    logger.error(`[Process] Unhandled promise rejection: ${message}`);
    emergencyExit(`unhandledRejection: ${message}`);
  });

  // Catch synchronous uncaught exceptions — same policy as above
  process.on('uncaughtException', (err) => {
    logger.error(`[Process] Uncaught exception: ${err.message}`);
    emergencyExit(`uncaughtException: ${err.message}`);
  });
}

// ─── Run ──────────────────────────────────────────────────────────────────────
boot();
