'use strict';

const mongoose = require('mongoose');

/* ─── Evidence item sub-document ──────────────────────────────────── */
const evidenceSchema = new mongoose.Schema(
  {
    uploadedBy: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    fileUrl:   { type: String, trim: true },
    fileType:  {
      type: String,
      enum: ['image', 'pdf', 'zip', 'text', 'other'],
      default: 'other',
    },
    caption:   { type: String, trim: true, maxlength: 500 },
  },
  { _id: true, timestamps: true }
);

/* ─── Admin action log sub-document ───────────────────────────────── */
const adminActionSchema = new mongoose.Schema(
  {
    admin: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    action: {
      type: String,
      enum: [
        'release_to_freelancer',
        'refund_to_client',
        'request_more_info',
        'escalate',
        'close_no_action',
      ],
      required: true,
    },
    note:       { type: String, trim: true, maxlength: 2000 },
    amountNPR:  { type: Number, min: 0, default: 0 },
  },
  { _id: true, timestamps: true }
);

/* ─── Root dispute schema ─────────────────────────────────────────── */
const disputeSchema = new mongoose.Schema(
  {
    /* ── References ── */
    project: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Project',
      required: [true, 'Project reference is required'],
      index:    true,
    },
    milestone: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'Milestone',
    },
    initiator: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'Dispute initiator is required'],
      index:    true,
    },
    respondent: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'Respondent is required'],
    },

    /* ── Claim content ── */
    reason: {
      type:     String,
      enum: [
        'work_not_delivered',
        'work_quality_poor',
        'payment_not_released',
        'scope_creep',
        'communication_breakdown',
        'fraud_suspected',
        'other',
      ],
      required: [true, 'Dispute reason is required'],
    },
    description: {
      type:      String,
      trim:      true,
      required:  [true, 'Dispute description is required'],
      minlength: [20,   'Description must be at least 20 characters'],
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },

    /* ── Evidence ── */
    evidence: [evidenceSchema],

    /* ── Status lifecycle ── */
    status: {
      type:    String,
      enum:    ['open', 'under_review', 'awaiting_info', 'resolved', 'closed'],
      default: 'open',
      index:   true,
    },

    /* ── Financial context ── */
    escrowAmount: { type: Number, min: 0, default: 0 },
    currency:     { type: String, enum: ['NPR', 'USD'], default: 'NPR' },

    /* ── Admin workflow ── */
    assignedAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
    },
    adminActions:  [adminActionSchema],

    /* ── Final ruling ── */
    resolution: {
      type: String,
      enum: [
        'release_to_freelancer',
        'refund_to_client',
        'split',
        'no_action',
        null,
      ],
      default: null,
    },
    resolutionNote: { type: String, trim: true, maxlength: 3000 },
    resolvedAt:     { type: Date },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'User',
    },

    /* ── Flags ── */
    isEscalated: { type: Boolean, default: false },
    priority: {
      type:    String,
      enum:    ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
  },
  {
    timestamps:      true,
    versionKey:      false,
    toJSON:          { virtuals: true },
    toObject:        { virtuals: true },
  }
);

/* ─── Indexes ─────────────────────────────────────────────────────── */
disputeSchema.index({ status: 1, createdAt: -1 });
disputeSchema.index({ project: 1, status: 1 });
disputeSchema.index({ initiator: 1, createdAt: -1 });

/* ─── Virtual: days open ──────────────────────────────────────────── */
disputeSchema.virtual('daysOpen').get(function () {
  const end   = this.resolvedAt || new Date();
  const diff  = end - this.createdAt;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
});

/* ─── Pre-save: set resolvedAt when status → resolved ────────────── */
disputeSchema.pre('save', function (next) {
  if (
    this.isModified('status') &&
    ['resolved', 'closed'].includes(this.status) &&
    !this.resolvedAt
  ) {
    this.resolvedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Dispute', disputeSchema);