/* ──────────────────────────────────────────────────────────────────────────── */
/* reputation.routes.js - Trust and Performance Metrics Interface              */
/* ──────────────────────────────────────────────────────────────────────────── */

const express = require('express');
const router = express.Router();
const reputationController = require('../controllers/reputation.controller');
const { protect } = require('../middleware/authMiddleware');
const { isAdmin } = require('../middleware/roleMiddleware');

/* 1. Public Endpoints: Available to all authenticated users */
router.route('/:userId')
  .get(reputationController.getReputation);

router.route('/:userId/trust-score')
  .get(reputationController.getTrustScore);

/* 2. Administrative Endpoints: Requires Admin authorization */
router.route('/:userId/update')
  .post(protect, isAdmin, reputationController.updateReputation);

module.exports = router;