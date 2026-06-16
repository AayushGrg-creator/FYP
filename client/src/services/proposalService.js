import api from './api';

/**
 * TaskTide Proposal & Bidding Service
 * Path: client/src/services/proposalService.js
 * * Manages the bid lifecycle: from draft creation and submission 
 * to interview invitation and offer acceptance.
 */
export const proposalService = {
  /**
   * Fetch proposals with filtering (status, job scope, etc.)
   * @param {Object} params - { status, jobId, freelancerId }
   */
  getAll: (params = {}) => api.get('/proposals', { params }),

  /**
   * Retrieve detailed proposal metadata including interview context
   * @param {string} id 
   */
  getById: (id) => api.get(`/proposals/${id}`),

  /**
   * Submit a new bid for a job
   * @param {Object} proposalData 
   */
  create: (proposalData) => api.post('/proposals', proposalData),

  /**
   * Modify existing proposal details (e.g., update bid amount or cover letter)
   * @param {string} id 
   * @param {Object} proposalData 
   */
  update: (id, proposalData) => api.patch(`/proposals/${id}`, proposalData),

  /**
   * Transition proposal status (e.g., withdraw, accept)
   * @param {string} id 
   * @param {string} status 
   */
  updateStatus: (id, status) => api.patch(`/proposals/${id}/status`, { status }),

  /**
   * Fetch proposals specifically for a single job (Client-side view)
   */
  getByJob: (jobId) => api.get(`/proposals/job/${jobId}`),
};

export default proposalService;