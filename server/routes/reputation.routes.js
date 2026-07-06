'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const reputationController = require('../controllers/reputation.controller');

// GET /api/reputation           -> your own trust score
// GET /api/reputation/:userId   -> another user's trust score (for public profile view)
router.get('/', protect, reputationController.getTrustScore);
router.get('/:userId', protect, reputationController.getTrustScore);

// POST /api/reputation/recalculate -> force-recalculate your own score
router.post('/recalculate', protect, reputationController.recalculateTrustScore);

module.exports = router;