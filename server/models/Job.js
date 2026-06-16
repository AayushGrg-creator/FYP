const mongoose = require('mongoose');

const { Schema } = mongoose;

// ─────────────────────────────────────────────
// Job Schema
// Represents a job posting created by a client.
// ─────────────────────────────────────────────
const JobSchema = new Schema(
  {
    // ── Relationships ──────────────────────────
    client: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'A job must belong to a client.'],
      index: true,
    },

    // ── Core Fields ───────────────────────────
    title: {
      type: String,
      required: [true, 'Job title is required.'],
      trim: true,
      minlength: [5, 'Title must be at least 5 characters.'],
      maxlength: [150, 'Title cannot exceed 150 characters.'],
    },

    description: {
      type: String,
      required: [true, 'Job description is required.'],
      trim: true,
      minlength: [20, 'Description must be at least 20 characters.'],
      maxlength: [5000, 'Description cannot exceed 5000 characters.'],
    },

    // ── Budget ────────────────────────────────
    budgetType: {
      type: String,
      enum: {
        values: ['fixed', 'hourly'],
        message: "budgetType must be 'fixed' or 'hourly'.",
      },
      required: [true, 'Budget type is required.'],
    },

    budgetAmount: {
      type: Number,
      required: [true, 'Budget amount is required.'],
      min: [1, 'Budget amount must be at least 1.'],
    },

    // ── Skills ────────────────────────────────
    skillsRequired: {
      type: [
        {
          type: String,
          trim: true,
          lowercase: true,
        },
      ],
      validate: {
        validator: (arr) => arr.length > 0 && arr.length <= 15,
        message: 'Provide between 1 and 15 required skills.',
      },
      index: true, // compound with trustScore on FreelancerProfile for fast matching
    },

    // ── Category ──────────────────────────────
    category: {
      type: String,
      required: [true, 'Job category is required.'],
      trim: true,
      enum: [
        'web_development',
        'mobile_development',
        'graphic_design',
        'content_writing',
        'digital_marketing',
        'video_editing',
        'data_science',
        'ui_ux_design',
        'seo',
        'other',
      ],
      index: true,
    },

    // ── Lifecycle Status ──────────────────────
    status: {
      type: String,
      enum: {
        values: ['open', 'in_progress', 'completed', 'disputed'],
        message: "status must be 'open', 'in_progress', 'completed', or 'disputed'.",
      },
      default: 'open',
      index: true,
    },

    // ── Optional Extras ───────────────────────
    deliveryTimeframe: {
      // suggested days to complete the project
      type: Number,
      min: [1, 'Delivery timeframe must be at least 1 day.'],
    },

    // TF-IDF vector cache (rebuilt by rebuildTfidfIndex.js script)
    tfidfVector: {
      type: Schema.Types.Mixed,
      select: false, // never accidentally leak this in normal queries
    },

    // Soft-delete / archive flag
    isArchived: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─────────────────────────────────────────────
// Indexes
// ─────────────────────────────────────────────

// Full-text search on title + description (used by the matching engine)
JobSchema.index({ title: 'text', description: 'text' });

// Compound index for dashboard queries: "all open jobs by this client"
JobSchema.index({ client: 1, status: 1 });

// Compound index for browse/filter: category + status + budget
JobSchema.index({ category: 1, status: 1, budgetAmount: 1 });

// ─────────────────────────────────────────────
// Virtuals
// ─────────────────────────────────────────────

// Lazily populated proposals count (populated via .populate or aggregation)
JobSchema.virtual('proposals', {
  ref: 'Proposal',
  localField: '_id',
  foreignField: 'job',
  count: true,
});

// ─────────────────────────────────────────────
// Pre-save hook – normalise skill strings
// ─────────────────────────────────────────────
JobSchema.pre('save', function normaliseSkills(next) {
  if (this.isModified('skillsRequired')) {
    // Deduplicate and strip empty strings
    this.skillsRequired = [...new Set(this.skillsRequired.filter(Boolean))];
  }
  next();
});

module.exports = mongoose.model('Job', JobSchema);