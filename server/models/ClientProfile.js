const mongoose = require('mongoose');

const clientProfileSchema = new mongoose.Schema(
  {
    userId: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'User reference is required'],
      unique:   true,
      index:    true,
    },

    companyName: {
      type:      String,
      trim:      true,
      maxlength: [120, 'Company name cannot exceed 120 characters'],
      default:   '',
    },

    industryType: {
      type:      String,
      trim:      true,
      maxlength: [80, 'Industry type cannot exceed 80 characters'],
      default:   '',
    },

    trustScore: {
      type:    Number,
      default: 100,
      min:     [0,   'Trust score cannot be below 0'],
      max:     [100, 'Trust score cannot exceed 100'],
    },

    spentAmount: {
      type:    Number,
      default: 0,
      min:     [0, 'Spent amount cannot be negative'],
    },

    totalPostedJobs: {
      type:    Number,
      default: 0,
      min:     [0, 'Total posted jobs cannot be negative'],
    },

    // Tracks the IDs of active/open jobs for quick lookup
    activeJobIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref:  'Job',
      },
    ],

    verified:  { type: Boolean, default: false },
    avatarUrl: { type: String,  trim: true, default: '' },
    location:  { type: String,  trim: true, default: '' },
  },
  {
    timestamps: true,
    toJSON:  { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
clientProfileSchema.index({ trustScore: -1 });
clientProfileSchema.index({ totalPostedJobs: -1 });

// ── Instance helper: determine if client is a high-value account ──────────────
clientProfileSchema.methods.isHighValue = function isHighValue(threshold = 50000) {
  return this.spentAmount >= threshold;
};

const ClientProfile = mongoose.model('ClientProfile', clientProfileSchema);
module.exports = ClientProfile;