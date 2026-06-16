import api from './api';

/**
 * TaskTide Reputation & Trust Service
 * Path: client/src/services/reputationService.js
 * * Synchronizes freelancer and client trust scores, feedback aggregates, 
 * and historical performance metrics.
 */
export const reputationService = {
  /**
   * Fetch aggregate reputation profile including score and badge levels
   * @param {string} userId - Target identity
   */
  getReputation: (userId) => api.get(`/reputation/${userId}`),

  /**
   * Fetch granular trust scoring metrics (e.g., job completion rate, reliability)
   * @param {string} userId 
   */
  getTrustScore: (userId) => api.get(`/reputation/${userId}/trust-score`),

  /**
   * Fetch historical trend data for performance visualization
   * @param {string} userId 
   * @param {Object} params - Timeframe filters (range, interval)
   */
  getPerformanceTrend: (userId, params = {}) => 
    api.get(`/reputation/${userId}/trends`, { params }),

  /**
   * Fetch public feedback and client testimonials
   * @param {string} userId 
   * @param {Object} params - Pagination params
   */
  getFeedback: (userId, params = {}) => 
    api.get(`/reputation/${userId}/feedback`, { params }),
};

export default reputationService;