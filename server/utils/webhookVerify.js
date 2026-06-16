/**
 * webhookVerify.js
 * Cryptographic signature verification for incoming payment gateway webhooks.
 *
 * Supported gateways (§4.7 Payment Integration):
 *   • Stripe  – HMAC-SHA256 with timestamp tolerance
 *   • Khalti  – HMAC-SHA256 flat signature header
 *
 * Critical design requirement (§5.3 NFR-PAY-03):
 *   Webhook endpoints must receive the RAW, unmodified request body buffer.
 *   Express's json() middleware parses + re-serialises the body, which breaks
 *   signature verification. Two strategies are provided:
 *     A) rawBodyMiddleware — captures req.rawBody BEFORE json() runs.
 *        Mount this on the Express app BEFORE app.use(express.json()).
 *     B) stripeWebhookBodyMiddleware / khaltiWebhookBodyMiddleware —
 *        use express.raw() scoped only to the webhook route, keeping all
 *        other routes on normal JSON parsing.
 *
 * Usage (recommended — option B, route-scoped):
 *   router.post(
 *     '/webhook/stripe',
 *     webhookVerify.stripeWebhookBodyMiddleware,   // raw buffer
 *     webhookVerify.verifyStripeSignatureMiddleware, // verify
 *     paymentController.handleStripeWebhook,
 *   );
 *
 *   router.post(
 *     '/webhook/khalti',
 *     webhookVerify.khaltiWebhookBodyMiddleware,
 *     webhookVerify.verifyKhaltiSignatureMiddleware,
 *     paymentController.handleKhaltiWebhook,
 *   );
 */

'use strict';

const crypto  = require('crypto');
const express = require('express');
const logger  = require('../config/logger');

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
// Stripe allows up to 300 s clock drift (we use 300 for safety)
const STRIPE_TOLERANCE_SECONDS = 300;

const STRIPE_SIGNATURE_HEADER  = 'stripe-signature';
const KHALTI_SIGNATURE_HEADER  = 'x-khalti-signature';

/* ═══════════════════════════════════════════════════════════════════
   SECTION 1 — Raw body capture middleware
═══════════════════════════════════════════════════════════════════ */

/**
 * rawBodyMiddleware
 * Global middleware — captures the raw body buffer on EVERY request
 * and stores it in req.rawBody.
 *
 * Mount BEFORE express.json():
 *   app.use(rawBodyMiddleware);
 *   app.use(express.json());
 */
function rawBodyMiddleware(req, res, next) {
  let data = Buffer.alloc(0);

  req.on('data', (chunk) => {
    data = Buffer.concat([data, chunk]);
  });

  req.on('end', () => {
    req.rawBody = data;
    next();
  });

  req.on('error', (err) => {
    logger.error('webhookVerify.rawBodyMiddleware stream error:', err);
    next(err);
  });
}

/**
 * stripeWebhookBodyMiddleware
 * Route-scoped middleware using express.raw().
 * Parses the body as a Buffer and stores it in req.body (also req.rawBody).
 * Apply only to the Stripe webhook route.
 */
const stripeWebhookBodyMiddleware = [
  express.raw({ type: 'application/json', limit: '1mb' }),
  (req, _res, next) => {
    // express.raw() puts the Buffer into req.body;
    // copy to req.rawBody for consistency with the global approach
    if (Buffer.isBuffer(req.body)) {
      req.rawBody = req.body;
    } else if (req.rawBody) {
      // already captured by global middleware — nothing to do
    } else {
      req.rawBody = Buffer.from(JSON.stringify(req.body || ''), 'utf8');
    }
    next();
  },
];

/**
 * khaltiWebhookBodyMiddleware
 * Route-scoped middleware for Khalti webhooks.
 * Khalti sends JSON; we still need the raw buffer for HMAC.
 */
const khaltiWebhookBodyMiddleware = [
  express.raw({ type: 'application/json', limit: '1mb' }),
  (req, _res, next) => {
    if (Buffer.isBuffer(req.body)) {
      req.rawBody = req.body;
    } else {
      req.rawBody = req.rawBody || Buffer.from('', 'utf8');
    }
    next();
  },
];

/* ═══════════════════════════════════════════════════════════════════
   SECTION 2 — Stripe signature verification
   Algorithm: https://stripe.com/docs/webhooks/signatures
═══════════════════════════════════════════════════════════════════ */

/**
 * verifyStripeSignature(rawBody, signatureHeader, secret, toleranceSeconds?)
 * Pure function — returns the parsed event object on success.
 * Throws a descriptive Error on failure.
 *
 * Stripe's Stripe-Signature header format:
 *   t=<timestamp>,v1=<hmac_hex>[,v1=<additional_hmac_hex>]
 *
 * @param {Buffer|string} rawBody
 * @param {string}        signatureHeader   – value of stripe-signature header
 * @param {string}        secret            – STRIPE_WEBHOOK_SECRET env var
 * @param {number}        [toleranceSeconds=300]
 * @returns {object}      parsed JSON event
 */
function verifyStripeSignature(
  rawBody,
  signatureHeader,
  secret,
  toleranceSeconds = STRIPE_TOLERANCE_SECONDS,
) {
  if (!rawBody)          throw new Error('Missing raw request body.');
  if (!signatureHeader)  throw new Error('Missing Stripe-Signature header.');
  if (!secret)           throw new Error('Stripe webhook secret is not configured.');

  // ── Parse the header ──────────────────────
  const parts     = signatureHeader.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.slice(2);
  const signatures = parts
    .filter(p => p.startsWith('v1='))
    .map(p => p.slice(3));

  if (!timestamp || signatures.length === 0) {
    throw new Error('Malformed Stripe-Signature header: missing timestamp or v1 signature.');
  }

  // ── Timestamp tolerance ───────────────────
  const ts      = parseInt(timestamp, 10);
  const nowSecs = Math.floor(Date.now() / 1000);
  const drift   = Math.abs(nowSecs - ts);

  if (drift > toleranceSeconds) {
    throw new Error(
      `Stripe webhook timestamp is outside the ${toleranceSeconds}s tolerance window ` +
      `(drift: ${drift}s). Possible replay attack.`,
    );
  }

  // ── Compute expected HMAC ─────────────────
  const payload  = `${timestamp}.${rawBody.toString('utf8')}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');

  // ── Constant-time comparison against every v1 signature ──────────
  const expectedBuf = Buffer.from(expected, 'hex');
  const matched = signatures.some(sig => {
    const sigBuf = Buffer.from(sig, 'hex');
    // Lengths must match before timingSafeEqual to avoid exceptions
    if (sigBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(sigBuf, expectedBuf);
  });

  if (!matched) {
    throw new Error('Stripe webhook signature mismatch. Possible forgery.');
  }

  // ── Parse and return the event ────────────
  try {
    return JSON.parse(rawBody.toString('utf8'));
  } catch {
    throw new Error('Stripe webhook body is not valid JSON.');
  }
}

/**
 * verifyStripeSignatureMiddleware
 * Express middleware wrapper around verifyStripeSignature.
 * Attaches the parsed event to req.stripeEvent on success.
 * Returns 400 on verification failure — never 500 (bad signatures are
 * client errors, not server errors).
 */
function verifyStripeSignatureMiddleware(req, res, next) {
  const signatureHeader = req.headers[STRIPE_SIGNATURE_HEADER];
  const secret          = process.env.STRIPE_WEBHOOK_SECRET;

  try {
    const event       = verifyStripeSignature(req.rawBody, signatureHeader, secret);
    req.stripeEvent   = event;
    logger.info(`webhookVerify: Stripe event verified — type=${event.type} id=${event.id}`);
    next();
  } catch (err) {
    logger.warn(`webhookVerify: Stripe signature rejected — ${err.message}`);
    return res.status(400).json({ success: false, message: err.message });
  }
}

/* ═══════════════════════════════════════════════════════════════════
   SECTION 3 — Khalti signature verification
   Khalti sends:  X-Khalti-Signature: <hmac_sha256_hex>
   Computed as:   HMAC-SHA256(rawBody, KHALTI_WEBHOOK_SECRET)
═══════════════════════════════════════════════════════════════════ */

/**
 * verifyKhaltiSignature(rawBody, signatureHeader, secret)
 * Pure function.  Returns parsed event object on success.
 * Throws on failure.
 *
 * @param {Buffer|string} rawBody
 * @param {string}        signatureHeader   – value of x-khalti-signature header
 * @param {string}        secret            – KHALTI_WEBHOOK_SECRET env var
 * @returns {object}      parsed JSON event
 */
function verifyKhaltiSignature(rawBody, signatureHeader, secret) {
  if (!rawBody)          throw new Error('Missing raw request body.');
  if (!signatureHeader)  throw new Error('Missing X-Khalti-Signature header.');
  if (!secret)           throw new Error('Khalti webhook secret is not configured.');

  // ── Compute expected HMAC ─────────────────
  const expected    = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'hex');
  const receivedBuf = Buffer.from(signatureHeader.toLowerCase().trim(), 'hex');

  if (
    receivedBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(receivedBuf, expectedBuf)
  ) {
    throw new Error('Khalti webhook signature mismatch. Possible forgery or misconfigured secret.');
  }

  // ── Parse and return ──────────────────────
  try {
    return JSON.parse(rawBody.toString('utf8'));
  } catch {
    throw new Error('Khalti webhook body is not valid JSON.');
  }
}

/**
 * verifyKhaltiSignatureMiddleware
 * Express middleware wrapper around verifyKhaltiSignature.
 * Attaches the parsed payload to req.khaltiEvent on success.
 */
function verifyKhaltiSignatureMiddleware(req, res, next) {
  const signatureHeader = req.headers[KHALTI_SIGNATURE_HEADER];
  const secret          = process.env.KHALTI_WEBHOOK_SECRET;

  try {
    const event       = verifyKhaltiSignature(req.rawBody, signatureHeader, secret);
    req.khaltiEvent   = event;
    logger.info(`webhookVerify: Khalti event verified — event=${event.event} pidx=${event.pidx || 'n/a'}`);
    next();
  } catch (err) {
    logger.warn(`webhookVerify: Khalti signature rejected — ${err.message}`);
    return res.status(400).json({ success: false, message: err.message });
  }
}

/* ═══════════════════════════════════════════════════════════════════
   SECTION 4 — Generic HMAC helper (reusable for future gateways)
═══════════════════════════════════════════════════════════════════ */

/**
 * computeHmacSha256(payload, secret)
 * Returns the lowercase hex HMAC-SHA256 digest.
 * Exported for use in outbound request signing (e.g. Khalti API calls).
 *
 * @param {string|Buffer} payload
 * @param {string}        secret
 * @returns {string}      hex digest
 */
function computeHmacSha256(payload, secret) {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}

module.exports = {
  // Raw body capture
  rawBodyMiddleware,
  stripeWebhookBodyMiddleware,
  khaltiWebhookBodyMiddleware,

  // Stripe
  verifyStripeSignature,
  verifyStripeSignatureMiddleware,

  // Khalti
  verifyKhaltiSignature,
  verifyKhaltiSignatureMiddleware,

  // Utility
  computeHmacSha256,
};