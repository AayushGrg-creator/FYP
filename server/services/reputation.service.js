'use strict';

/**
 * reputation.service.js
 * Bridges raw platform data (reviews, badges, projects) into Trustcalculator's
 * pure scoring function, and persists the result to User.trustScore.
 *
 * UPDATED: completedProjects/totalAcceptedProjects now pull real counts from
 * Project.js (confirmed schema: a Project only exists after a proposal is
 * accepted, so every Project doc IS an accepted project — no separate flag
 * needed).
 *
 * STILL NULL: avgResponseHours (no message-timestamp tracking exists yet),
 * yearsSinceLastDispute (no dispute-date field surfaced in Project.js —
 * only a `dispute` ref, not a resolved/closed date). These two still
 * contribute worst-case values to the trust formula. Fix later by wiring
 * Message timestamps and Dispute.resolvedAt once those are reviewed.
 */

const User      = require('../models/User');
const Review    = require('../models/Review');
const UserBadge = require('../models/UserBadge');
const Project   = require('../models/Project');
const { calculateTrustScore } = require('../utils/Trustcalculator');

async function recalculateTrustScore(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error(`recalculateTrustScore: user ${userId} not found`);

  const reviewStats = await Review.aggregate([
    { $match: { revieweeId: user._id } },
    { $group: { _id: '$revieweeId', avgRating: { $avg: '$rating' }, totalReviews: { $sum: 1 } } },
  ]);
  const averageRating = reviewStats.length ? reviewStats[0].avgRating : 0;

  const badgeCount = await UserBadge.countDocuments({ user: userId });

  // Every Project document represents an accepted proposal (per schema comment),
  // so total Project count for this freelancer = totalAcceptedProjects.
  const totalAcceptedProjects = await Project.countDocuments({ freelancer: userId });
  const completedProjects = await Project.countDocuments({
    freelancer: userId,
    status: 'completed',
  });

  const { score } = calculateTrustScore({
    completedProjects,
    totalAcceptedProjects,
    averageRating,
    avgResponseHours: null,
    yearsSinceLastDispute: null,
    badgeCount,
  });

  user.trustScore = score;
  await user.save();
  return score;
}

module.exports = { recalculateTrustScore };