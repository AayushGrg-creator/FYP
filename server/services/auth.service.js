'use strict';

/**
 * auth.service.js
 * TaskTide – Authentication service (Google OAuth + email/password)
 *
 * Responsibilities
 * ────────────────
 *  - Verify Google ID tokens via google-auth-library
 *  - Delegate password hashing to User.js pre('save') hook —
 *    NEVER hash here, or passwords get double-hashed (see registerUser)
 *  - Delegate password verification to User.comparePassword()
 *  - Extract normalised identity payloads
 *  - Upsert User + role-specific profile documents in MongoDB
 *  - Enforce account status checks on sign-in
 */

const { OAuth2Client }    = require('google-auth-library');
const User                = require('../models/User');
const FreelancerProfile   = require('../models/FreelancerProfile');
const ClientProfile       = require('../models/ClientProfile');
const logger              = require('../config/logger');
const { VALID_ROLES }     = require('../config/constants');

// ─── Constants ────────────────────────────────────────────────────────────────

const GOOGLE_ISSUERS = ['accounts.google.com', 'https://accounts.google.com'];
const oauthClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─── Internal helpers ─────────────────────────────────────────────────────────

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

  if (!GOOGLE_ISSUERS.includes(payload.iss)) {
    throw new Error('GOOGLE_TOKEN_INVALID: Unexpected token issuer.');
  }
  if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
    throw new Error('GOOGLE_TOKEN_INVALID: Token audience mismatch.');
  }

  return payload;
}

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
    tfidfVector : {},
  });

  logger.info('FreelancerProfile bootstrapped', { userId });
  return profile;
}

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
  }
}

// ─── Public API — Google OAuth ─────────────────────────────────────────────────

async function verifyAndExtract(idToken) {
  const payload  = await _verifyGoogleToken(idToken);
  const identity = _extractIdentity(payload);
  return identity;
}

async function upsertUser(identity, isSignUp, role) {
  const { googleId, email, emailVerified, name, picture } = identity;

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

    if (user.accountStatus === 'suspended') {
      throw new Error(
        'ACCOUNT_SUSPENDED: This account has been suspended. Please contact support.'
      );
    }

    user.avatarUrl   = picture || user.avatarUrl;
    user.lastLogin   = new Date();
    user.isVerified  = emailVerified;
    await user.save();

    logger.info('User signed in via Google', { userId: user._id, email });
    return user;
  }

  // ── SIGN-UP path ──────────────────────────────────────────────────────────

  if (!role || !VALID_ROLES.includes(role)) {
    throw new Error(
      `INVALID_ROLE: role must be one of [${VALID_ROLES.join(', ')}]. Received: "${role}".`
    );
  }

  if (user) {
    if (user.accountStatus === 'suspended') {
      throw new Error(
        'ACCOUNT_SUSPENDED: This account has been suspended. Please contact support.'
      );
    }

    logger.info('Sign-up attempted for existing user — treating as sign-in', {
      userId: user._id,
    });

    user.lastLogin     = new Date();
    user._wasExisting  = true;
    await user.save();
    return user;
  }

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

  await _bootstrapProfileForRole(role, user._id.toString(), { name, picture });

  return user;
}

// ─── Public API — Email/password ───────────────────────────────────────────────

/**
 * registerUser
 * ────────────
 * Create a new User document from name/email/password/role.
 *
 * ⚠️ IMPORTANT: password is passed through PLAINTEXT to User.create().
 * User.js's pre('save') hook hashes it automatically.
 * Do NOT hash it here — that would double-hash it and permanently
 * break every future login for this user.
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

  // ✅ FIXED: removed manual bcrypt.hash() call here — was causing double-hashing
  // against the pre('save') hook in User.js, which made every password login fail.
  const user = await User.create({
    email        : normalizedEmail,
    password,    // plaintext — hashed once by the model's pre-save hook
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

  await _bootstrapProfileForRole(role, user._id.toString(), { name: user.name, picture: null });

  return user;
}

/**
 * authenticateUser
 * ────────────────
 * Verify email/password credentials and return the matching User document.
 * Verification delegated to User.comparePassword() — the model owns its
 * own hash format, so the service doesn't reimplement bcrypt logic here.
 */
async function authenticateUser({ email, password }) {
  const normalizedEmail = email.toLowerCase().trim();

  // password has select: false in the schema — explicitly re-include it
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

  // ✅ FIXED: uses the model's own comparePassword() instead of manual bcrypt.compare()
  // — keeps hashing/verification logic in one place (User.js) instead of two.
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error('INVALID_CREDENTIALS: No account found for this email/password combination.');
  }

  user.lastLogin = new Date();
  await user.save();

  logger.info('User authenticated via email/password', { userId: user._id, email: normalizedEmail });
  return user;
}

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