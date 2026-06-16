const mongoose = require('mongoose');

const { Schema } = mongoose;

// ─────────────────────────────────────────────
// MilestoneStep Sub-document
// Embedded inside a Proposal to let the freelancer
// propose a breakdown of work and cost up-front.
// ─────────────────────────────────────────────
const MilestoneStepSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, 'Milestone step title is required.'],
      trim: true,
      maxlength: [200, 'Milestone step title cannot exceed 200 characters.'],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Milestone step description cannot exceed 1000 characters.'],
    },

    // Cost allocated to this individual step
    amount: {
      type: Number,
      required: [true, 'Milestone step amount is required.'],
      min: [1, 'Milestone step amount must be at least 1.'],
    },

    // Estimated number of days to complete this step
    estimatedDays: {
      type: Number,
      min: [1, 'Estimated days must be at least 1.'],
    },
  },
  { _id: true } // keep individual ObjectIds so we can reference steps after acceptance
);

// ─────────────────────────────────────────────
// Proposal Schema
// One proposal per freelancer per job.
// ─────────────────────────────────────────────
const ProposalSchema = new Schema(
  {
    // ── Relationships ──────────────────────────
    job: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'A proposal must reference a job.'],
      index: true,
    },

    freelancer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'A proposal must belong to a freelancer.'],
      index: true,
    },

    // ── Bid Details ───────────────────────────
    bidAmount: {
      type: Number,
      required: [true, 'Bid amount is required.'],
      min: [1, 'Bid amount must be at least 1.'],
    },

    // Total delivery time the freelancer is committing to (in days)
    deliveryTimeframe: {
      type: Number,
      required: [true, 'Delivery timeframe is required.'],
      min: [1, 'Delivery timeframe must be at least 1 day.'],
    },

    // ── Cover Letter ──────────────────────────
    coverLetter: {
      type: String,
      required: [true, 'Cover letter is required.'],
      trim: true,
      minlength: [50, 'Cover letter must be at least 50 characters.'],
      maxlength: [3000, 'Cover letter cannot exceed 3000 characters.'],
    },

    // ── Lifecycle Status ──────────────────────
    status: {
      type: String,
      enum: {
        values: ['pending', 'accepted', 'rejected'],
        message: "status must be 'pending', 'accepted', or 'rejected'.",
      },
      default: 'pending',
      index: true,
    },

    // ── Proposed Milestone Breakdown ──────────
    // Freelancer can optionally propose a step-by-step breakdown.
    // Sum of step amounts should equal bidAmount (validated below).
    attachedMilestones: {
      type: [MilestoneStepSchema],
      default: [],
      validate: {
        validator(steps) {
          if (steps.length === 0) return true; // milestones are optional at proposal stage
          if (steps.length > 20) return false;

          // If steps are provided, their total must match bidAmount
          const total = steps.reduce((acc, s) => acc + s.amount, 0);
          // Allow a small floating-point tolerance (±1 unit)
          return Math.abs(total - this.bidAmount) <= 1;
        },
        message:
          'Attached milestone amounts must sum to the bid amount (max 20 steps).',
      },
    },

    // ── AI Matching Score (populated server-side) ──
    matchScore: {
      type: Number,
      min: 0,
      max: 100,
      select: false, // internal field; not exposed to API consumers by default
    },

    // Freelancer's note when withdrawing a pending proposal
    withdrawalReason: {
      type: String,
      trim: true,
      maxlength: [500, 'Withdrawal reason cannot exceed 500 characters.'],
    },

    // Timestamp of status transitions (audit trail)
    acceptedAt: { type: Date },
    rejectedAt: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ─────────────────────────────────────────────
// Indexes
// ─────────────────────────────────────────────

// One proposal per freelancer per job (uniqueness enforced at DB level)
ProposalSchema.index({ job: 1, freelancer: 1 }, { unique: true });

// Dashboard: "all proposals I've submitted"
ProposalSchema.index({ freelancer: 1, status: 1 });

// Client side: "all proposals for this job, sorted by match score"
ProposalSchema.index({ job: 1, status: 1, matchScore: -1 });

// ─────────────────────────────────────────────
// Pre-save hooks
// ─────────────────────────────────────────────

ProposalSchema.pre('save', function stampTransitions(next) {
  if (this.isModified('status')) {
    if (this.status === 'accepted' && !this.acceptedAt) {
      this.acceptedAt = new Date();
    }
    if (this.status === 'rejected' && !this.rejectedAt) {
      this.rejectedAt = new Date();
    }
  }
  next();
});

// ─────────────────────────────────────────────
// Post-save: when a proposal is accepted,
// reject all other pending proposals for the same job.
// (Keeps data consistent without requiring application-layer logic.)
// ─────────────────────────────────────────────
ProposalSchema.post('save', async function rejectSiblings(doc) {
  if (doc.status === 'accepted') {
    await doc.constructor.updateMany(
      {
        job: doc.job,
        _id: { $ne: doc._id },
        status: 'pending',
      },
      { $set: { status: 'rejected', rejectedAt: new Date() } }
    );
  }
});

module.exports = mongoose.model('Proposal', ProposalSchema);