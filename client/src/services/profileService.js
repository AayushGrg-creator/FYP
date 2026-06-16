import api from './api';

/**
 * TaskTide Profile Management Service
 * Path: client/src/services/profileService.js
 * * Manages professional identity synchronization, skill matrices, 
 * and portfolio document uploads.
 */
export const profileService = {
  /**
   * Fetch current user's profile metadata
   */
  getMe: () => api.get('/profile/me'),

  /**
   * Fetch public profile for a specific user
   * @param {string} userId 
   */
  getById: (userId) => api.get(`/profile/${userId}`),

  /**
   * Update core profile fields (bio, title, hourly rate)
   * @param {Object} profileData 
   */
  update: (profileData) => api.patch('/profile/me', profileData),

  /**
   * Update skill tags array
   * @param {string[]} skills 
   */
  updateSkills: (skills) => api.patch('/profile/me/skills', { skills }),

  /**
   * Upload portfolio attachment or profile avatar
   * @param {FormData} fileData 
   */
  uploadMedia: (fileData) => 
    api.post('/profile/me/media', fileData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export default profileService;