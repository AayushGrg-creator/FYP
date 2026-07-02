'use strict';

/**
 * constants.js
 * TaskTide – Shared application-wide constants
 *
 * Centralising these values prevents duplication across controller,
 * service, and route files and ensures a single source of truth.
 *
 * All exported objects and arrays are frozen (Object.freeze / Object.isFrozen)
 * to prevent accidental mutation by consuming modules.
 */

// ─── Roles ────────────────────────────────────────────────────────────────────

/**
 * Valid user roles accepted during registration.
 * Use VALID_ROLES_SET for O(1) membership checks in hot paths.
 */
const VALID_ROLES = Object.freeze(['client', 'freelancer']);

/**
 * Set form of VALID_ROLES for O(1) lookup.
 *
 * @example
 * if (!VALID_ROLES_SET.has(role)) throw new Error('INVALID_ROLE: ...');
 */
const VALID_ROLES_SET = Object.freeze(new Set(VALID_ROLES));

// ─── HTTP status defaults ─────────────────────────────────────────────────────

/**
 * Fallback HTTP status when an error code is not found in ERROR_STATUS_MAP.
 * auth.controller.js _resolveStatus() should use this as its default:
 *
 *   return ERROR_STATUS_MAP[code] ?? DEFAULT_HTTP_STATUS;
 *
 * ✅ ADDED: prevents _resolveStatus() returning undefined for unmapped codes,
 *    which would cause Express to send a malformed response.
 */
const DEFAULT_HTTP_STATUS = 500;

// ─── Error-code → HTTP status map ────────────────────────────────────────────
/**
 * Maps structured error codes (prefixed on Error.message) to HTTP status codes.
 * Used by auth.controller.js _resolveStatus().
 *
 * Convention: error messages are formatted as "ERROR_CODE: human readable detail"
 * so _resolveStatus() can split on ':' and look up the code here.
 *
 * ✅ ADDED missing codes that auth / token flows commonly emit so that
 *    _resolveStatus() never returns undefined for a real error path.
 */
const ERROR_STATUS_MAP = Object.freeze({
  // ── Google OAuth ────────────────────────────────────────────────────────────
  GOOGLE_TOKEN_MISSING   : 400,
  GOOGLE_TOKEN_INVALID   : 401,
  GOOGLE_PAYLOAD_INVALID : 400,

  // ── Registration / role ─────────────────────────────────────────────────────
  INVALID_ROLE           : 400,
  // ✅ ADDED: duplicate email on registration
  EMAIL_TAKEN            : 409,

  // ── Lookup ──────────────────────────────────────────────────────────────────
  USER_NOT_FOUND         : 404,

  // ── Account state ───────────────────────────────────────────────────────────
  ACCOUNT_SUSPENDED      : 403,
  // ✅ ADDED: generic authorisation refusal (role-based guard failures etc.)
  FORBIDDEN              : 403,

  // ── Access token ────────────────────────────────────────────────────────────
  TOKEN_MISSING          : 401,
  TOKEN_EXPIRED          : 401,
  TOKEN_INVALID          : 401,

  // ── Refresh token ───────────────────────────────────────────────────────────
  // ✅ ADDED: refresh-token lifecycle codes
  REFRESH_TOKEN_MISSING  : 401,
  REFRESH_TOKEN_EXPIRED  : 401,
  REFRESH_TOKEN_INVALID  : 401,
  REFRESH_TOKEN_REUSED   : 401,   // rotation / replay-attack detection

  // ── Credentials ─────────────────────────────────────────────────────────────
  // ✅ ADDED: email+password login failure
  INVALID_CREDENTIALS    : 401,
  // ✅ ADDED: password login attempted on a Google-only account
  GOOGLE_ONLY_ACCOUNT    : 400,

  // ── Rate limiting ────────────────────────────────────────────────────────────
  // ✅ ADDED: express-rate-limit or custom throttle middleware
  RATE_LIMITED           : 429,

  // ── Server ──────────────────────────────────────────────────────────────────
  // ✅ ADDED: explicit internal-error code (maps to DEFAULT_HTTP_STATUS)
  INTERNAL_ERROR         : 500,
});

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  VALID_ROLES,
  VALID_ROLES_SET,
  ERROR_STATUS_MAP,
  DEFAULT_HTTP_STATUS,
};