/**
 * idempotency.js
 * Idempotency enforcement layer for Task Tide payment endpoints.
 *
 * Problem (§5.3 NFR-PAY-02):
 *   Network retries, browser double-submits, and webhook replays can trigger
 *   duplicate charges if every request hits the database independently.
 *   An idempotency key guarantees that a given operation is executed exactly
 *   once regardless of how many times the same request arrives.
 *
 * How it works:
 *   1. Client includes  Idempotency-Key: <uuid-v4>  in the request header.
 *   2. On first arrival the key is stored in the cache with status 'processing'.
 *   3. Once the handler completes, the response is serialised and stored
 *      against the key with status 'complete'.
 *   4. Any subsequent request carrying the same key receives the cached
 *      response immediately — the handler is never re-executed.
 *
 * Storage strategy:
 *   • Primary:  MongoDB  (IdempotencyRecord collection) — survives restarts,
 *               shared across multiple Node.js instances (horizontal scale).
 *   • Fallback: In-process Map — used when the DB write fails or during tests.
 *   Keys expire after IDEMPOTENCY_TTL_MS (24 hours by default, matching
 *   Stripe's own idempotency window).
 *
 * Usage — attach as Express middleware BEFORE the route handler:
 *   router.post('/fund', idempotencyMiddleware, paymentController.fundEscrow);
 *
 * Usage — generate a server-side key for outbound requests:
 *   const key = generateIdempotencyKey(userId, 'khalti-charge', milestoneId);
 */

'use strict';

const crypto   = require('crypto');
const mongoose = require('mongoose');
const logger   = require('../config/logger');

/* ─────────────────────────────────────────────
   Configuration
───────────────────────────────────────────── */
const IDEMPOTENCY_TTL_MS   = 24 * 60 * 60 * 1000;   // 24 hours
const IDEMPOTENCY_TTL_S    = IDEMPOTENCY_TTL_MS / 1000;
const PROCESSING_TIMEOUT_S = 30;                      // treat 'processing' as stale after 30 s

/* ─────────────────────────────────────────────
   MongoDB schema (inline — no separate model file needed for a utility)
   Documents are automatically removed after TTL by the MongoDB TTL index.
───────────────────────────────────────────── */
const idempotencySchema = new mongoose.Schema(
  {
    key: {
      type:     String,
      required: true,
      unique:   true,
      trim:     true,
      maxlength: 255,
    },
    userId: {
      // Scope keys to a user so two users cannot share the same key space
      type:  mongoose.Schema.Types.ObjectId,
      ref:   'User',
    },
    status: {
      // 'processing' → in-flight   |   'complete' → cached response available
      type:    String,
      enum:    ['processing', 'complete'],
      default: 'processing',
    },
    method:   { type: String },           // HTTP method of original request
    path:     { type: String },           // URL path of original request
    // Serialised response stored once the handler finishes
    response: {
      statusCode: { type: Number },
      body:       { type: mongoose.Schema.Types.Mixed },
    },
    // TTL index field — MongoDB removes the document after IDEMPOTENCY_TTL_S seconds
    expiresAt: {
      type:    Date,
      default: () => new Date(Date.now() + IDEMPOTENCY_TTL_MS),
    },
    createdAt: {
      type:    Date,
      default: Date.now,
    },
  },
  { collection: 'idempotency_records' },
);

// MongoDB server-side TTL — the document self-destructs at expiresAt
idempotencySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
idempotencySchema.index({ key: 1, userId: 1 }, { unique: true });

// Lazy model registration — avoids OverwriteModelError in test environments
const IdempotencyRecord = mongoose.models.IdempotencyRecord
  || mongoose.model('IdempotencyRecord', idempotencySchema);

/* ─────────────────────────────────────────────
   In-process fallback cache
   Map<key, { status, response, expiresAt }>
   Used when Mongo is unavailable or in unit tests.
───────────────────────────────────────────── */
const localCache = new Map();

function localGet(key) {
  const entry = localCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { localCache.delete(key); return null; }
  return entry;
}

function localSet(key, data) {
  localCache.set(key, { ...data, expiresAt: Date.now() + IDEMPOTENCY_TTL_MS });
}

/* ─────────────────────────────────────────────
   DB helpers with local-cache fallback
───────────────────────────────────────────── */
async function fetchRecord(key, userId) {
  try {
    return await IdempotencyRecord.findOne({ key, userId }).lean();
  } catch {
    return localGet(key);
  }
}

async function createRecord(key, userId, method, path) {
  try {
    const doc = await IdempotencyRecord.create({ key, userId, method, path });
    return doc;
  } catch (dbErr) {
    // Duplicate key → another request already created this record
    if (dbErr.code === 11000) {
      return IdempotencyRecord.findOne({ key, userId }).lean();
    }
    // DB unavailable — use local cache
    logger.warn('idempotency: DB write failed, falling back to local cache:', dbErr.message);
    localSet(key, { key, userId, status: 'processing', method, path });
    return localGet(key);
  }
}

async function markComplete(key, userId, statusCode, body) {
  const response = { statusCode, body };
  try {
    await IdempotencyRecord.findOneAndUpdate(
      { key, userId },
      { $set: { status: 'complete', response } },
      { new: true },
    );
  } catch {
    const entry = localGet(key);
    if (entry) localSet(key, { ...entry, status: 'complete', response });
  }
}

/* ─────────────────────────────────────────────
   Public: generateIdempotencyKey(userId, operation, resourceId)
   Produces a deterministic, URL-safe key for outbound API calls.
   Identical inputs always produce the same key — safe to retry.

   @param {string} userId      – the requesting user's ObjectId string
   @param {string} operation   – e.g. 'khalti-charge', 'stripe-capture'
   @param {string} resourceId  – milestone or transaction ObjectId string
   @returns {string}           – 64-char hex key
───────────────────────────────────────────── */
function generateIdempotencyKey(userId, operation, resourceId) {
  return crypto
    .createHash('sha256')
    .update(`${userId}:${operation}:${resourceId}`)
    .digest('hex');
}

/* ─────────────────────────────────────────────
   Public: idempotencyMiddleware
   Express middleware.  Intercepts requests carrying Idempotency-Key,
   replays cached responses for seen keys, and captures new responses.

   Requests WITHOUT the header pass through unaffected (idempotency
   is opt-in — callers that don't send the header take on the risk).
───────────────────────────────────────────── */
async function idempotencyMiddleware(req, res, next) {
  const rawKey = (req.headers['idempotency-key'] || '').trim();

  // No key supplied — pass through without enforcement
  if (!rawKey) return next();

  // Basic key format validation — reject keys that look malformed
  if (rawKey.length < 8 || rawKey.length > 255) {
    return res.status(400).json({
      success: false,
      message: 'Idempotency-Key must be between 8 and 255 characters.',
    });
  }

  // userId from JWT (set by authMiddleware.protect earlier in the chain)
  const userId = req.user?._id || null;

  // ── Look up existing record ────────────────
  const existing = await fetchRecord(rawKey, userId);

  if (existing) {
    // Still being processed by a concurrent request — return 409 to signal retry
    const isStale = existing.status === 'processing'
      && (Date.now() - new Date(existing.createdAt).getTime()) > PROCESSING_TIMEOUT_S * 1000;

    if (existing.status === 'processing' && !isStale) {
      return res.status(409).json({
        success: false,
        message: 'A request with this Idempotency-Key is still being processed. Please retry after a moment.',
        retryAfter: PROCESSING_TIMEOUT_S,
      });
    }

    // Completed — replay the original response
    if (existing.status === 'complete' && existing.response) {
      res.set('Idempotency-Replayed', 'true');
      res.set('Idempotency-Key', rawKey);
      return res.status(existing.response.statusCode).json(existing.response.body);
    }
  }

  // ── First time this key is seen — create a record and process ─────────────
  await createRecord(rawKey, userId, req.method, req.path);

  // Intercept res.json() so we can capture the response body
  const originalJson = res.json.bind(res);
  res.json = async function (body) {
    try {
      await markComplete(rawKey, userId, res.statusCode, body);
    } catch (err) {
      logger.warn('idempotency: failed to persist response:', err.message);
    }
    res.set('Idempotency-Key', rawKey);
    return originalJson(body);
  };

  next();
}

/* ─────────────────────────────────────────────
   Public: clearExpiredLocalCache
   House-keeping — call periodically (e.g. setInterval every hour)
   to prevent the in-process Map from growing unbounded.
───────────────────────────────────────────── */
function clearExpiredLocalCache() {
  const now = Date.now();
  let removed = 0;
  for (const [key, entry] of localCache) {
    if (now > entry.expiresAt) { localCache.delete(key); removed++; }
  }
  if (removed) logger.info(`idempotency: cleared ${removed} expired local cache entries`);
}

// Auto-purge every hour
setInterval(clearExpiredLocalCache, 60 * 60 * 1000).unref();

module.exports = {
  idempotencyMiddleware,
  generateIdempotencyKey,
  clearExpiredLocalCache,
  IdempotencyRecord,           // exported for testing and admin scripts
  _localCache: localCache,     // exported for unit-test inspection
};