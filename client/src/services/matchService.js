import api from './api';

/**
 * TaskTide Matchmaking Service
 * Path: client/src/services/matchService.js
 *
 * ✅ FIXED: every call in this file previously pointed to `/matches/...`,
 * but the backend router is mounted at `/api/match` (singular) in app.js —
 * every request here would have 404'd. Paths corrected below. Also added
 * getMyMatches(), which didn't exist before, to call the new
 * GET /api/match/my-matches endpoint that powers the freelancer dashboard.
 */
export const matchService = {
  /**
   * Fetch recommended freelancers for a specific job (Client view)
   * @param {string} jobId
   * @param {Object} body - { topN, minTrustScore, maxHourlyRate, location, forceRefresh }
   */
  getMatches: (jobId, body = {}) =>
    api.post(`/match/job/${jobId}`, body),

  /**
   * Fetch cached results for a job (Client view)
   * @param {string} jobId
   */
  getCachedResults: (jobId) =>
    api.get(`/match/job/${jobId}/results`),

  /**
   * Fetch jobs matched to the logged-in freelancer (Freelancer view)
   * @param {Object} params - { topN }
   */
  getMyMatches: (params = {}) =>
    api.get('/match/my-matches', { params }),

  /**
   * Ad-hoc match preview before formally posting a job (Client view)
   * @param {Object} body - { description, skills[], topN, minTrustScore, maxHourlyRate, location }
   */
  matchCustom: (body) =>
    api.post('/match/custom', body),

  /**
   * Score a single freelancer against a job description/skills
   * @param {string} freelancerId
   * @param {Object} params - { description, skills }
   */
  scoreFreelancer: (freelancerId, params = {}) =>
    api.get(`/match/freelancer/${freelancerId}/score`, { params }),
};

export default matchService;