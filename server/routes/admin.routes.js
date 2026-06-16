/* ──────────────────────────────────────────────────────────────────────────── */
/* admin.routes.js - Administrative Control Plane                               */
/* ──────────────────────────────────────────────────────────────────────────── */

'use strict';

const express = require('express');
const router  = express.Router();

const adminCtrl    = require('../controllers/admin.controller');
const { protect }  = require('../middleware/authMiddleware');
const { isAdmin }  = require('../middleware/roleMiddleware');

/* 1. Global Middleware: Enforce Auth & Admin Role */
router.use(protect, isAdmin);

/* 2. Platform Intelligence */
router.get('/overview', adminCtrl.getOverview);

/* 3. Identity & User Moderation */
router.route('/users')
  .get(adminCtrl.listUsers);

router.route('/users/:id')
  .get(adminCtrl.getUser);

router.route('/users/:id/ban').patch(adminCtrl.toggleBan);
router.route('/users/:id/trust-score').patch(adminCtrl.updateTrustScore);
router.route('/users/:id/role').patch(adminCtrl.updateRole);

/* 4. Dispute Resolution & Arbitration */
router.route('/disputes')
  .get(adminCtrl.listDisputes);

router.route('/disputes/:id')
  .get(adminCtrl.getDispute);

router.route('/disputes/:id/assign').patch(adminCtrl.assignDispute);
router.route('/disputes/:id/action').post(adminCtrl.addDisputeAction);
router.route('/disputes/:id/resolve').patch(adminCtrl.resolveDispute);

/* 5. Financial Operations */
router.post('/escrow/:projectId/adjust', adminCtrl.adjustEscrow);

/* 6. System Auditing */
router.get('/reports/summary', adminCtrl.getReportSummary);

module.exports = router;