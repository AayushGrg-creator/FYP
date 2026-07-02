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
 *
 * Password hashing
 * ─────────────────
 *  Hashing happens ONCE, here, via the pre('save') hook below.
 *  auth.service.js must pass the PLAINTEXT password to User.create()/save() —
 *  never pre-hash it there, or passwords get double-hashed and login breaks.
 */

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs'); // ✅ FIXED: was 'bcrypt' (native module, not installed)
                                       //    bcryptjs is pure-JS, same API, already used elsewhere

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

    avatarUrl: {
      type    : String,
      default : null,
    },

    authProvider: {
      type    : String,
      enum    : {
        values  : ['local', 'google'],
        message : 'authProvider must be local or google',
      },
      default : 'local',
    },

    // ── Trust & verification ──────────────────────────────────────────────────
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

userSchema.index({ googleId : 1 }, { unique: true, sparse: true });
userSchema.index({ accountStatus : 1 });

// ─── Pre-save hook: hash password (SINGLE SOURCE OF TRUTH for hashing) ────────

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

userSchema.methods.comparePassword = async function comparePassword(candidate) {
  if (!this.password) {
    throw new Error('This account does not use password authentication.');
  }
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.isActive = function isActive() {
  return this.accountStatus === 'active';
};

// ─── Model ────────────────────────────────────────────────────────────────────

const User = mongoose.model('User', userSchema);
module.exports = User;