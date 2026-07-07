'use strict';

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const reviewController = require('../controllers/review.controller');

// Order matters: specific paths before the more generic ones.
router.post('/', protect, reviewController.submitReview);
router.get('/my-summary', protect, reviewController.getMySummary);
router.get('/by-project/:projectId', protect, reviewController.getReviewsForProject);
router.get('/by-milestone/:milestoneId', protect, reviewController.getReviewForMilestone);

module.exports = router;