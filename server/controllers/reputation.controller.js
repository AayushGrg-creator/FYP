'use strict';

/**
 * reputation.controller.js
 * Exposes trust-score data. No route file mounts this yet
 * (reputation.routes.js doesn't exist) — reachable only via direct
 * function import elsewhere in the codebase for now.
 */

const User = require('../models/User');
const reputationService = require('../services/reputation.service');

exports.getTrustScore = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    const user = await User.findById(userId).select('trustScore name');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    return res.status(200).json({ success: true, trustScore: user.trustScore });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch trust score' });
  }
};

exports.recalculateTrustScore = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    const score = await reputationService.recalculateTrustScore(userId);
    return res.status(200).json({ success: true, trustScore: score });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Recalculation failed' });
  }
};