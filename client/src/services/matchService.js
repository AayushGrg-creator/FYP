import api from './api';

/**
 * TaskTide Matchmaking Service
 * Path: client/src/services/matchService.js
 * * Manages the data pipeline between the frontend dashboard and the
 * backend AI recommendation engine and freelance matching vectors.
 */
export const matchService = {
  /**
   * Fetch recommendations for a specific job (Client view)
   * @param {string} jobId - The job to match freelancers against
   * @param {Object} params - Filtering params (page, limit, skill_threshold)
   */
  getMatches: (jobId, params = {}) => 
    api.get(`/matches/${jobId}`, { params }),

  /**
   * Fetch relevant jobs for the logged-in freelancer (Freelancer view)
   * @param {Object} params - Query parameters for sorting and pagination
   */
  getFreelancerMatches: (params = {}) => 
    api.get('/matches/freelancer', { params }),

  /**
   * Retrieve specific match analysis/scoring breakdown
   * @param {string} jobId 
   * @param {string} freelancerId 
   */
  getMatchDetail: (jobId, freelancerId) => 
    api.get(`/matches/${jobId}/freelancer/${freelancerId}`),
};

export default matchService;