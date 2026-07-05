/* ──────────────────────────────────────────────────────────────────────────── */
/* job.routes.js - Job Posting and Retrieval Endpoints                         */
/* ──────────────────────────────────────────────────────────────────────────── */

const express = require('express');
const router = express.Router();
const jobController = require('../controllers/job.controller');
const { protect } = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware');

/* 1. Public Endpoints - Available to all users */
router.route('/')
  .get(jobController.getAllJobs);

/* Must come BEFORE /:id, or Express will treat "my" as an :id param */
router.route('/my')
  .get(protect, jobController.getMyJobs);

router.route('/:id')
  .get(jobController.getJobById);

/* 2. Protected Endpoints - Requires active authentication */
router.use(protect);

router.route('/')
  .post(checkRole(['client']), jobController.createJob);

router.route('/:id')
  .put(jobController.updateJob)
  .delete(jobController.deleteJob);

/* Freelancer-only: mark a job they're assigned to (accepted proposal) complete */
router.route('/:id/complete')
  .patch(checkRole(['freelancer']), jobController.markJobComplete);

module.exports = router;