/**
 * match.routes.js
 * Express router for the Task Tide Smart-Matching subsystem.
 *
 * Mounts at: /api/match  (set in server/app.js)
 *
 * Route summary:
 *   GET    /api/match/my-matches           – jobs matched to me (freelancer)   ✅ NEW
 *   POST   /api/match/job/:jobId           – run matching for a specific job   [client]
 *   GET    /api/match/job/:jobId/results   – retrieve cached results           [client]
 *   POST   /api/match/custom               – ad-hoc match from raw text        [client|admin]
 *   GET    /api/match/freelancer/:id/score – score one freelancer vs. a query  [client|admin]
 *   DELETE /api/match/cache                – clear result cache                [admin]
 *
 * ✅ FIXED: this file previously imported `{ authorise }` from
 * roleMiddleware.js, but that file only exports `checkRole`, which also
 * takes a single array argument, not separate string args. Both are fixed
 * below — importing/calling checkRole(['client']) instead of authorise('client').
 */

'use strict';

const express      = require('express');
const router       = express.Router();

const matchController = require('../controllers/match.controller');
const { protect }     = require('../middleware/authMiddleware');
const { checkRole }   = require('../middleware/roleMiddleware'); // ✅ FIXED import name

/* ─────────────────────────────────────────────
   All matching routes require a valid JWT.
───────────────────────────────────────────── */
router.use(protect);

/* ─────────────────────────────────────────────
   GET /api/match/my-matches                         ✅ NEW
   Jobs ranked by fit for the logged-in freelancer.
───────────────────────────────────────────── */
router.get(
  '/my-matches',
  checkRole(['freelancer']),
  matchController.getMyMatches,
);

/* ─────────────────────────────────────────────
   POST /api/match/job/:jobId
   Trigger full pipeline matching for a specific job posting.
───────────────────────────────────────────── */
router.post(
  '/job/:jobId',
  checkRole(['client', 'admin']), // ✅ FIXED: was authorise('client', 'admin')
  matchController.matchForJob,
);

/* ─────────────────────────────────────────────
   GET /api/match/job/:jobId/results
───────────────────────────────────────────── */
router.get(
  '/job/:jobId/results',
  checkRole(['client', 'admin']),
  matchController.getCachedResults,
);

/* ─────────────────────────────────────────────
   POST /api/match/custom
───────────────────────────────────────────── */
router.post(
  '/custom',
  checkRole(['client', 'admin']),
  matchController.matchCustom,
);

/* ─────────────────────────────────────────────
   GET /api/match/freelancer/:freelancerId/score
───────────────────────────────────────────── */
router.get(
  '/freelancer/:freelancerId/score',
  checkRole(['client', 'admin']),
  matchController.scoreFreelancer,
);

/* ─────────────────────────────────────────────
   DELETE /api/match/cache
───────────────────────────────────────────── */
router.delete(
  '/cache',
  checkRole(['admin']),
  matchController.clearCache,
);

module.exports = router;