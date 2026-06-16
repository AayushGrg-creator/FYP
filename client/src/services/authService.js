import api from './api';

/**
 * TaskTide Authentication Service
 * Path: client/src/services/authService.js
 *
 * Centralizes identity management, token persistence, and session lifecycle hooks.
 * Leverages the global api interceptor for standardized request/response handling.
 */

// Helper to update local persistence layer cleanly
const _setSession = (data) => {
  if (data.token) localStorage.setItem('tt_token', data.token);
  if (data.user)  localStorage.setItem('tt_user', JSON.stringify(data.user));
};

const authService = {

  /**
   * Google OAuth — sign-up or sign-in
   * @param {{ credential: string, isSignUp: boolean, role?: string }} data
   */
  googleAuth: async ({ credential, isSignUp = false, role }) => {
    const res = await api.post('/auth/google', { credential, isSignUp, role });
    _setSession(res);
    return res;
  },

  /**
   * Fetch the currently authenticated user from server
   */
  getMe: async () => {
    return await api.get('/auth/session');
  },

  /**
   * Logout — clears local state and initiates server-side session termination
   */
  logout: async () => {
    try {
      await api.post('/auth/logout');
    } catch (err) {
      console.warn('Logout: Server-side termination failed, proceeding with local clear.');
    } finally {
      localStorage.removeItem('tt_token');
      localStorage.removeItem('tt_user');
    }
  },

  /**
   * Get cached user from localStorage (sync)
   */
  getCachedUser: () => {
    try {
      const raw = localStorage.getItem('tt_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  /**
   * register and login are kept as stubs so nothing else in the codebase breaks.
   * They are not used — all auth flows go through googleAuth.
   */
  register: async () => {
    throw new Error('Email/password registration is not supported. Please use Google sign-in.');
  },

  login: async () => {
    throw new Error('Email/password login is not supported. Please use Google sign-in.');
  },

};

export default authService;