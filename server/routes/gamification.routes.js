'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const gamificationController = require('../controllers/gamification.controller');

router.get('/progress', protect, gamificationController.getMyProgress);
router.get('/leaderboard', protect, gamificationController.getLeaderboard);
router.get('/badges', protect, gamificationController.getAllBadges);
router.get('/my-badges', protect, gamificationController.getMyBadges);

module.exports = router;