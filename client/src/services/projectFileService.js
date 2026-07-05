import api from './api';

/**
 * TaskTide Project File Service
 * Path: client/src/services/projectFileService.js
 *
 * Handles upload/list/delete for project deliverable files, stored on
 * Cloudinary via the server's projectFileUpload middleware.
 */
const projectFileService = {
  /**
   * @param {string} projectId
   * @param {File} file - a browser File object (e.g. from an <input type="file">)
   */
  upload: (projectId, file) => {
    const form = new FormData();
    form.append('file', file); // must match multer's .single('file') field name
    return api.post(`/projects/${projectId}/files`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  list: (projectId) => api.get(`/projects/${projectId}/files`),

  delete: (projectId, fileId) => api.delete(`/projects/${projectId}/files/${fileId}`),
};

export default projectFileService;