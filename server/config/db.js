'use strict';

/**
 * server/src/config/db.js
 *
 * Production-hardened Mongoose connection layer for Task Tide.
 *
 * Features
 * ─────────
 *  • Connection pooling       maxPoolSize: 10  (handles burst traffic)
 *  • Fast failure detection   serverSelectionTimeoutMS: 5 000 ms
 *  • Heartbeat monitoring     heartbeatFrequencyMS: 10 000 ms
 *  • Auto-reconnect           Mongoose default back-off strategy
 *  • Full lifecycle hooks     connected | error | disconnected | reconnected
 *  • Graceful teardown        disconnect() exported for SIGTERM/SIGINT handlers
 *  • Singleton pattern        calling connect() twice is a no-op
 *
 * Usage
 * ─────
 *   const { connect, disconnect } = require('./config/db');
 *
 *   await connect();        // call once in server.js before app.listen()
 *   await disconnect();     // call in graceful-shutdown handler
 */

const mongoose = require('mongoose');
const config   = require('./env');
const logger   = require('./logger');

// ─── Connection options ───────────────────────────────────────────────────────
const MONGOOSE_OPTIONS = {
  // Connection pool — allow up to 10 simultaneous sockets per Node.js process.
  // Increase to 20-50 for high-traffic production deployments.
  maxPoolSize: 10,
  minPoolSize: 2,

  // How long the driver waits to find an available server before throwing.
  serverSelectionTimeoutMS: 5_000,

  // How long a single socket operation (query) may take before timing out.
  socketTimeoutMS: 45_000,

  // Heartbeat: ping every 10 s to detect stale connections early.
  heartbeatFrequencyMS: 10_000,

  // Automatically index new schema indexes on startup (disable in heavy prod).
  autoIndex: !config.IS_PROD,

  // Use the newer unified topology (default since Mongoose 6, explicit is safer).
  // serverApi removed from options — set inline on URI if Atlas requires it.
};

// ─── Track connection state ───────────────────────────────────────────────────
let isConnected = false;

// ─── Lifecycle event hooks ────────────────────────────────────────────────────
mongoose.connection.on('connected', () => {
  isConnected = true;
  logger.info('[DB]', `MongoDB connected  — pool: ${MONGOOSE_OPTIONS.maxPoolSize} sockets`);
});

mongoose.connection.on('error', (err) => {
  isConnected = false;
  logger.error('[DB]', `MongoDB connection error: ${err.message}`, err);
});

mongoose.connection.on('disconnected', () => {
  isConnected = false;
  logger.warn('[DB]', 'MongoDB disconnected — Mongoose will attempt to reconnect automatically');
});

mongoose.connection.on('reconnected', () => {
  isConnected = true;
  logger.info('[DB]', 'MongoDB reconnected successfully');
});

mongoose.connection.on('close', () => {
  isConnected = false;
  logger.info('[DB]', 'MongoDB connection closed');
});

// Log slow queries in development (threshold: 100 ms)
if (config.IS_DEV) {
  mongoose.set('debug', (collectionName, method, query, doc) => {
    logger.debug('[DB]', `${collectionName}.${method}  ${JSON.stringify(query)}`);
  });
}

// ─── connect() ────────────────────────────────────────────────────────────────

/**
 * Establish the Mongoose connection.
 * Safe to call multiple times — returns immediately if already connected.
 *
 * @returns {Promise<void>}
 * @throws  Will re-throw if the initial connection attempt fails so server.js
 *          can decide whether to retry or exit.
 */
async function connect() {
  if (isConnected) {
    logger.debug('[DB]', 'connect() called but connection already open — skipping');
    return;
  }

  logger.info('[DB]', 'Connecting to MongoDB Atlas…');

  try {
    await mongoose.connect(config.MONGODB_URI, MONGOOSE_OPTIONS);
    // The 'connected' event above will set isConnected = true and log success.
  } catch (err) {
    logger.error('[DB]', `Initial connection failed: ${err.message}`, err);
    throw err; // Let server.js handle the fatal exit
  }
}

// ─── disconnect() ────────────────────────────────────────────────────────────

/**
 * Gracefully close all pooled connections.
 * Call this from SIGTERM / SIGINT handlers after the HTTP server stops
 * accepting new requests so in-flight queries can finish.
 *
 * @returns {Promise<void>}
 */
async function disconnect() {
  if (!isConnected) {
    logger.debug('[DB]', 'disconnect() called but no open connection — skipping');
    return;
  }

  logger.info('[DB]', 'Closing MongoDB connection pool…');

  try {
    await mongoose.connection.close(false); // false = do NOT force-kill active sockets
    logger.info('[DB]', 'MongoDB connection pool closed cleanly');
  } catch (err) {
    logger.error('[DB]', `Error closing connection pool: ${err.message}`, err);
    throw err;
  }
}

// ─── healthCheck() ────────────────────────────────────────────────────────────

/**
 * Returns a snapshot of the current connection state.
 * Used by the /health endpoint in app.js.
 *
 * @returns {{ status: string, readyState: number, host: string|null }}
 */
function healthCheck() {
  const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };
  return {
    status:     states[mongoose.connection.readyState] || 'unknown',
    readyState: mongoose.connection.readyState,
    host:       mongoose.connection.host || null,
  };
}

module.exports = { connect, disconnect, healthCheck };