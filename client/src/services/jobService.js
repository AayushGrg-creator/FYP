import api from './api';

/**
 * TaskTide Job Management Service
 * Path: client/src/services/jobService.js
 * * Standardizes the data retrieval and mutation pipelines for the marketplace 
 * job board infrastructure.
 */
export const jobService = {
  getAll: (params = {}) => api.get('/jobs', { params }),
  getById: (id) => api.get(`/jobs/${id}`),
  getMy: (params = {}) => api.get('/jobs/my', { params }),   // ← add this line
  create: (jobData) => api.post('/jobs', jobData),
  update: (id, jobData) => api.put(`/jobs/${id}`, jobData),
  delete: (id) => api.delete(`/jobs/${id}`),
  submitProposal: (jobId, proposalData) =>
    api.post(`/jobs/${jobId}/proposals`, proposalData),
};
// ── Named export wrappers (used by ClientDashboard.jsx) ─────────────────────
export const getMyJobs        = (params = {}) => jobService.getAll(params); // placeholder, replaced below
export const updateJobStatus  = (id, status)   => jobService.update(id, { status });
export default jobService;