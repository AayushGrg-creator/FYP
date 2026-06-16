'use strict';

/**
 * User.js
 * TaskTide – Core user schema
 *
 * This schema covers both local (password) and Google OAuth users.
 * Fields that are Google-only (googleId, avatarUrl, authProvider) are
 * optional so local users can be added in future without breaking changes.
 *
 * Security defaults
 * ─────────────────
 *  - password      → select: false  (never returned in queries)
 *  - googleId      → select: false  (internal OAuth identifier)
 *  - reset tokens  → select: false
 *  - toJSON / toObject transforms strip all sensitive fields as a second layer
 *
 * Indexes
 * ───────
 *  - email      → unique (auto-indexed by unique: true — no manual index needed)
 *  - googleId   → sparse unique (null for local users, unique for OAuth users)
 *  - accountStatus → for admin queries filtering active/suspended users
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcrypt');

const userSchema = new mongoose.Schema(
  {
    // ── Identity ──────────────────────────────────────────────────────────────
    email: {
      type      : String,
      required  : [true, 'Email is required'],
      unique    : true,           // auto-creates index — no manual index needed
      lowercase : true,
      trim      : true,
      match     : [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },

    // ✅ ADDED — required by auth.service.js; was silently dropped before
    name: {
      type     : String,
      required : [true, 'Name is required'],
      trim     : true,
    },

    // ── Role ──────────────────────────────────────────────────────────────────
    role: {
      type     : String,
      enum     : {
        values  : ['client', 'freelancer', 'admin'],
        message : 'Role must be client, freelancer, or admin',
      },
      required : [true, 'Role is required'],
    },

    // ── Local auth ────────────────────────────────────────────────────────────
    // Optional — Google OAuth users have no local password (stored as null)
    password: {
      type      : String,
      minlength : [8, 'Password must be at least 8 characters'],
      select    : false,   // never returned in queries by default
    },

    // ── Google OAuth ──────────────────────────────────────────────────────────
    googleId: {
      type   : String,
      select : false,      // never expose internal OAuth identifier in responses
    },

    // ✅ ADDED — required by auth.service.js and returned in all API responses
    avatarUrl: {
      type    : String,
      default : null,
    },

    // ✅ ADDED — distinguishes OAuth vs local users for conditional logic
    authProvider: {
      type    : String,
      enum    : {
        values  : ['local', 'google'],
        message : 'authProvider must be local or google',
      },
      default : 'local',
    },

    // ── Trust & verification ──────────────────────────────────────────────────
    // ✅ ADDED — required by auth.service.js and returned in API responses
    trustScore: {
      type    : Number,
      default : 0,
      min     : [0,   'trustScore cannot be negative'],
      max     : [100, 'trustScore cannot exceed 100'],
    },

    isVerified: {
      type    : Boolean,
      default : false,
    },

    // ── Account status ────────────────────────────────────────────────────────
    accountStatus: {
      type    : String,
      enum    : {
        values  : ['active', 'suspended'],
        message : 'Account status must be active or suspended',
      },
      default : 'active',
    },

    // ── Password reset ────────────────────────────────────────────────────────
    passwordResetToken   : { type: String, select: false },
    passwordResetExpires : { type: Date,   select: false },

    // ── Activity ──────────────────────────────────────────────────────────────
    lastLogin: {
      type : Date,
    },
  },
  {
    timestamps : true,   // createdAt, updatedAt

    // ── Prevent credentials from leaking over API responses ──────────────────
    // Both toJSON and toObject are covered so lean() and non-lean() are safe.
    toJSON: {
      transform(_doc, ret) {
        delete ret.password;
        delete ret.googleId;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.__v;
        return ret;
      },
    },

    toObject: {
      transform(_doc, ret) {
        delete ret.password;
        delete ret.googleId;
        delete ret.passwordResetToken;
        delete ret.passwordResetExpires;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// ✅ FIXED: removed duplicate userSchema.index({ email: 1 })
//    The unique:true on the email field already creates this index automatically.
//    Having both caused a duplicate index warning in Mongoose.

// ✅ ADDED: sparse unique index on googleId
//    sparse: true means null values (local users) are excluded from the index,
//    preventing a "duplicate null" unique violation for local auth users.
userSchema.index({ googleId : 1 }, { unique: true, sparse: true });

// Useful for admin dashboards filtering by account status
userSchema.index({ accountStatus : 1 });

// ─── Pre-save hook: hash password ────────────────────────────────────────────

/**
 * Only runs when the password field has been explicitly set or modified.
 * Skipped entirely for Google OAuth users (password === null/undefined).
 */
userSchema.pre('save', async function hashPassword(next) {
  // Skip if no password field (Google OAuth) or password not modified
  if (!this.password || !this.isModified('password')) {
    return next();
  }

  try {
    const salt    = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    return next();
  } catch (err) {
    return next(err);
  }
});

// ─── Instance methods ─────────────────────────────────────────────────────────

/**
 * comparePassword
 * ───────────────
 * Compare a plaintext candidate password against the stored bcrypt hash.
 * Throws if the account has no local password (OAuth-only users).
 *
 * @param  {string} candidate
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function comparePassword(candidate) {
  if (!this.password) {
    throw new Error('This account does not use password authentication.');
  }
  return bcrypt.compare(candidate, this.password);
};

/**
 * isActive
 * ────────
 * Returns true if the account is in 'active' status.
 * Used as a guard in middleware and service layer checks.
 *
 * @returns {boolean}
 */
userSchema.methods.isActive = function isActive() {
  return this.accountStatus === 'active';
};

// ─── Model ────────────────────────────────────────────────────────────────────

const User = mongoose.model('User', userSchema);
module.exports = User;