'use strict';

/**
 * gamification.service.js
 * Core engine for point accumulation, level progression, and badge awarding.
 *
 * computeBadgeMetrics() now includes:
 *   - completedProjects (real, from Project.js — unlocks first_blood)
 *   - earlyDeliveries (real, from Project.js completedAt <= deadline — unlocks speed_demon)
 * in addition to the pre-existing cleanMilestones, fiveStarProjects,
 * sustainedHighRating, trustScore.
 *
 * STILL NOT INCLUDED (no tracking data exists anywhere): subFiveMinuteReplies
 * (no response-time logging on Message), profileCompletedHoursAfterSignup
 * (no profile-completion timestamp exists). fast_responder and early_bird
 * stay permanently unreachable until that tracking is built.
 *
 * NOTE ON earlyDeliveries: counts Project docs where status === 'completed'
 * AND completedAt <= deadline. This assumes both fields are reliably set —
 * completedAt is auto-stamped by Project's pre-save hook, deadline is
 * populated from the proposal at project-creation time (per Project.js
 * comments). Not independently verified against project-creation code.
 */

const User = require('../models/User');
const Badge = require('../models/Badge');
const UserBadge = require('../models/UserBadge');
const { Milestone } = require('../models/Milestone');
const Review = require('../models/Review');
const Project = require('../models/Project');
const { LEVEL_THRESHOLDS } = require('../config/constants');
const reputationService = require('./reputation.service');

function deriveLevel(points) {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i += 1) {
    if (points >= LEVEL_THRESHOLDS[i]) level = i + 1;
  }
  return level;
}

async function awardPoints(userId, amount, reason = '') {
  const user = await User.findById(userId);
  if (!user) throw new Error(`awardPoints: user ${userId} not found`);

  const previousLevel = user.level;
  user.points += amount;
  user.level = deriveLevel(user.points);
  await user.save();

  return {
    user,
    leveledUp: user.level > previousLevel,
    previousLevel,
    newLevel: user.level,
    reason,
  };
}

async function computeBadgeMetrics(userId) {
  const user = await User.findById(userId).select('trustScore');
  const trustScore = user?.trustScore ?? 0;

  const cleanMilestones = await Milestone.countDocuments({
    freelancer: userId,
    status: 'released',
  });

  const reviewStats = await Review.aggregate([
    { $match: { revieweeId: user._id } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$rating' },
        totalReviews: { $sum: 1 },
        fiveStarCount: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
      },
    },
  ]);

  const fiveStarProjects = reviewStats.length ? reviewStats[0].fiveStarCount : 0;

  const sustainedHighRating =
    reviewStats.length && reviewStats[0].totalReviews >= 20 ? reviewStats[0].avgRating : 0;

  const completedProjects = await Project.countDocuments({
    freelancer: userId,
    status: 'completed',
  });

  const earlyDeliveries = await Project.countDocuments({
    freelancer: userId,
    status: 'completed',
    deadline: { $exists: true, $ne: null },
    $expr: { $lte: ['$completedAt', '$deadline'] },
  });

  return {
    trustScore,
    cleanMilestones,
    fiveStarProjects,
    sustainedHighRating,
    completedProjects,
    earlyDeliveries,
  };
}

async function checkAndAwardBadges(userId, metrics = {}, context = {}) {
  const activeBadges = await Badge.find({ isActive: true });
  console.log('[BADGE DEBUG] activeBadges count:', activeBadges.length);
  const newlyAwarded = [];

  for (const badge of activeBadges) {
    const { metric, operator, threshold } = badge.triggerCondition || {};
    console.log(`[BADGE DEBUG] checking ${badge.slug}: metric=${metric}, value=${metrics[metric]}, operator=${operator}, threshold=${threshold}`);
    if (!metric || !(metric in metrics)) continue;

    const value = metrics[metric];
    let qualifies = false;
    switch (operator) {
      case 'gte':       qualifies = value >= threshold; break;
      case 'lte':       qualifies = value <= threshold; break;
      case 'eq':        qualifies = value === threshold; break;
      case 'count_gte': qualifies = value >= threshold; break;
      default:          qualifies = false;
    }
    if (!qualifies) continue;

    if (!badge.isRepeatable) {
      const alreadyOwned = await UserBadge.exists({ user: userId, badge: badge._id });
      if (alreadyOwned) continue;
    }

    const iteration = badge.isRepeatable
      ? (await UserBadge.countDocuments({ user: userId, badge: badge._id })) + 1
      : 1;

    const awarded = await UserBadge.create({
      user: userId,
      badge: badge._id,
      pointsGranted: badge.pointsAwarded,
      awardedFor: context.awardedForLabel || `Met threshold for ${metric}`,
      relatedProject: context.relatedProject || null,
      iteration,
    });

    await awardPoints(userId, badge.pointsAwarded, `Badge: ${badge.name}`);
    newlyAwarded.push(awarded);
  }

  if (newlyAwarded.length > 0) {
    await reputationService.recalculateTrustScore(userId);
  }

  return newlyAwarded;
}

async function checkAndAwardBadgesForUser(userId, context = {}) {
  const metrics = await computeBadgeMetrics(userId);
  console.log('[BADGE DEBUG] userId:', userId);
  console.log('[BADGE DEBUG] metrics:', metrics);
  return checkAndAwardBadges(userId, metrics, context);
}

async function getUserProgress(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error(`getUserProgress: user ${userId} not found`);

  const progress = user.getLevelProgress();
  const badgeCount = await UserBadge.countDocuments({ user: userId });

  return {
    points: user.points,
    level: user.level,
    ...progress,
    badgeCount,
  };
}

async function getLeaderboard(limit = 100, category) {
  return UserBadge.leaderboard(limit, category);
}

module.exports = {
  awardPoints,
  checkAndAwardBadges,
  checkAndAwardBadgesForUser,
  computeBadgeMetrics,
  getUserProgress,
  getLeaderboard,
  deriveLevel,
};