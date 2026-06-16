import api from './api';

/**
 * TaskTide Job Management Service
 * Path: client/src/services/jobService.js
 * * Standardizes the data retrieval and mutation pipelines for the marketplace 
 * job board infrastructure.
 */
export const jobService = {
  /**
   * Fetch paginated list of jobs with optional search filters
   * @param {Object} params - Query parameters (page, status, skills, q)
   */
  getAll: (params = {}) => api.get('/jobs', { params }),

  /**
   * Retrieve specific job metadata
   * @param {string} id - Target job document ID
   */
  getById: (id) => api.get(`/jobs/${id}`),

  /**
   * Submit new job posting
   * @param {Object} jobData - Validated job schema payload
   */
  create: (jobData) => api.post('/jobs', jobData),

  /**
   * Update existing job document
   * @param {string} id - Target job document ID
   * @param {Object} jobData - Delta payload for update
   */
  update: (id, jobData) => api.put(`/jobs/${id}`, jobData),

  /**
   * Remove job listing
   * @param {string} id - Target job document ID
   */
  delete: (id) => api.delete(`/jobs/${id}`),

  /**
   * Submit a bid/proposal for a specific job
   * @param {string} jobId 
   * @param {Object} proposalData 
   */
  submitProposal: (jobId, proposalData) => 
    api.post(`/jobs/${jobId}/proposals`, proposalData),
};

export default jobService;