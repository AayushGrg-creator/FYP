/**
 * TaskTide Idempotency Service
 * Path: server/src/utils/idempotency.js
 * * Prevents duplicate processing of financial and critical action requests.
 */

const crypto = require('crypto');

/**
 * Generate a deterministic idempotency key for a given set of inputs.
 * Ideal for 'client-triggered' actions (e.g., submitting a proposal).
 */
export const generateIdempotencyKey = (...parts) => {
  return crypto
    .createHash('sha256')
    .update(parts.filter(Boolean).join(':')) // Added filter to handle null/undefined inputs
    .digest('hex')
    .substring(0, 32);
};

/**
 * Generate a random idempotency key for server-side unique actions.
 */
export const randomIdempotencyKey = () => {
  return crypto.randomUUID();
};