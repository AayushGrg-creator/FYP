'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const PLATFORM_FEE_RATE = 0.08;

const MILESTONE_STATUSES = Object.freeze([
  'created',
  'funded',
  'pending_approval',
  'released',
  'disputed',
  'resolved',
  'refunded',
  'cancelled',
]);

const TERMINAL_STATUSES = Object.freeze([
  'released',
  'refunded',
  'resolved',
  'cancelled',
]);

const FUNDED_STATUSES = Object.freeze(['funded', 'pending_approval']);

const DISPUTE_RESOLUTIONS = Object.freeze([
  'released_to_freelancer',
  'refunded_to_client',
  'partial_split',
]);

const GATEWAYS = Object.freeze(['khalti', 'stripe']);

const VALID_TRANSITIONS = Object.freeze({
  created:          ['funded', 'cancelled'],
  funded:           ['pending_approval', 'refunded', 'cancelled'],
  pending_approval: ['released', 'disputed'],
  disputed:         ['resolved'],
  released:         [],
  refunded:         [],
  resolved:         [],
  cancelled:        [],
});

const MilestoneSchema = new Schema(
  {
    project: {
      type:      Schema.Types.ObjectId,
      ref:       'Project',
      required:  [true, 'Milestone must belong to a project.'],
      immutable: true,
    },

    client: {
      type:      Schema.Types.ObjectId,
      ref:       'User',
      required:  [true, 'Milestone must reference the client.'],
      immutable: true,
    },

    freelancer: {
      type:      Schema.Types.ObjectId,
      ref:       'User',
      required:  [true, 'Milestone must reference the freelancer.'],
      immutable: true,
    },

    name: {
      type:      String,
      required:  [true, 'Milestone name is required.'],
      trim:      true,
      minlength: [3,   'Milestone name must be at least 3 characters.'],
      maxlength: [200, 'Milestone name cannot exceed 200 characters.'],
    },

    description: {
      type:      String,
      trim:      true,
      maxlength: [2000, 'Milestone description cannot exceed 2000 characters.'],
    },

    amount: {
      type:     Number,
      required: [true, 'Milestone amount is required.'],
      min:      [1,    'Milestone amount must be at least 1.'],
    },

    currency: {
      type:    String,
      enum:    {
        values:  ['NPR', 'USD'],
        message: '{VALUE} is not a supported currency.',
      },
      default: 'NPR',
    },

    platformFee: {
      type:    Number,
      default: 0,
      min:     [0, 'Platform fee cannot be negative.'],
    },

    netAmount: {
      type:    Number,
      default: 0,
      min:     [0, 'Net amount cannot be negative.'],
    },

    status: {
      type:    String,
      enum:    {
        values:  MILESTONE_STATUSES,
        message: '{VALUE} is not a valid milestone status.',
      },
      default: 'created',
    },

    order: {
      type:     Number,
      required: [true, 'Milestone order is required.'],
      min:      [1,    'Order must be at least 1.'],
    },

    dueDate: {
      type:     Date,
      required: [true, 'Milestone due date is required.'],
    },

    gatewayIdempotencyKey: {
      type:   String,
      sparse: true,
    },

    gatewayRef: {
      type:   String,
      sparse: true,
    },

    gateway: {
      type: String,
      enum: {
        values:  GATEWAYS,
        message: '{VALUE} is not a supported payment gateway.',
      },
    },

    submission: {
      submittedAt: { type: Date, default: null },
      deliverableUrl: {
        type:      String,
        trim:      true,
        maxlength: [500, 'Deliverable URL cannot exceed 500 characters.'],
        validate: {
          validator(v) {
            if (!v) return true;
            try { new URL(v); return true; }
            catch { return false; }
          },
          message: 'deliverableUrl must be a valid URL.',
        },
      },
      notes: {
        type:      String,
        trim:      true,
        maxlength: [2000, 'Submission notes cannot exceed 2000 characters.'],
      },
    },

    disputeDetails: {
      raisedAt:  { type: Date, default: null },
      reason: {
        type:      String,
        trim:      true,
        maxlength: [2000, 'Dispute reason cannot exceed 2000 characters.'],
      },
      adminNote: {
        type:      String,
        trim:      true,
        maxlength: [2000, 'Admin note cannot exceed 2000 characters.'],
      },
      resolvedAt: { type: Date, default: null },
      resolution: {
        type: String,
        enum: {
          values:  DISPUTE_RESOLUTIONS,
          message: '{VALUE} is not a valid dispute resolution.',
        },
      },
      splitPercentFreelancer: {
        type: Number,
        min:  [0,   'Split percent cannot be below 0.'],
        max:  [100, 'Split percent cannot exceed 100.'],
      },
    },

    fundedAt:    { type: Date, default: null },
    submittedAt: { type: Date, default: null },
    releasedAt:  { type: Date, default: null },
    refundedAt:  { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON:     { virtuals: true },
    toObject:   { virtuals: true },
  },
);

MilestoneSchema.index({ project: 1, order: 1 });
MilestoneSchema.index({ project: 1, status: 1 });
MilestoneSchema.index({ client: 1, status: 1 });
MilestoneSchema.index({ freelancer: 1, status: 1 });
MilestoneSchema.index({ dueDate: 1, status: 1 });
MilestoneSchema.index({ status: 1, 'disputeDetails.raisedAt': -1 });
MilestoneSchema.index({ gatewayRef: 1 },              { sparse: true });
MilestoneSchema.index({ gatewayIdempotencyKey: 1 },   { sparse: true });

MilestoneSchema.virtual('isTerminal').get(function () {
  return TERMINAL_STATUSES.includes(this.status);
});

MilestoneSchema.virtual('isOverdue').get(function () {
  if (!this.dueDate || TERMINAL_STATUSES.includes(this.status)) return false;
  return new Date() > this.dueDate;
});

MilestoneSchema.virtual('daysUntilDue').get(function () {
  if (!this.dueDate) return null;
  const diff = this.dueDate - new Date();
  return Math.ceil(diff / (1_000 * 60 * 60 * 24));
});

MilestoneSchema.pre('save', function (next) {
  if (this.isModified('amount') || this.isNew) {
    this.platformFee = Math.round(this.amount * PLATFORM_FEE_RATE * 100) / 100;
    this.netAmount   = Math.round((this.amount - this.platformFee) * 100) / 100;
  }

  
  if (this.isModified('status')) {
    const now = new Date();
    switch (this.status) {
      case 'funded':
        if (!this.fundedAt) this.fundedAt = now;
        break;
      case 'pending_approval':
        if (!this.submittedAt) this.submittedAt = now;
        if (!this.submission.submittedAt) this.submission.submittedAt = now;
        break;
      case 'released':
        if (!this.releasedAt) this.releasedAt = now;
        break;
      case 'refunded':
        if (!this.refundedAt) this.refundedAt = now;
        break;
      case 'cancelled':
        if (!this.cancelledAt) this.cancelledAt = now;
        break;
      case 'disputed':
        if (!this.disputeDetails.raisedAt) this.disputeDetails.raisedAt = now;
        break;
      case 'resolved':
        if (!this.disputeDetails.resolvedAt) this.disputeDetails.resolvedAt = now;
        break;
      default:
        break;
    }
  }

  if (
    this.status === 'resolved' &&
    this.disputeDetails.resolution === 'partial_split' &&
    (this.disputeDetails.splitPercentFreelancer == null)
  ) {
    return next(
      new Error('splitPercentFreelancer is required for a partial_split resolution.'),
    );
  }

  next();
});

MilestoneSchema.post('save', async function (doc) {
  try {
    const Project = mongoose.model('Project');
    const project = await Project.findById(doc.project);
    if (project && typeof project.recalculateProgress === 'function') {
      await project.recalculateProgress();
    }
  } catch (err) {
    console.error('[Milestone post-save] Failed to recalculate project progress:', err.message);
  }
});

MilestoneSchema.methods.fund = function (gatewayRef, gateway, idempotencyKey) {
  if (this.status !== 'created') {
    throw new Error(`Milestone must be 'created' to be funded (current: "${this.status}").`);
  }
  this.gatewayRef              = gatewayRef;
  this.gateway                 = gateway;
  this.gatewayIdempotencyKey   = idempotencyKey;
  this.status                  = 'funded';
  return this;
};

MilestoneSchema.methods.submitWork = function (deliverableUrl, notes) {
  if (this.status !== 'funded') {
    throw new Error(`Milestone must be 'funded' for work to be submitted (current: "${this.status}").`);
  }
  this.submission.deliverableUrl = deliverableUrl;
  this.submission.notes          = notes ?? '';
  this.status                    = 'pending_approval';
  return this;
};

MilestoneSchema.methods.release = function () {
  if (this.status !== 'pending_approval') {
    throw new Error(`Milestone must be 'pending_approval' to be released (current: "${this.status}").`);
  }
  this.status = 'released';
  return this;
};

MilestoneSchema.methods.raiseDispute = function (reason) {
  if (this.status !== 'pending_approval') {
    throw new Error(`A dispute can only be raised on a 'pending_approval' milestone (current: "${this.status}").`);
  }
  this.disputeDetails.reason = reason;
  this.status                = 'disputed';
  return this;
};

MilestoneSchema.methods.resolve = function (resolution, adminNote, splitPercent) {
  if (this.status !== 'disputed') {
    throw new Error(`Milestone must be 'disputed' to be resolved (current: "${this.status}").`);
  }
  if (!DISPUTE_RESOLUTIONS.includes(resolution)) {
    throw new Error(`Invalid resolution: "${resolution}".`);
  }
  if (resolution === 'partial_split' && splitPercent == null) {
    throw new Error('splitPercentFreelancer is required for partial_split resolution.');
  }
  this.disputeDetails.resolution             = resolution;
  this.disputeDetails.adminNote              = adminNote ?? '';
  this.disputeDetails.splitPercentFreelancer = splitPercent ?? null;
  this.status                                = 'resolved';
  return this;
};

MilestoneSchema.methods.cancel = function () {
  if (TERMINAL_STATUSES.includes(this.status)) {
    throw new Error(`Cannot cancel a milestone in terminal status "${this.status}".`);
  }
  this.status = 'cancelled';
  return this;
};

MilestoneSchema.statics.escrowBalance = async function (projectId) {
  const result = await this.aggregate([
    {
      $match: {
        project: new mongoose.Types.ObjectId(projectId),
        status:  { $in: [...FUNDED_STATUSES] },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);
  return result.length ? result[0].total : 0;
};

MilestoneSchema.statics.findOverdue = function () {
  return this.find({
    dueDate: { $lt: new Date() },
    status:  { $nin: [...TERMINAL_STATUSES] },
  })
    .sort({ dueDate: 1 })
    .populate('project', 'title')
    .populate('client freelancer', 'name email')
    .lean();
};

MilestoneSchema.statics.findByProject = function (projectId) {
  return this.find({ project: projectId })
    .sort({ order: 1 })
    .lean({ virtuals: true });
};

const Milestone = mongoose.model('Milestone', MilestoneSchema);

module.exports = {
  Milestone,
  MILESTONE_STATUSES,
  TERMINAL_STATUSES,
  FUNDED_STATUSES,
  DISPUTE_RESOLUTIONS,
  GATEWAYS,
  VALID_TRANSITIONS,
  PLATFORM_FEE_RATE,
};
