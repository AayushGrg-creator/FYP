'use strict';

/**
 * tokenHelper.js
 * TaskTide – JWT signing, verification, and cookie helpers
 *
 * Responsibilities
 * ────────────────
 *  attachTokenCookie      Sign a JWT and set it as an httpOnly cookie on the response
 *  extractTokenFromRequest  Pull the raw token from cookie or Authorization header
 *  verifyToken            Verify and decode a JWT string
 *  clearTokenCookie       Clear the session cookie (used on logout / expired token)
 *
 * Token strategy
 * ──────────────
 *  - Tokens are signed with HS256 using JWT_SECRET from env
 *  - Expiry is controlled by JWT_EXPIRES_IN (default: '7d')
 *  - The standard JWT "sub" claim holds the userId string
 *  - Browser clients use the httpOnly cookie (XSS-safe)
 *  - API consumers (Postman, future mobile) use Authorization: Bearer <token>
 */

const jwt    = require('jsonwebtoken');
const config = require('../config/env');

// ─── Constants ────────────────────────────────────────────────────────────────

const COOKIE_NAME    = 'tt_session';
const JWT_ALGORITHM  = 'HS256';

// Cookie options shared between set and clear operations
const BASE_COOKIE_OPTIONS = {
  httpOnly : true,                          // not accessible via document.cookie
  sameSite : config.IS_PROD ? 'strict' : 'lax', // CSRF protection in prod
  secure   : config.IS_PROD,                // HTTPS only in production
  path     : '/',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * attachTokenCookie
 * ─────────────────
 * Sign a JWT from the given payload, attach it as an httpOnly cookie on the
 * response, and return the raw token string (for API consumers).
 *
 * @param  {import('express').Response} res
 * @param  {{ sub: string, role: string, email: string }} payload
 * @returns {string}  The signed JWT string
 */
function attachTokenCookie(res, payload) {
  const token = jwt.sign(
    payload,
    config.JWT_SECRET,
    {
      algorithm : JWT_ALGORITHM,
      expiresIn : config.JWT_EXPIRES_IN || '7d',
    }
  );

  // Parse the expiry string into milliseconds for the cookie maxAge
  const maxAgeMs = _parseExpiryToMs(config.JWT_EXPIRES_IN || '7d');

  res.cookie(COOKIE_NAME, token, {
    ...BASE_COOKIE_OPTIONS,
    maxAge: maxAgeMs,
  });

  return token;
}

/**
 * extractTokenFromRequest
 * ───────────────────────
 * Extract the raw JWT string from:
 *   1. The tt_session httpOnly cookie (preferred — browser clients)
 *   2. The Authorization: Bearer <token> header (API consumers)
 *
 * Returns null if neither source provides a token.
 *
 * @param  {import('express').Request} req
 * @returns {string | null}
 */
function extractTokenFromRequest(req) {
  // ── 1. Cookie (preferred) ─────────────────────────────────────────────────
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }

  // ── 2. Authorization header ───────────────────────────────────────────────
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim(); // strip "Bearer " prefix
  }

  return null;
}

/**
 * verifyToken
 * ───────────
 * Verify the JWT signature and expiry. Returns the decoded payload on success.
 * Throws a structured error on failure so the controller can map it to HTTP status.
 *
 * @param  {string} token
 * @returns {{ sub: string, role: string, email: string, iat: number, exp: number }}
 * @throws  {Error}  TOKEN_EXPIRED or TOKEN_INVALID
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, config.JWT_SECRET, { algorithms: [JWT_ALGORITHM] });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new Error(`TOKEN_EXPIRED: ${err.message}`);
    }
    throw new Error(`TOKEN_INVALID: ${err.message}`);
  }
}

/**
 * clearTokenCookie
 * ────────────────
 * Overwrite the tt_session cookie with an expired value to instruct the
 * browser to delete it immediately.
 *
 * @param  {import('express').Response} res
 */
function clearTokenCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    ...BASE_COOKIE_OPTIONS,
  });
}

// ─── Internal ─────────────────────────────────────────────────────────────────

/**
 * _parseExpiryToMs
 * ────────────────
 * Convert a JWT expiry string like '7d', '2h', '30m', '3600s'
 * to milliseconds for use as cookie maxAge.
 *
 * Falls back to 7 days if the format is unrecognised.
 *
 * @param  {string} expiry
 * @returns {number}  milliseconds
 */
function _parseExpiryToMs(expiry) {
  const units = {
    s : 1_000,
    m : 60_000,
    h : 3_600_000,
    d : 86_400_000,
  };

  const match = String(expiry).match(/^(\d+)([smhd])$/);
  if (match) {
    return parseInt(match[1], 10) * (units[match[2]] || units.d);
  }

  // Fallback: 7 days
  return 7 * units.d;
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  attachTokenCookie,
  extractTokenFromRequest,
  verifyToken,
  clearTokenCookie,
};
