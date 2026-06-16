const mongoose = require('mongoose');

const { Schema } = mongoose;

/**
 * UserBadge – junction document recording that a specific user
 * earned a specific badge at a specific point in time.
 *
 * Separated from Badge so that:
 *  a) badge templates can change without touching award history
 *  b) repeatable badges accumulate a clean timeline
 *  c) leaderboard aggregations stay fast (just query this collection)
 */
const UserBadgeSchema = new Schema(
  {
    // ── Relationships ──────────────────────────────────────────────────
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'UserBadge must belong to a user.'],
      index: true,
    },

    badge: {
      type: Schema.Types.ObjectId,
      ref: 'Badge',
      required: [true, 'UserBadge must reference a badge.'],
      index: true,
    },

    // ── Award Context ──────────────────────────────────────────────────
    // Points snapshot at the moment of award (badge pointsAwarded may change later)
    pointsGranted: {
      type: Number,
      required: [true, 'pointsGranted is required.'],
      min: 0,
    },

    // The event / trigger that caused the award (for audit & display)
    awardedFor: {
      type: String,
      trim: true,
      maxlength: 200,
      // e.g. "Delivered project #abc123 3 days early"
    },

    // Optional link to the project / milestone that triggered the award
    relatedProject: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      default: null,
      index: true,
      sparse: true,
    },

    // ── Presentation ──────────────────────────────────────────────────
    // Whether the user has viewed / acknowledged the badge notification
    isSeen: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Whether the user has chosen to display this badge prominently on their profile
    isPinned: {
      type: Boolean,
      default: false,
    },

    // Iteration count – incremented each time a repeatable badge is re-earned
    iteration: {
      type: Number,
      default: 1,
      min: 1,
    },

    // Timestamp of award (duplicating createdAt for explicit semantics)
    awardedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Indexes ────────────────────────────────────────────────────────────

// Prevent duplicate (non-repeatable) awards; application layer checks isRepeatable first
// but this acts as a safety net for the first iteration
UserBadgeSchema.index(
  { user: 1, badge: 1, iteration: 1 },
  { unique: true }
);

// Profile page: "my badges, newest first"
UserBadgeSchema.index({ user: 1, awardedAt: -1 });

// Leaderboard aggregation: total points per user
UserBadgeSchema.index({ user: 1, pointsGranted: 1 });

// Unseen notification bell query
UserBadgeSchema.index({ user: 1, isSeen: 1 });

// ── Statics ────────────────────────────────────────────────────────────

/**
 * Returns the total points accumulated by a user across all badge awards.
 * Used by leaderboard scripts and the reputation service.
 */
UserBadgeSchema.statics.totalPoints = async function (userId) {
  const result = await this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    { $group: { _id: null, total: { $sum: '$pointsGranted' } } },
  ]);
  return result.length ? result[0].total : 0;
};

/**
 * Returns badge counts grouped by tier for a user.
 * Used in the TrustScore badge multiplier calculation.
 */
UserBadgeSchema.statics.badgeCountByTier = async function (userId) {
  return this.aggregate([
    { $match: { user: new mongoose.Types.ObjectId(userId) } },
    {
      $lookup: {
        from: 'badges',
        localField: 'badge',
        foreignField: '_id',
        as: 'badgeDoc',
      },
    },
    { $unwind: '$badgeDoc' },
    { $group: { _id: '$badgeDoc.tier', count: { $sum: 1 } } },
  ]);
};

/**
 * Leaderboard snapshot: top N users by total points.
 * @param {number} limit - number of rows to return (default 100)
 * @param {string} [category] - optional badge category filter
 */
UserBadgeSchema.statics.leaderboard = async function (limit = 100, category) {
  const pipeline = [];

  if (category) {
    pipeline.push(
      {
        $lookup: {
          from: 'badges',
          localField: 'badge',
          foreignField: '_id',
          as: 'badgeDoc',
        },
      },
      { $unwind: '$badgeDoc' },
      { $match: { 'badgeDoc.category': category } }
    );
  }

  pipeline.push(
    { $group: { _id: '$user', totalPoints: { $sum: '$pointsGranted' }, badgeCount: { $sum: 1 } } },
    { $sort: { totalPoints: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'userDoc',
      },
    },
    { $unwind: '$userDoc' },
    {
      $project: {
        userId: '$_id',
        totalPoints: 1,
        badgeCount: 1,
        name: '$userDoc.name',
        avatarUrl: '$userDoc.avatarUrl',
        trustScore: '$userDoc.trustScore',
      },
    }
  );

  return this.aggregate(pipeline);
};

module.exports = mongoose.model('UserBadge', UserBadgeSchema);