'use strict';

const express = require('express');
const router = express.Router();
const disputeController = require('../controllers/dispute.controller');

// ASSUMPTION: authMiddleware exports a function called `protect` — confirm
// against your actual middleware/authMiddleware.js exports before running.
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/', disputeController.submitDispute);
router.get('/mine', disputeController.getMyDisputes);
router.get('/by-milestone/:milestoneId', disputeController.getDisputeByMilestone);
router.get('/:id', disputeController.getDisputeReport);
router.post('/:id/accept', disputeController.acceptResolution);

module.exports = router;