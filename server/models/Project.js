const mongoose = require('mongoose');

const { Schema } = mongoose;

// ─────────────────────────────────────────────
// Project Schema
// Created when a client accepts a proposal.
// Acts as the running contract container linking
// client ↔ freelancer ↔ job and owns the live
// escrow status, progress state, and the shared
// conversation (message room).
// ─────────────────────────────────────────────
const ProjectFileSchema = new Schema(
  {
    url:          { type: String, required: true },
    publicId:     { type: String, required: true }, // Cloudinary public_id, needed to delete
    originalName: { type: String, required: true, trim: true },
    fileType:     { type: String, trim: true },      // MIME type
    size:         { type: Number },                  // bytes
    uploadedBy:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedAt:   { type: Date, default: Date.now },
  },
  { _id: true }
);

const ProjectSchema = new Schema(
  {
    // ── Core Relationships ─────────────────────
    client: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Project must have a client.'],
      index: true,
    },

    freelancer: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Project must have a freelancer.'],
      index: true,
    },

    // The original job posting that spawned this project
    job: {
      type: Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Project must reference a job.'],
      index: true,
    },

    // The accepted proposal (one-to-one with Project)
    proposal: {
      type: Schema.Types.ObjectId,
      ref: 'Proposal',
      required: [true, 'Project must reference the accepted proposal.'],
      unique: true, // one project per accepted proposal
    },

    // ── Financial Summary ─────────────────────
    // Agreed total from the accepted bid (denormalised for quick access)
    agreedAmount: {
      type: Number,
      required: [true, 'Agreed amount is required.'],
      min: [1, 'Agreed amount must be at least 1.'],
    },

    // Running total of funds released to the freelancer so far
    amountReleased: {
      type: Number,
      default: 0,
      min: [0, 'Released amount cannot be negative.'],
    },

    // ── Overall Escrow / Contract Status ───────
    escrowStatus: {
      type: String,
      enum: {
        values: ['created', 'funded', 'active', 'completed', 'disputed', 'refunded'],
        message:
          "escrowStatus must be 'created', 'funded', 'active', 'completed', 'disputed', or 'refunded'.",
      },
      default: 'created',
      index: true,
    },

    // ── Progress / Lifecycle State ─────────────
    status: {
      type: String,
      enum: {
        values: [
          'awaiting_funding',  // client hasn't funded escrow yet
          'in_progress',       // active work happening
          'under_review',      // freelancer submitted final milestone
          'completed',         // all milestones released, project closed
          'disputed',          // one or more milestones under admin review
          'cancelled',         // cancelled before any work started
        ],
        message: 'Invalid project status.',
      },
      default: 'awaiting_funding',
      index: true,
    },

    // Overall percentage of milestones completed (0–100)
    progressPercent: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    // ── Communication ─────────────────────────
    // Unique room identifier used by Socket.io and the Message model.
    // Auto-generated as `project-<_id>` on first save.
    conversationRoomId: {
      type: String,
      unique: true,
      index: true,
    },

    // ── Files ─────────────────────────────────
    // Uploaded project deliverables/assets, stored on Cloudinary.
    files: {
      type: [ProjectFileSchema],
      default: [],
    },

    // ── Deadline ──────────────────────────────
    // Derived from proposal.deliveryTimeframe; stored for quick queries.
    deadline: {
      type: Date,
      index: true,
    },

    // ── Ratings (set after completion) ────────
    clientRating: {
      score: { type: Number, min: 1, max: 5 },
      comment: { type: String, trim: true, maxlength: 1000 },
      submittedAt: { type: Date },
    },

    freelancerRating: {
      score: { type: Number, min: 1, max: 5 },
      comment: { type: String, trim: true, maxlength: 1000 },
      submittedAt: { type: Date },
    },

    // ── Dispute Reference ─────────────────────
    dispute: {
      type: Schema.Types.ObjectId,
      ref: 'Dispute',
      default: null,
    },

    // ── Completion / Cancellation Timestamps ──
    completedAt: { type: Date },
    cancelledAt: { type: Date },

    // Optional note from either party on cancellation
    cancellationReason: {
      type: String,
      trim: true,
      maxlength: 500,
    },
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

// Dashboard queries: "all active projects I'm involved in"
ProjectSchema.index({ client: 1, status: 1 });
ProjectSchema.index({ freelancer: 1, status: 1 });

// Admin overview: disputed projects
ProjectSchema.index({ status: 1, escrowStatus: 1 });

// Deadline reminders cron (sendPaymentReminders.js)
ProjectSchema.index({ deadline: 1, status: 1 });

// ─────────────────────────────────────────────
// Virtuals
// ─────────────────────────────────────────────

// Lazily populated milestone list
ProjectSchema.virtual('milestones', {
  ref: 'Milestone',
  localField: '_id',
  foreignField: 'project',
});

// Messages in the shared workspace
ProjectSchema.virtual('messages', {
  ref: 'Message',
  localField: 'conversationRoomId',
  foreignField: 'roomId',
});

// ─────────────────────────────────────────────
// Pre-save hooks
// ─────────────────────────────────────────────

ProjectSchema.pre('save', function autoPopulateFields(next) {
  // Assign a deterministic room ID on first save
  if (this.isNew && !this.conversationRoomId) {
    this.conversationRoomId = `project-${this._id.toHexString()}`;
  }

  // Stamp completion / cancellation timestamps
  if (this.isModified('status')) {
    if (this.status === 'completed' && !this.completedAt) {
      this.completedAt = new Date();
    }
    if (this.status === 'cancelled' && !this.cancelledAt) {
      this.cancelledAt = new Date();
    }
  }

  next();
});

// ─────────────────────────────────────────────
// Instance method: recalculate progressPercent
// Called from the milestone controller after any
// milestone status change.
// ─────────────────────────────────────────────
ProjectSchema.methods.recalculateProgress = async function () {
  const Milestone = mongoose.model('Milestone');
  const milestones = await Milestone.find({ project: this._id });

  if (!milestones.length) {
    this.progressPercent = 0;
    this.amountReleased  = 0; 
    return this.save();
  }

  const totalAmount = milestones.reduce((sum, m) => sum + m.amount, 0);
  const releasedAmount = milestones
    .filter((m) => m.status === 'released')
    .reduce((sum, m) => sum + m.amount, 0);

  this.progressPercent = Math.round((releasedAmount / totalAmount) * 100);
this.amountReleased  = releasedAmount; 

  if (this.progressPercent === 100) {
    this.status = 'completed';
    this.escrowStatus = 'completed';
  }

  return this.save();
};

module.exports = mongoose.model('Project', ProjectSchema);