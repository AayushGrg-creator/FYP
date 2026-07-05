'use strict';

/**
 * milestone.routes.js
 *
 * Mounts at: /api/milestones  (set in server/app.js)
 *
 *   POST   /api/milestones                     - create a milestone (client only)
 *   GET    /api/milestones/project/:projectId  - list milestones for a project
 *   PATCH  /api/milestones/:id/fund            - client initiates a real Khalti payment
 *   PATCH  /api/milestones/:id/confirm-payment - client confirms payment after Khalti redirect
 *   PATCH  /api/milestones/:id/submit          - freelancer submits work
 *   PATCH  /api/milestones/:id/approve         - client approves + releases funds
 *   PATCH  /api/milestones/:id/dispute         - client raises a dispute
 *   PATCH  /api/milestones/:id/cancel          - client cancels a non-terminal milestone
 *   DELETE /api/milestones/:id                 - client deletes an unfunded/cancelled milestone
 */

const express = require('express');
const router  = express.Router();

const milestoneController = require('../controllers/milestone.controller');
const { protect }   = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');

router.use(protect);

router.post('/', checkRole(['client']), milestoneController.createMilestone);
router.get('/project/:projectId', milestoneController.getMilestonesForProject);

router.patch('/:id/fund',            checkRole(['client']),     milestoneController.fundMilestone);
router.patch('/:id/confirm-payment', checkRole(['client']),     milestoneController.confirmMilestoneFunding); // NEW
router.patch('/:id/submit',          checkRole(['freelancer']), milestoneController.submitMilestone);
router.patch('/:id/approve',         checkRole(['client']),     milestoneController.approveMilestone);
router.patch('/:id/dispute',         checkRole(['client']),     milestoneController.disputeMilestone);
router.patch('/:id/cancel',          checkRole(['client']),     milestoneController.cancelMilestone);
router.delete('/:id',                checkRole(['client']),     milestoneController.deleteMilestone);

module.exports = router;