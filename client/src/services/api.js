import axios from 'axios';

/**
 * TaskTide API Gateway Interface
 * Path: client/src/services/api.js
 * * Configures centralized axios instance with token injection, 
 * global 401 handling, and structural response normalization.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  withCredentials: true, // Enables cookie-based session management
  headers: { 'Content-Type': 'application/json' },
});

// ── Request Interceptor: Persistent Token Injection ──
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('tt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response Interceptor: Global Error Normalization ──
api.interceptors.response.use(
  (response) => {
    // Return the data directly to simplify component-level logic
    return response.data;
  },
  (error) => {
    // Global 401: Unauthorized sequence (Session Expiration)
    if (error.response?.status === 401) {
      localStorage.removeItem('tt_token');
      localStorage.removeItem('tt_user');
      
      // Redirect to login only if not already on the login page
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // Centralized Error Normalization: Standardizes errors into a clean { message } format
    const normalizedError = {
      ...error,
      message: error.response?.data?.message || 'A network communication error occurred.',
      status: error.response?.status
    };

    return Promise.reject(normalizedError);
  }
);

export default api;