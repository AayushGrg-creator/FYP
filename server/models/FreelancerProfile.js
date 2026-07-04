const mongoose = require('mongoose');

// ── Embedded sub-schema for portfolio items ───────────────────────────────────
const portfolioItemSchema = new mongoose.Schema(
  {
    title:       { type: String, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500 },
    url:         { type: String, trim: true },
    techStack:   [{ type: String, trim: true }],
  },
  { _id: false }
);

// ── Main schema ───────────────────────────────────────────────────────────────
const freelancerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'User reference is required'],
      unique:   true,
      index:    true,
    },

    bio: {
      type:      String,
      trim:      true,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      default:   '',
    },

    hourlyRate: {
      type:    Number,
      min:     [0, 'Hourly rate cannot be negative'],
      default: 0,
    },

    // Multikey index applied below for fast skill-based queries
    skills: {
      type:      [String],
      validate:  {
        validator(arr) {
          if (!Array.isArray(arr)) return false;
          return arr.every(
            (s) => typeof s === 'string' && s.trim().length > 0 && s.length <= 60
          );
        },
        message: 'Each skill must be a non-empty string of up to 60 characters',
      },
      default: [],
    },

    reputationPoints: {
      type:    Number,
      default: 0,
      min:     [0, 'Reputation points cannot be negative'],
    },

    trustScore: {
      type:    Number,
      default: 100,
      min:     [0,   'Trust score cannot be below 0'],
      max:     [100, 'Trust score cannot exceed 100'],
    },

    // References to Badge documents
    activeBadges: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref:  'Badge',
      },
    ],

    completedJobsCounter: {
      type:    Number,
      default: 0,
      min:     [0, 'Completed jobs counter cannot be negative'],
    },

    // TF-IDF vector stored as a plain object for the matching engine
    tfidfVector: {
      type:    mongoose.Schema.Types.Mixed,
      select:  false,
      default: {},
    },

    portfolio:      { type: [portfolioItemSchema], default: [] },
    profileStrength: { type: Number, default: 0, min: 0, max: 100 },

    avatarUrl:  { type: String, trim: true, default: '' },
    location:   { type: String, trim: true, default: '' },
  },
  {
    timestamps: true,
    toJSON:  { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
freelancerProfileSchema.index({ skills: 1 });           // multikey
freelancerProfileSchema.index({ trustScore: -1 });
freelancerProfileSchema.index({ reputationPoints: -1 });

// ── Virtual: display name helper (populated via User) ─────────────────────────
// Requires .populate('userId') on the query
freelancerProfileSchema.virtual('displayName').get(function getDisplayName() {
  return this.userId && this.userId.email
    ? this.userId.email.split('@')[0]
    : 'Freelancer';
});

// ── Shared scoring logic (used by both hooks below) ────────────────────────────
//
// ✅ FIXED: weights now MATCH client/src/components/profile/TrustScoreBadge.jsx's
// PROFILE_FIELDS exactly (avatar 15, bio 15, skills 20, hourlyRate 10,
// portfolio 30, location 10 = 100 total). Previously this used a flat 20%
// per field across 5 fields, while the frontend used an 8-field weighted
// scheme including 'phone'/'social' fields that don't exist in this schema
// — the two disagreed (e.g. backend said 80%, frontend said 85% for the
// same profile). Both are now a single source of truth.
function computeProfileStrength(doc) {
  let score = 0;
  if (doc.avatarUrl && doc.avatarUrl.trim().length)            score += 15;
  if (doc.bio && doc.bio.trim().length > 0)                    score += 15;
  if (Array.isArray(doc.skills) && doc.skills.length)          score += 20;
  if (doc.hourlyRate > 0)                                      score += 10;
  if (Array.isArray(doc.portfolio) && doc.portfolio.length)    score += 30;
  if (doc.location && doc.location.trim().length)              score += 10;
  return score;
}

// ── Pre-save: recalculate profile strength ────────────────────────────────────
// Fires when a document is created/modified via .save() (e.g. `new FreelancerProfile().save()`)
freelancerProfileSchema.pre('save', function calcStrength(next) {
  this.profileStrength = computeProfileStrength(this);
  next();
});

// ── Pre-findOneAndUpdate: recalculate profile strength ─────────────────────────
// .pre('save') does NOT fire for findOneAndUpdate/upsert — Mongoose treats them
// as separate query middleware. Since profile.controller.js uses
// findOneAndUpdate({ upsert: true }) for all profile edits (not .save()),
// this hook is required or profileStrength silently never updates after the
// initial document creation.
freelancerProfileSchema.pre('findOneAndUpdate', async function calcStrengthOnUpdate(next) {
  const update = this.getUpdate() || {};
  const incoming = update.$set || update;

  // Merge incoming changes on top of the existing document (if it exists) so
  // fields not part of this particular update are still counted correctly.
  const existing = await this.model.findOne(this.getQuery()).lean();
  const merged = { ...(existing || {}), ...incoming };

  const profileStrength = computeProfileStrength(merged);

  this.setUpdate({
    ...update,
    $set: { ...incoming, profileStrength },
  });

  next();
});

const FreelancerProfile = mongoose.model('FreelancerProfile', freelancerProfileSchema);
module.exports = FreelancerProfile;
