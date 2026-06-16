/**
 * match.routes.js
 * Express router for the Task Tide Smart-Matching subsystem.
 *
 * Mounts at: /api/match  (set in server/app.js)
 *
 * Route summary:
 *   POST   /api/match/job/:jobId          – run matching for a specific job  [client]
 *   GET    /api/match/job/:jobId/results  – retrieve cached results           [client]
 *   POST   /api/match/custom              – ad-hoc match from raw text         [client|admin]
 *   GET    /api/match/freelancer/:id/score – score one freelancer vs. a query  [client|admin]
 *   DELETE /api/match/cache               – clear result cache                 [admin]
 */

'use strict';

const express      = require('express');
const router       = express.Router();

const matchController = require('../controllers/match.controller');
const { protect }     = require('../middleware/authMiddleware');
const { authorise }   = require('../middleware/roleMiddleware');

/* ─────────────────────────────────────────────
   All matching routes require a valid JWT.
───────────────────────────────────────────── */
router.use(protect);

/* ─────────────────────────────────────────────
   POST /api/match/job/:jobId
   Trigger full pipeline matching for a specific job posting.
   Only clients may initiate matching (freelancers cannot post jobs either).
───────────────────────────────────────────── */
router.post(
  '/job/:jobId',
  authorise('client', 'admin'),
  matchController.matchForJob,
);

/* ─────────────────────────────────────────────
   GET /api/match/job/:jobId/results
   Return the most recently cached match results for a job.
───────────────────────────────────────────── */
router.get(
  '/job/:jobId/results',
  authorise('client', 'admin'),
  matchController.getCachedResults,
);

/* ─────────────────────────────────────────────
   POST /api/match/custom
   Ad-hoc match from raw description text (pre-posting preview).
   Body: { description, skills[], topN?, minTrustScore?, maxHourlyRate?, location? }
───────────────────────────────────────────── */
router.post(
  '/custom',
  authorise('client', 'admin'),
  matchController.matchCustom,
);

/* ─────────────────────────────────────────────
   GET /api/match/freelancer/:freelancerId/score
   Return the match percentage for a single freelancer.
   Query / body: { description, skills[] }
───────────────────────────────────────────── */
router.get(
  '/freelancer/:freelancerId/score',
  authorise('client', 'admin'),
  matchController.scoreFreelancer,
);

/* ─────────────────────────────────────────────
   DELETE /api/match/cache
   Admin-only: clear the in-process match result cache.
───────────────────────────────────────────── */
router.delete(
  '/cache',
  authorise('admin'),
  matchController.clearCache,
);

module.exports = router;