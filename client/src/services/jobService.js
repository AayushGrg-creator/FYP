import api from './api';

/**
 * TaskTide Job Management Service
 * Path: client/src/services/jobService.js
 *
 * Standardizes the data retrieval and mutation pipelines for the marketplace
 * job board infrastructure.
 */
export const jobService = {
  getAll: (params = {}) => api.get('/jobs', { params }),
  getById: (id) => api.get(`/jobs/${id}`),
  getMy: (params = {}) => api.get('/jobs/my', { params }),
  create: (jobData) => api.post('/jobs', jobData),
  update: (id, jobData) => api.put(`/jobs/${id}`, jobData),
  delete: (id) => api.delete(`/jobs/${id}`),
  // NOTE: proposal submission lives in proposalService.js (POST /api/proposals),
  // not here — proposals are a top-level resource, not nested under jobs.
};

// ── Named export wrappers (used by ClientDashboard.jsx) ─────────────────────
export const getMyJobs       = (params = {}) => jobService.getMy(params);
export const updateJobStatus = (id, status)  => jobService.update(id, { status });

export default jobService;