'use strict';

/**
 * auth.service.js
 * TaskTide – Google OAuth onboarding service
 *
 * Responsibilities
 * ────────────────
 *  - Verify Google ID tokens via google-auth-library
 *  - Extract normalised identity payloads
 *  - Upsert User + role-specific profile documents in MongoDB
 *  - Enforce account status checks on sign-in
 */

const { OAuth2Client }    = require('google-auth-library');
const User                = require('../models/User');
const FreelancerProfile   = require('../models/FreelancerProfile');
const ClientProfile       = require('../models/ClientProfile');
const logger              = require('../config/logger');
const { VALID_ROLES }     = require('../config/constants'); // ✅ shared constants

// ─── Constants ────────────────────────────────────────────────────────────────

// Accepted Google token issuers
const GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];

// One shared OAuth2Client instance — stateless, safe to reuse across requests
const oauthClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * _verifyGoogleToken
 * ──────────────────
 * Verify a raw Google credential string and return the decoded ticket payload.
 *
 * @param  {string} idToken  - response.credential from Google One Tap / OAuth popup
 * @returns {Promise<import('google-auth-library').TokenPayload>}
 * @throws  {Error}  GOOGLE_TOKEN_MISSING | GOOGLE_TOKEN_INVALID
 */
async function _verifyGoogleToken(idToken) {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('GOOGLE_TOKEN_MISSING: idToken must be a non-empty string.');
  }

  let ticket;
  try {
    ticket = await oauthClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
  } catch (verifyErr) {
    logger.warn('Google token verification failed', { error: verifyErr.message });
    throw new Error(`GOOGLE_TOKEN_INVALID: ${verifyErr.message}`);
  }

  const payload = ticket.getPayload();

  // Paranoia check — issuer must be Google
  if (!GOOGLE_ISSUERS.includes(payload.iss)) {
    throw new Error('GOOGLE_TOKEN_INVALID: Unexpected token issuer.');
  }

  // Audience must match our registered Client ID
  if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_TOKEN_INVALID: Token audience mismatch.');
  }

  return payload;
}

/**
 * _extractIdentity
 * ────────────────
 * Map the raw Google payload to a clean, normalised identity object.
 *
 * @param  {import('google-auth-library').TokenPayload} payload
 * @returns {{ googleId, email, emailVerified, name, picture }}
 * @throws  {Error}  GOOGLE_PAYLOAD_INVALID
 */
function _extractIdentity(payload) {
  const { sub, email, email_verified, name, picture } = payload;

  if (!email) {
    throw new Error('GOOGLE_PAYLOAD_INVALID: No email address in token payload.');
  }

  return {
    googleId      : sub,
    email         : email.toLowerCase().trim(),
    emailVerified : Boolean(email_verified),
    name          : name    || email.split('@')[0],
    picture       : picture || null,
  };
}

// ─── Profile bootstrap helpers ────────────────────────────────────────────────

/**
 * _bootstrapFreelancerProfile
 * ───────────────────────────
 * Create a FreelancerProfile stub for a newly-registered freelancer.
 * Idempotent — safe to call multiple times; never double-creates.
 *
 * @param {string} userId    - MongoDB ObjectId string of the parent User
 * @param {object} identity  - Normalised identity from _extractIdentity()
 */
async function _bootstrapFreelancerProfile(userId, identity) {
  const existing = await FreelancerProfile.findOne({ userId });
  if (existing) return existing;

  const profile = await FreelancerProfile.create({
    userId,
    displayName : identity.name,
    avatarUrl   : identity.picture,
    skills      : [],
    hourlyRate  : null,
    portfolio   : [],
    bio         : '',
    // tfidfVector built lazily by the match engine on first job query
    tfidfVector : {},
  });

  logger.info('FreelancerProfile bootstrapped', { userId });
  return profile;
}

/**
 * _bootstrapClientProfile
 * ───────────────────────
 * Create a ClientProfile stub for a newly-registered client.
 * Idempotent — safe to call multiple times; never double-creates.
 *
 * @param {string} userId
 * @param {object} identity
 */
async function _bootstrapClientProfile(userId, identity) {
  const existing = await ClientProfile.findOne({ userId });
  if (existing) return existing;

  const profile = await ClientProfile.create({
    userId,
    companyName    : '',
    displayName    : identity.name,
    avatarUrl      : identity.picture,
    verified       : false,
    projectHistory : [],
  });

  logger.info('ClientProfile bootstrapped', { userId });
  return profile;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * verifyAndExtract
 * ────────────────
 * Validate a Google credential token and return a normalised identity object.
 * Intentionally separated from upsertUser so the controller can validate
 * the role before any DB writes occur.
 *
 * @param  {string} idToken
 * @returns {Promise<{ googleId, email, emailVerified, name, picture }>}
 */
async function verifyAndExtract(idToken) {
  const payload  = await _verifyGoogleToken(idToken);
  const identity = _extractIdentity(payload);
  return identity;
}

/**
 * upsertUser
 * ──────────
 * Find-or-create a User document based on the verified Google identity.
 *
 * Upsert rules
 * ────────────
 * SIGN-IN  (isSignUp = false)
 *   • User must already exist — throws USER_NOT_FOUND if not.
 *   • Throws ACCOUNT_SUSPENDED if the account is suspended.
 *   • Refreshes lastLogin and avatarUrl (Google pic may have changed).
 *   • Does NOT change role or create new profiles.
 *
 * SIGN-UP  (isSignUp = true)
 *   • Throws INVALID_ROLE if role is not a valid VALID_ROLES value.
 *   • If user already exists → treated as sign-in (idempotent, no error).
 *     Sets user._wasExisting = true so the controller shows the correct message.
 *   • Creates User with the supplied role.
 *   • Bootstraps the matching role profile (FreelancerProfile or ClientProfile).
 *
 * @param  {object}  identity  - Output of verifyAndExtract()
 * @param  {boolean} isSignUp  - true when coming from the registration tab
 * @param  {string}  [role]    - 'client' | 'freelancer'  (required when isSignUp)
 * @returns {Promise<import('../models/User')>}  The upserted User document
 */
async function upsertUser(identity, isSignUp, role) {
  const { googleId, email, emailVerified, name, picture } = identity;

  // ── Look up existing user by googleId or email ────────────────────────────
  let user = await User.findOne({
    $or: [{ googleId }, { email }],
  });

  // ── SIGN-IN path ──────────────────────────────────────────────────────────
  if (!isSignUp) {
    if (!user) {
      throw new Error(
        'USER_NOT_FOUND: No account found for this Google identity. Please sign up first.'
      );
    }

    // ✅ NEW: Block suspended accounts from signing in
    if (user.accountStatus === 'suspended') {
      throw new Error(
        'ACCOUNT_SUSPENDED: This account has been suspended. Please contact support.'
      );
    }

    // Refresh mutable fields — ✅ using correct User.js field names
    user.avatarUrl   = picture || user.avatarUrl;
    user.lastLogin   = new Date();        // ✅ fixed: was lastLoginAt
    user.isVerified  = emailVerified;     // ✅ fixed: was emailVerified
    await user.save();

    logger.info('User signed in via Google', { userId: user._id, email });
    return user;
  }

  // ── SIGN-UP path ──────────────────────────────────────────────────────────

  // Validate role before any writes
  if (!role || !VALID_ROLES.includes(role)) {
    throw new Error(
      `INVALID_ROLE: role must be one of [${VALID_ROLES.join(', ')}]. Received: "${role}".`
    );
  }

  // Idempotent: existing user attempting sign-up → treat as sign-in
  if (user) {
    // Block suspended existing user even on re-signup attempt
    if (user.accountStatus === 'suspended') {
      throw new Error(
        'ACCOUNT_SUSPENDED: This account has been suspended. Please contact support.'
      );
    }

    logger.info('Sign-up attempted for existing user — treating as sign-in', {
      userId: user._id,
    });

    user.lastLogin     = new Date();    // ✅ fixed: was lastLoginAt
    user._wasExisting  = true;          // ✅ transient flag — tells controller this was a re-login
    await user.save();
    return user;
  }

  // ── Create new User document ──────────────────────────────────────────────
  // ✅ ALL field names now aligned with User.js schema
  user = await User.create({
    googleId,
    email,
    isVerified   : emailVerified,   // ✅ fixed: was emailVerified
    name,                           // ✅ added: was missing from schema
    avatarUrl    : picture,         // ✅ added: was missing from schema
    role,
    authProvider : 'google',        // ✅ added: was missing from schema
    trustScore   : 0,               // ✅ added: was missing from schema
    lastLogin    : new Date(),      // ✅ fixed: was lastLoginAt
    password     : null,            // ✅ fixed: was passwordHash
  });

  logger.info('New user created via Google OAuth', {
    userId : user._id,
    role,
    email,
  });

  // ── Bootstrap role-specific profile ──────────────────────────────────────
  // Errors are caught and logged but do not fail the sign-up response.
  // The profile can be rebuilt later if creation fails here.
  try {
    if (role === 'freelancer') {
      await _bootstrapFreelancerProfile(user._id.toString(), identity);
    } else {
      await _bootstrapClientProfile(user._id.toString(), identity);
    }
  } catch (profileErr) {
    logger.error('Profile bootstrap failed — user created but profile missing', {
      userId : user._id,
      error  : profileErr.message,
    });
    // Do not rethrow — user record exists; profile can be rebuilt later
  }

  return user;
}

/**
 * findUserById
 * ────────────
 * Thin wrapper used by checkSession to reload a full user document.
 * Returns null (never throws) so the controller can handle the missing-user
 * case cleanly without a try/catch.
 *
 * @param  {string} userId
 * @returns {Promise<import('../models/User') | null>}
 */
async function findUserById(userId) {
  try {
    // ✅ fixed: was '-passwordHash', correct field is '-password'
    return await User.findById(userId).select('-password').lean();
  } catch (err) {
    logger.error('findUserById failed', { userId, error: err.message });
    return null;
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  verifyAndExtract,
  upsertUser,
  findUserById,
};
