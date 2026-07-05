import api from './api';

/**
 * TaskTide Project Service
 * Path: client/src/services/projectService.js
 *
 * Calls the /api/projects endpoints (project.controller.js /
 * project.routes.js) that were built to unblock the workspace page.
 */
export const projectService = {
  /**
   * List all projects the logged-in user is part of (client or freelancer side)
   * @param {Object} params - { status }
   */
  getMine: (params = {}) => api.get('/projects/mine', { params }),

  /**
   * Fetch full detail for a single project
   * @param {string} projectId
   */
  getById: (projectId) => api.get(`/projects/${projectId}`),
};

export default projectService;