'use strict';

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    email: {
      type      : String,
      required  : [true, 'Email is required'],
      unique    : true,
      lowercase : true,
      trim      : true,
      match     : [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },

    name: {
      type     : String,
      required : [true, 'Name is required'],
      trim     : true,
    },

    role: {
      type     : String,
      enum     : {
        values  : ['client', 'freelancer', 'admin'],
        message : 'Role must be client, freelancer, or admin',
      },
      required : [true, 'Role is required'],
    },

    password: {
      type      : String,
      minlength : [8, 'Password must be at least 8 characters'],
      select    : false,
    },

    googleId: {
      type   : String,
      select : false,
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

    trustScore: {
      type    : Number,
      default : 0,
      min     : [0,   'trustScore cannot be negative'],
      max     : [100, 'trustScore cannot exceed 100'],
    },

    // ── Reviews (client → freelancer ratings) ───────────────────────────────────
    // Cached/recalculated by review.controller.js's recalculateAvgRating(),
    // same pattern as reputationService recalculating trustScore. Only
    // meaningful for freelancer-role users.
    avgRating: {
      type    : Number,
      default : 0,
      min     : [0, 'avgRating cannot be negative'],
      max     : [5, 'avgRating cannot exceed 5'],
    },

    ratingCount: {
      type    : Number,
      default : 0,
      min     : [0, 'ratingCount cannot be negative'],
    },

    isVerified: {
      type    : Boolean,
      default : false,
    },

    accountStatus: {
      type    : String,
      enum    : {
        values  : ['active', 'suspended'],
        message : 'Account status must be active or suspended',
      },
      default : 'active',
    },

    walletBalance: {
      type    : Number,
      default : 0,
      min     : [0, 'Wallet balance cannot be negative'],
    },

    // ── Gamification ───────────────────────────────────────────────────────────
    points: {
      type    : Number,
      default : 0,
      min     : [0, 'Points cannot be negative'],
    },

    level: {
      type    : Number,
      default : 1,
      min     : [1, 'Level cannot be below 1'],
    },

    passwordResetToken   : { type: String, select: false },
    passwordResetExpires : { type: Date,   select: false },

    lastLogin: {
      type : Date,
    },
  },
  {
    timestamps : true,

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

userSchema.index({ googleId : 1 }, { unique: true, sparse: true });
userSchema.index({ accountStatus : 1 });

userSchema.pre('save', async function hashPassword(next) {
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

userSchema.methods.comparePassword = async function comparePassword(candidate) {
  if (!this.password) {
    throw new Error('This account does not use password authentication.');
  }
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.isActive = function isActive() {
  return this.accountStatus === 'active';
};

userSchema.methods.getLevelProgress = function getLevelProgress() {
  const { LEVEL_THRESHOLDS } = require('../config/constants');
  const currentLevel = this.level;
  const currentFloor = LEVEL_THRESHOLDS[currentLevel - 1] ?? 0;
  const nextCeiling  = LEVEL_THRESHOLDS[currentLevel] ?? null;

  if (nextCeiling === null) {
    return { pointsIntoLevel: this.points - currentFloor, pointsForNextLevel: null, percent: 100 };
  }

  const pointsIntoLevel    = this.points - currentFloor;
  const pointsForNextLevel = nextCeiling - currentFloor;
  const percent            = Math.round((pointsIntoLevel / pointsForNextLevel) * 100);

  return { pointsIntoLevel, pointsForNextLevel, percent };
};

const User = mongoose.model('User', userSchema);
module.exports = User;