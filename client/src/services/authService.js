// src/services/authService.js
// Frontend auth service — cookie-based sessions (httpOnly tt_session cookie).
// Method names match AuthContext.jsx exactly: register, login, googleAuth, getMe, logout

const API_URL = '/api/auth';

export class AuthError extends Error {
  constructor(message, status, fieldErrors = null) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
    this.fieldErrors = fieldErrors; // express-validator's errors array, when present
  }
}

async function _request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    credentials: 'include', // sends/receives the httpOnly tt_session cookie
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new AuthError(
      data.message || 'Something went wrong. Please try again.',
      res.status,
      data.errors || null
    );
  }

  return data;
}

/**
 * register
 * @param {{ name: string, email: string, password: string, role: 'client'|'freelancer' }} formData
 */
async function register(formData) {
  return _request('/register', {
    method: 'POST',
    body: JSON.stringify(formData),
  });
}

/**
 * login
 * @param {{ email: string, password: string }} credentials
 */
async function login(credentials) {
  return _request('/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

/**
 * googleAuth
 * @param {{ credential: string, isSignUp?: boolean, role?: string }} params
 */
async function googleAuth({ credential, isSignUp = false, role } = {}) {
  return _request('/google', {
    method: 'POST',
    body: JSON.stringify({ credential, isSignUp, role }),
  });
}

/**
 * getMe
 * Restores session on app mount by validating the tt_session cookie.
 * Throws AuthError on 401/403 — AuthContext.jsx catches this and sets user to null.
 */
async function getMe() {
  return _request('/session', { method: 'GET' });
}

/**
 * logout
 * Tells the server to clear the tt_session cookie.
 */
async function logout() {
  return _request('/logout', { method: 'POST' });
}

const authService = { register, login, googleAuth, getMe, logout, AuthError };
export default authService;