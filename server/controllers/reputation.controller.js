'use strict';

/**
 * reputation.controller.js
 * Exposes trust-score data, including the full factor breakdown, so the
 * public profile page can show "why" a score is what it is — not just a
 * bare number.
 */

const reputationService = require('../services/reputation.service');

exports.getTrustScore = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    const details = await reputationService.getTrustScoreDetails(userId);

    return res.status(200).json({
      success: true,
      data: {
        userId,
        name: details.name,
        trustScore: details.score,
        breakdown: details.breakdown,
      },
    });
  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(500).json({ success: false, message: 'Failed to fetch trust score' });
  }
};

exports.recalculateTrustScore = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    const result = await reputationService.recalculateTrustScore(userId);

    return res.status(200).json({
      success: true,
      data: {
        trustScore: result.score,
        breakdown: result.breakdown,
        inputs: result.inputs,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Recalculation failed' });
  }
};