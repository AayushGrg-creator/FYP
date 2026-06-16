/* ──────────────────────────────────────────────────────────────────────────── */
/* proposal.routes.js - Marketplace Transaction & Bidding Logic                 */
/* ──────────────────────────────────────────────────────────────────────────── */

const express = require('express');
const router = express.Router();
const proposalController = require('../controllers/proposal.controller');
const { protect } = require('../middleware/authMiddleware');

/* 1. Global Middleware: All proposal actions require authentication */
router.use(protect);

/* 2. Proposal Management */
router.route('/')
  .post(proposalController.submitProposal)
  .get(proposalController.getProposals);

router.route('/:id')
  .put(proposalController.updateProposal);

module.exports = router;