'use strict';

const gamificationService = require('../services/gamification.service');
const Badge = require('../models/Badge');
const UserBadge = require('../models/UserBadge');

exports.getMyProgress = async (req, res) => {
  try {
    const progress = await gamificationService.getUserProgress(req.user.id);
    return res.status(200).json({ success: true, data: progress });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch progress' });
  }
};

exports.getLeaderboard = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 100;
    const { category } = req.query;
    const leaderboard = await gamificationService.getLeaderboard(limit, category);
    return res.status(200).json({ success: true, data: leaderboard });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch leaderboard' });
  }
};

exports.getAllBadges = async (req, res) => {
  try {
    const badges = await Badge.find({ isActive: true }).sort({ tier: 1 });
    return res.status(200).json({ success: true, data: badges });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch badges' });
  }
};

exports.getMyBadges = async (req, res) => {
  try {
    const myBadges = await UserBadge.find({ user: req.user.id })
      .populate('badge')
      .sort({ awardedAt: -1 });
    return res.status(200).json({ success: true, data: myBadges });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch your badges' });
  }
};