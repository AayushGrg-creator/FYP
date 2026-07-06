'use strict';

/**
 * reputation.service.js
 * Bridges raw platform data (reviews, badges, projects, messages) into
 * Trustcalculator's pure scoring function.
 *
 * REFACTORED (session 4): input-gathering is now a shared helper
 * (gatherTrustInputs) used by both:
 *   - recalculateTrustScore(userId)  → computes AND persists to User.trustScore
 *   - getTrustScoreDetails(userId)   → computes fresh breakdown WITHOUT
 *     saving, so the public profile page can show "why" a score is what
 *     it is on every view without mutating data on a simple GET request.
 *
 * NOTE: getTrustScoreDetails' `score` is freshly computed and may differ
 * slightly from User.trustScore if recalculateTrustScore hasn't run since
 * the last milestone/review/etc. In practice these should match closely
 * since recalculateTrustScore already runs after every milestone approval
 * and badge award (see milestone.controller.js / gamification.service.js).
 *
 * avgResponseHours: real, computed from Message.js timestamps (freelancer
 * reply gaps). yearsSinceLastDispute: approximated from Project.updatedAt
 * on the most recent disputed project — no dedicated Dispute timestamp
 * exists yet, so this is a proxy, not exact (see prior session notes).
 */

const User      = require('../models/User');
const Review    = require('../models/Review');
const UserBadge = require('../models/UserBadge');
const Project   = require('../models/Project');
const Message   = require('../models/Message');
const { calculateTrustScore } = require('../utils/trustCalculator');

async function computeAvgResponseHours(freelancerId) {
  const conversationIds = await Message.distinct('conversationId', {
    sender: freelancerId,
    deletedAt: null,
  });

  if (!conversationIds.length) return null;

  const messages = await Message.find({
    conversationId: { $in: conversationIds },
    deletedAt: null,
  })
    .sort({ conversationId: 1, createdAt: 1 })
    .select('conversationId sender isSystemMessage createdAt')
    .lean();

  const byConversation = {};
  for (const msg of messages) {
    const key = msg.conversationId.toString();
    if (!byConversation[key]) byConversation[key] = [];
    byConversation[key].push(msg);
  }

  const responseGapsHours = [];

  for (const convoMessages of Object.values(byConversation)) {
    for (let i = 1; i < convoMessages.length; i += 1) {
      const prev = convoMessages[i - 1];
      const curr = convoMessages[i];

      const currIsFreelancer = curr.sender.toString() === freelancerId.toString();
      const prevIsFreelancer = prev.sender.toString() === freelancerId.toString();

      if (currIsFreelancer && !prevIsFreelancer && !prev.isSystemMessage) {
        const gapMs = new Date(curr.createdAt) - new Date(prev.createdAt);
        const gapHours = gapMs / (1000 * 60 * 60);
        if (gapHours >= 0) responseGapsHours.push(gapHours);
      }
    }
  }

  if (!responseGapsHours.length) return null;

  const total = responseGapsHours.reduce((sum, h) => sum + h, 0);
  return total / responseGapsHours.length;
}

async function computeYearsSinceLastDispute(freelancerId) {
  const lastDisputed = await Project.findOne({
    freelancer: freelancerId,
    status: 'disputed',
  })
    .sort({ updatedAt: -1 })
    .select('updatedAt')
    .lean();

  if (!lastDisputed) return null;

  const msSinceDispute = Date.now() - new Date(lastDisputed.updatedAt).getTime();
  return msSinceDispute / (1000 * 60 * 60 * 24 * 365.25);
}

/**
 * Gathers every raw input Trustcalculator needs, for a given freelancer.
 * Shared by both recalculateTrustScore and getTrustScoreDetails.
 */
async function gatherTrustInputs(userId) {
  const reviewStats = await Review.aggregate([
    { $match: { revieweeId: new (require('mongoose').Types.ObjectId)(userId) } },
    { $group: { _id: '$revieweeId', avgRating: { $avg: '$rating' }, totalReviews: { $sum: 1 } } },
  ]);
  const averageRating = reviewStats.length ? reviewStats[0].avgRating : 0;

  const badgeCount = await UserBadge.countDocuments({ user: userId });

  const totalAcceptedProjects = await Project.countDocuments({ freelancer: userId });
  const completedProjects = await Project.countDocuments({
    freelancer: userId,
    status: 'completed',
  });

  const avgResponseHours = await computeAvgResponseHours(userId);
  const yearsSinceLastDispute = await computeYearsSinceLastDispute(userId);

  return {
    completedProjects,
    totalAcceptedProjects,
    averageRating,
    avgResponseHours,
    yearsSinceLastDispute,
    badgeCount,
  };
}

/**
 * Recalculates AND PERSISTS a freelancer's Trust Score.
 * Call this after events that should change the score (milestone
 * approval, badge award, new review, etc).
 */
async function recalculateTrustScore(userId) {
  const user = await User.findById(userId);
  if (!user) throw new Error(`recalculateTrustScore: user ${userId} not found`);

  const inputs = await gatherTrustInputs(userId);
  const { score, breakdown } = calculateTrustScore(inputs);

  user.trustScore = score;
  await user.save();

  return { score, breakdown, inputs };
}

/**
 * Returns a freshly computed score + breakdown WITHOUT saving.
 * Used by the public profile GET endpoint so viewing someone's profile
 * never mutates their data.
 */
async function getTrustScoreDetails(userId) {
  const user = await User.findById(userId).select('trustScore name');
  if (!user) throw new Error(`getTrustScoreDetails: user ${userId} not found`);

  const inputs = await gatherTrustInputs(userId);
  const { score, breakdown } = calculateTrustScore(inputs);

  return {
    persistedScore: user.trustScore,
    score,
    breakdown,
    inputs,
    name: user.name,
  };
}

module.exports = {
  recalculateTrustScore,
  getTrustScoreDetails,
  computeAvgResponseHours,
  computeYearsSinceLastDispute,
};