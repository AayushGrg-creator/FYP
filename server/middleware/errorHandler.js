'use strict';

/**
 * server/src/middleware/errorHandler.js
 *
 * Global Express error-processing middleware for Task Tide.
 *
 * Behaviour
 * ─────────
 *  • Catches every error forwarded via next(err) or thrown inside
 *    async route handlers (requires express-async-errors or manual try/catch).
 *  • Maps well-known error types to their correct HTTP status codes.
 *  • In DEVELOPMENT  → full stack trace is logged AND returned in the response
 *    body so you can debug from the client.
 *  • In PRODUCTION   → stack trace is logged server-side only; the response
 *    only contains a safe, generic message (no internal path / line leakage).
 *  • Always returns structured JSON  { success, status, message [, stack] }.
 *
 * Usage
 * ─────
 *   Must be the LAST middleware registered in app.js:
 *     app.use(errorHandler);
 *
 *   Throw from a controller like this:
 *     const err = new Error('Job not found');
 *     err.statusCode = 404;
 *     throw err;           // express-async-errors catches it
 *     — or —
 *     next(err);           // manual forwarding
 */

const config = require('../config/env');
const logger = require('../config/logger');

// ─── Known error-type → HTTP status mappings ──────────────────────────────────
const ERROR_MAP = {
  // Mongoose validation error (e.g. required field missing)
  ValidationError: 400,

  // Mongoose cast error (e.g. invalid ObjectId in URL param)
  CastError: 400,

  // JWT errors from jsonwebtoken
  JsonWebTokenError: 401,
  TokenExpiredError:  401,

  // Multer file-upload errors
  MulterError: 400,
};

// ─── Specific Mongoose duplicate-key error code ───────────────────────────────
const MONGO_DUPLICATE_KEY = 11000;

// ─── humanise() — turn raw Mongoose errors into readable messages ─────────────

/**
 * @param {Error} err
 * @returns {{ statusCode: number, message: string }}
 */
function humanise(err) {
  // Mongoose duplicate key
  if (err.code === MONGO_DUPLICATE_KEY) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    const value = err.keyValue ? err.keyValue[field] : '';
    return {
      statusCode: 409,
      message: `${field.charAt(0).toUpperCase() + field.slice(1)} '${value}' is already in use.`,
    };
  }

  // Mongoose validation errors — join all sub-messages
  if (err.name === 'ValidationError' && err.errors) {
    const messages = Object.values(err.errors).map((e) => e.message);
    return { statusCode: 400, message: messages.join('. ') };
  }

  // Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    return { statusCode: 400, message: `Invalid value for field '${err.path}'.` };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return { statusCode: 401, message: 'Invalid token. Please sign in again.' };
  }
  if (err.name === 'TokenExpiredError') {
    return { statusCode: 401, message: 'Session expired. Please sign in again.' };
  }

  // Multer file-upload errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return { statusCode: 400, message: 'File is too large. Maximum allowed size is 10 MB.' };
    }
    return { statusCode: 400, message: `File upload error: ${err.message}` };
  }

  // Fall through — use the error's own statusCode or default to 500
  return {
    statusCode: err.statusCode || ERROR_MAP[err.name] || 500,
    message:    err.message    || 'An unexpected error occurred.',
  };
}

// ─── Global error handler ─────────────────────────────────────────────────────

/**
 * Express 4-argument error middleware — MUST have exactly 4 params.
 *
 * @param {Error}               err
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next  (required even if unused)
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  const { statusCode, message } = humanise(err);

  // ── Server-side logging (always includes stack) ────────────────────────────
  if (statusCode >= 500) {
    logger.error('[ErrorHandler]', `${req.method} ${req.originalUrl} → ${statusCode}: ${message}`, err);
  } else {
    logger.warn('[ErrorHandler]', `${req.method} ${req.originalUrl} → ${statusCode}: ${message}`);
  }

  // ── Response body ──────────────────────────────────────────────────────────
  const body = {
    success: false,
    status:  statusCode,
    message,
  };

  // Only expose the stack trace in development
  if (config.IS_DEV && err.stack) {
    body.stack = err.stack;
  }

  // Never expose stack in production — only safe message goes to client
  if (config.IS_PROD && statusCode === 500) {
    body.message = 'Internal server error. Please try again later.';
  }

  return res.status(statusCode).json(body);
}

module.exports = errorHandler;