/**
 * match.controller.js
 * HTTP handlers for the Task Tide Smart-Matching Engine.
 *
 * Routes consumed by match.routes.js:
 *   POST /api/match/job/:jobId          – run matching for a specific job (client)
 *   GET  /api/match/job/:jobId/results  – retrieve cached results for a job (client)
 *   POST /api/match/custom              – ad-hoc match from raw description text (client)
 *   GET  /api/match/my-matches          – jobs matched to the logged-in freelancer  ✅ NEW
 *   GET  /api/match/freelancer/:id/score – score one freelancer vs. a query (client)
 *   DELETE /api/match/cache             – clear cache (admin)
 *
 * ✅ FIXED: job.clientId -> job.client, job.skills -> job.skillsRequired
 * (these field names never existed on the Job schema — every call to
 * matchForJob would have thrown "Cannot read properties of undefined").
 */

'use strict';

const Job               = require('../models/Job');
const FreelancerProfile = require('../models/FreelancerProfile');
const matchService      = require('../services/match.service');
const logger            = require('../config/logger');

/* ─────────────────────────────────────────────
   Simple in-process result cache (24 h TTL).
   For production, swap for Redis via notification.service.
───────────────────────────────────────────── */
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const resultCache  = new Map(); // key → { results, expiresAt }

function setCached(key, results) {
  resultCache.set(key, { results, expiresAt: Date.now() + CACHE_TTL_MS });
}

function getCached(key) {
  const entry = resultCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) { resultCache.delete(key); return null; }
  return entry.results;
}

/* ─────────────────────────────────────────────
   POST /api/match/job/:jobId
   Body (optional): { topN, minTrustScore, maxHourlyRate, location, forceRefresh }
   Auth: client only (job owner)
───────────────────────────────────────────── */
async function matchForJob(req, res) {
  try {
    const { jobId } = req.params;
    const {
      topN          = 10,
      minTrustScore,
      maxHourlyRate,
      location,
      forceRefresh  = false,
    } = req.body || {};

    const job = await Job.findById(jobId).lean();
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    // ✅ FIXED: schema field is "client", not "clientId"
    if (job.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorised to run matching for this job.',
      });
    }

    const cacheKey = `job:${jobId}:${JSON.stringify({ topN, minTrustScore, maxHourlyRate, location })}`;
    if (!forceRefresh) {
      const cached = getCached(cacheKey);
      if (cached) {
        return res.status(200).json({ success: true, fromCache: true, count: cached.length, results: cached });
      }
    }

    const filters = {};
    if (minTrustScore !== undefined) filters.minTrustScore = Number(minTrustScore);
    if (maxHourlyRate !== undefined) filters.maxHourlyRate = Number(maxHourlyRate);
    if (location)                    filters.location      = location;

    // ✅ FIXED: schema field is "skillsRequired", not "skills"
    const results = await matchService.getMatchesForJob(
      job.description    || '',
      job.skillsRequired || [],
      filters,
      Math.min(Number(topN) || 10, 50),
    );

    setCached(cacheKey, results);
    logger.info(`match.controller: job ${jobId} → ${results.length} candidates returned`);

    return res.status(200).json({ success: true, fromCache: false, count: results.length, results });
  } catch (err) {
    logger.error('match.controller.matchForJob error:', err);
    return res.status(500).json({ success: false, message: 'Matching failed. Please try again.' });
  }
}

/* ─────────────────────────────────────────────
   POST /api/match/custom
   Body: { description, skills[], topN, minTrustScore, maxHourlyRate, location }
   Auth: client or admin
───────────────────────────────────────────── */
async function matchCustom(req, res) {
  try {
    const {
      description   = '',
      skills        = [],
      topN          = 10,
      minTrustScore,
      maxHourlyRate,
      location,
    } = req.body || {};

    if (!description.trim() && skills.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a job description or at least one skill.',
      });
    }

    const filters = {};
    if (minTrustScore !== undefined) filters.minTrustScore = Number(minTrustScore);
    if (maxHourlyRate !== undefined) filters.maxHourlyRate = Number(maxHourlyRate);
    if (location)                    filters.location      = location;

    const results = await matchService.getMatchesForJob(
      description,
      Array.isArray(skills) ? skills : [],
      filters,
      Math.min(Number(topN) || 10, 50),
    );

    logger.info(`match.controller.matchCustom: ${results.length} candidates returned`);
    return res.status(200).json({ success: true, count: results.length, results });
  } catch (err) {
    logger.error('match.controller.matchCustom error:', err);
    return res.status(500).json({ success: false, message: 'Custom matching failed.' });
  }
}

/* ─────────────────────────────────────────────
   GET /api/match/my-matches                         ✅ NEW
   Returns open jobs ranked by fit for the logged-in freelancer.
   Powers FreelancerDashboard.jsx's "Top Job Matches" section.
   Auth: freelancer only
───────────────────────────────────────────── */
async function getMyMatches(req, res) {
  try {
    const { topN = 10 } = req.query;

    const profile = await FreelancerProfile.findOne({ userId: req.user._id }).lean();
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Complete your profile before viewing job matches.',
      });
    }

    const results = await matchService.getMatchesForFreelancer(
      profile._id,
      Math.min(Number(topN) || 10, 50),
    );

    if (results === null) {
      return res.status(404).json({ success: false, message: 'Freelancer profile not found.' });
    }

    logger.info(`match.controller.getMyMatches: user ${req.user._id} → ${results.length} jobs returned`);
    return res.status(200).json({ success: true, count: results.length, results });
  } catch (err) {
    logger.error('match.controller.getMyMatches error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load job matches.' });
  }
}

/* ─────────────────────────────────────────────
   GET /api/match/job/:jobId/results
   Returns cached results if present, 404 if not yet run.
   Auth: client only
───────────────────────────────────────────── */
async function getCachedResults(req, res) {
  try {
    const { jobId } = req.params;

    const job = await Job.findById(jobId).lean();
    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found.' });
    }

    // ✅ FIXED: schema field is "client", not "clientId"
    if (job.client.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorised.' });
    }

    const prefix = `job:${jobId}:`;
    let found = null;
    for (const [key, entry] of resultCache) {
      if (key.startsWith(prefix) && Date.now() <= entry.expiresAt) {
        found = entry.results;
        break;
      }
    }

    if (!found) {
      return res.status(404).json({
        success: false,
        message: 'No cached match results found. Please run matching first.',
      });
    }

    return res.status(200).json({ success: true, count: found.length, results: found });
  } catch (err) {
    logger.error('match.controller.getCachedResults error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve results.' });
  }
}

/* ─────────────────────────────────────────────
   GET /api/match/freelancer/:freelancerId/score
   Body/Query: { description, skills[] }
   Auth: client or admin
───────────────────────────────────────────── */
async function scoreFreelancer(req, res) {
  try {
    const { freelancerId } = req.params;
    const description = req.query.description || req.body?.description || '';
    const skills       = req.query.skills      || req.body?.skills      || [];

    if (!description && (!skills || skills.length === 0)) {
      return res.status(400).json({ success: false, message: 'Description or skills required.' });
    }

    const result = await matchService.scoreFreelancerAgainstJob(
      freelancerId,
      description,
      Array.isArray(skills) ? skills : [skills],
    );

    if (!result) {
      return res.status(404).json({ success: false, message: 'Freelancer profile not found.' });
    }

    return res.status(200).json({ success: true, ...result });
  } catch (err) {
    logger.error('match.controller.scoreFreelancer error:', err);
    return res.status(500).json({ success: false, message: 'Scoring failed.' });
  }
}

/* ─────────────────────────────────────────────
   Admin: DELETE /api/match/cache
───────────────────────────────────────────── */
async function clearCache(req, res) {
  try {
    const size = resultCache.size;
    resultCache.clear();
    logger.info(`match.controller: cache cleared (${size} entries)`);
    return res.status(200).json({ success: true, message: `Cache cleared (${size} entries removed).` });
  } catch (err) {
    logger.error('match.controller.clearCache error:', err);
    return res.status(500).json({ success: false, message: 'Cache clear failed.' });
  }
}

module.exports = {
  matchForJob,
  matchCustom,
  getMyMatches,
  getCachedResults,
  scoreFreelancer,
  clearCache,
};