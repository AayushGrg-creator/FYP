/* ──────────────────────────────────────────────────────────────────────────── */
/* proposal.routes.js - Marketplace Transaction & Bidding Logic                 */
/* ──────────────────────────────────────────────────────────────────────────── */

const express = require('express');
const router = express.Router();
const proposalController = require('../controllers/proposal.controller');
const { protect } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');

/* 1. Global Middleware: All proposal actions require authentication */
router.use(protect);

/* Must come BEFORE /:id, or Express will treat "job" as an :id param */
router.route('/job/:jobId')
  .get(checkRole(['client']), proposalController.getProposalsForJob);

/* 2. Proposal Management */
router.route('/')
  .post(checkRole(['freelancer']), proposalController.createProposal)
  .get(proposalController.getProposals);

router.route('/:id')
  .get(proposalController.getProposalById)
  .patch(checkRole(['freelancer']), proposalController.updateProposal);

router.route('/:id/status')
  .patch(checkRole(['client']), proposalController.updateProposalStatus);

module.exports = router;