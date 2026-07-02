'use strict';

/**
 * auth.service.js
 * TaskTide – Authentication service (Google OAuth + email/password)
 *
 * Responsibilities
 * ────────────────
 *  - Verify Google ID tokens via google-auth-library
 *  - Delegate password hashing/verification to the User model
 *    (pre-save hook hashes; instance method comparePassword verifies)
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
 * @param {object} identity  - Normalised identity ({ name, picture, ... })
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

/**
 * _bootstrapProfileForRole
 * ─────────────────────────
 * Shared dispatcher used by both Google sign-up and email/password
 * registration so the two flows can't drift apart.
 *
 * @param {string} role   - 'client' | 'freelancer'
 * @param {string} userId
 * @param {object} identity - anything with { name, picture }
 */
async function _bootstrapProfileForRole(role, userId, identity) {
  try {
    if (role === 'freelancer') {
      await _bootstrapFreelancerProfile(userId, identity);
    } else {
      await _bootstrapClientProfile(userId, identity);
    }
  } catch (profileErr) {
    logger.error('Profile bootstrap failed — user created but profile missing', {
      userId,
      error: profileErr.message,
    });
    // Do not rethrow — user record exists; profile can be rebuilt later
  }
}

// ─── Public API — Google OAuth ─────────────────────────────────────────────────

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

    // Block suspended accounts from signing in
    if (user.accountStatus === 'suspended') {
      throw new Error(
        'ACCOUNT_SUSPENDED: This account has been suspended. Please contact support.'
      );
    }

    // Refresh mutable fields
    user.avatarUrl   = picture || user.avatarUrl;
    user.lastLogin   = new Date();
    user.isVerified  = emailVerified;
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

    user.lastLogin     = new Date();
    user._wasExisting  = true;  // transient flag — tells controller this was a re-login
    await user.save();
    return user;
  }

  // ── Create new User document ──────────────────────────────────────────────
  user = await User.create({
    googleId,
    email,
    isVerified   : emailVerified,
    name,
    avatarUrl    : picture,
    role,
    authProvider : 'google',
    trustScore   : 0,
    lastLogin    : new Date(),
    password     : null,
  });

  logger.info('New user created via Google OAuth', {
    userId : user._id,
    role,
    email,
  });

  // ── Bootstrap role-specific profile ──────────────────────────────────────
  // Errors are caught and logged but do not fail the sign-up response.
  await _bootstrapProfileForRole(role, user._id.toString(), { name, picture });

  return user;
}

// ─── Public API — Email/password ───────────────────────────────────────────────

/**
 * registerUser
 * ────────────
 * Create a new User document from name/email/password/role.
 *
 * Rules
 * ─────
 *  • Email is unique across BOTH auth providers — a Google account and a
 *    local account can't share an email. Throws EMAIL_ALREADY_EXISTS if taken.
 *  • Password is passed through PLAINTEXT to User.create() — the model's
 *    pre('save') hook hashes it automatically. Do NOT hash it here too;
 *    that would double-hash it and break every future login.
 *  • Bootstraps the matching role profile, same as the Google sign-up path.
 *
 * @param  {{ name: string, email: string, password: string, role: string }} data
 * @returns {Promise<import('../models/User')>}  The newly-created User document
 * @throws  {Error}  EMAIL_ALREADY_EXISTS | INVALID_ROLE
 */
async function registerUser({ name, email, password, role }) {
  const normalizedEmail = email.toLowerCase().trim();

  if (!role || !VALID_ROLES.includes(role)) {
    throw new Error(
      `INVALID_ROLE: role must be one of [${VALID_ROLES.join(', ')}]. Received: "${role}".`
    );
  }

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    throw new Error('EMAIL_TAKEN: An account with this email already exists.');
  }

  // NOTE: password is intentionally plaintext here — User.js's pre('save')
  // hook hashes it via bcrypt before it ever hits the database.
  const user = await User.create({
    email        : normalizedEmail,
    password,
    name         : name.trim(),
    avatarUrl    : null,
    role,
    authProvider : 'local',
    isVerified   : false,
    trustScore   : 0,
    lastLogin    : new Date(),
  });

  logger.info('New user created via email/password', {
    userId : user._id,
    role,
    email  : normalizedEmail,
  });

  // Bootstrap role-specific profile — mirrors the Google sign-up path
  await _bootstrapProfileForRole(role, user._id.toString(), { name: user.name, picture: null });

  return user;
}

/**
 * authenticateUser
 * ────────────────
 * Verify email/password credentials and return the matching User document.
 *
 * Rules
 * ─────
 *  • Deliberately vague on failure (INVALID_CREDENTIALS) — never reveals
 *    whether the email or the password was wrong.
 *  • Accounts created via Google have password = null; attempting a
 *    password login on one throws GOOGLE_ONLY_ACCOUNT so the frontend can
 *    point the user to the Google button instead.
 *  • Blocks suspended accounts, same as the Google sign-in path.
 *  • Verification is delegated to User.comparePassword() — the model
 *    already knows its own hash format, so the service shouldn't re-implement it.
 *
 * @param  {{ email: string, password: string }} credentials
 * @returns {Promise<import('../models/User')>}  The authenticated User document
 * @throws  {Error}  INVALID_CREDENTIALS | GOOGLE_ONLY_ACCOUNT | ACCOUNT_SUSPENDED
 */
async function authenticateUser({ email, password }) {
  const normalizedEmail = email.toLowerCase().trim();

  // password has select: false in the schema — explicitly re-include it
  // since comparePassword() needs the real hash to compare against.
  const user = await User.findOne({ email: normalizedEmail }).select('+password');

  if (!user) {
    throw new Error('INVALID_CREDENTIALS: No account found for this email/password combination.');
  }

  if (!user.password) {
    throw new Error('GOOGLE_ONLY_ACCOUNT: This account was created via Google sign-in and has no password set.');
  }

  if (user.accountStatus === 'suspended') {
    throw new Error('ACCOUNT_SUSPENDED: This account has been suspended. Please contact support.');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error('INVALID_CREDENTIALS: No account found for this email/password combination.');
  }

  user.lastLogin = new Date();
  await user.save();

  logger.info('User authenticated via email/password', { userId: user._id, email: normalizedEmail });
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
  registerUser,
  authenticateUser,
  findUserById,
};