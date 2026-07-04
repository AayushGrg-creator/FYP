import api from './api';

/**
 * TaskTide Profile Management Service
 * Path: client/src/services/profileService.js
 *
 * Manages professional identity synchronization, skill matrices,
 * and avatar uploads.
 */
export const profileService = {
  /**
   * Fetch current user's profile metadata
   */
  getMe: () => api.get('/profile/me'),

  /**
   * Fetch public profile for a specific user
   * @param {string} userId
   * @param {'client'|'freelancer'} role
   */
  getById: (userId, role) => api.get(`/profile/${userId}?role=${role}`),

  /**
   * Update profile fields (bio, hourlyRate, skills, portfolio, location
   * for freelancers; companyName, industryType, location for clients)
   * @param {Object} profileData
   */
  update: (profileData) => api.put('/profile/me', profileData),

  /**
   * Upload/update avatar image
   * @param {FormData} fileData - must contain a field named 'avatar'
   */
  uploadAvatar: (fileData) =>
    api.post('/profile/me/avatar', fileData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export default profileService;