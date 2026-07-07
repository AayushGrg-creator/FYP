/**
 * client/src/services/reviewService.js
 *
 * Client/freelancer rating system.
 * Uses the shared `api.js` instance (cookie-auth via tt_session),
 * matching the pattern established in disputeService.js — NOT raw axios
 * + localStorage.
 */
import api from './api';

const reviewService = {
  // Submit a rating for a completed (released/resolved) milestone.
  submit: (milestoneId, rating, comment) =>
    api.post('/reviews', { milestoneId, rating, comment }),

  // Freelancer's own aggregated rating — used by FreelancerDashboard.jsx.
  getMySummary: () => api.get('/reviews/my-summary'),

  // All reviews already left on a project — used to know which milestones
  // already have a "Rate Freelancer" button hidden.
  getByProject: (projectId) => api.get(`/reviews/by-project/${projectId}`),

  getByMilestone: (milestoneId) => api.get(`/reviews/by-milestone/${milestoneId}`),
};

export default reviewService;