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

// ── Pre-save: recalculate profile strength ────────────────────────────────────
freelancerProfileSchema.pre('save', function calcStrength(next) {
  let score = 0;
  if (this.bio && this.bio.trim().length > 0)            score += 20;
  if (this.hourlyRate > 0)                               score += 20;
  if (Array.isArray(this.skills) && this.skills.length)  score += 20;
  if (Array.isArray(this.portfolio) && this.portfolio.length) score += 20;
  if (this.avatarUrl && this.avatarUrl.trim().length)    score += 20;
  this.profileStrength = score;
  next();
});

const FreelancerProfile = mongoose.model('FreelancerProfile', freelancerProfileSchema);
module.exports = FreelancerProfile;

