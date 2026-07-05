import api from './api';

/**
 * TaskTide Milestone Service
 * Path: client/src/services/milestoneService.js
 */
const milestoneService = {
  create: (data) => api.post('/milestones', data),
  listForProject: (projectId) => api.get(`/milestones/project/${projectId}`),
  fund: (id) => api.patch(`/milestones/${id}/fund`),
  confirmPayment: (id, pidx) => api.patch(`/milestones/${id}/confirm-payment`, { pidx }),
  submit: (id, { deliverableUrl, notes }) => api.patch(`/milestones/${id}/submit`, { deliverableUrl, notes }),
  approve: (id) => api.patch(`/milestones/${id}/approve`),
  dispute: (id, reason) => api.patch(`/milestones/${id}/dispute`, { reason }),
  cancel: (id) => api.patch(`/milestones/${id}/cancel`),
  delete: (id) => api.delete(`/milestones/${id}`),
};

export default milestoneService;