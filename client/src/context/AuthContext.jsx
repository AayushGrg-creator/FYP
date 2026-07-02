import React, { createContext, useState, useEffect, useCallback, useContext, useRef } from 'react';
import authService from '../services/authService';

export const AuthContext = createContext({
  user: null,
  loading: true,
  error: null,
  isAuthenticated: false,
  register: async () => {},
  login: async () => {},
  googleLogin: async () => {},
  logout: () => {},
  updateUser: () => {},
  clearError: () => {},
});

export function AuthProvider({ children }) {
  // No synchronous cache read — cookie is httpOnly, so JS can't peek at it
  // ahead of time. We start as null/loading and resolve via getMe() below.
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    const restoreSession = async () => {
      try {
        // getMe() sends the httpOnly tt_session cookie automatically
        // (credentials: 'include' in authService) — no token needed.
        const data = await authService.getMe();
        const freshUser = data.user ?? data;
        if (isMountedRef.current) {
          setUser(freshUser);
        }
      } catch (err) {
        // 401/403 here just means "not logged in" — not a real error
        if (isMountedRef.current) {
          setUser(null);
        }
      } finally {
        if (isMountedRef.current) setLoading(false);
      }
    };

    restoreSession();

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ── Register ───────────────────────────────────────────────────────────────
  const register = useCallback(async (formData) => {
    setError(null);
    try {
      const data = await authService.register(formData);
      const nextUser = data.user ?? data;
      if (isMountedRef.current) {
        setUser(nextUser);
      }
      return data;
    } catch (err) {
      const msg = err.message || 'Registration routine failed.';
      if (isMountedRef.current) setError(msg);
      throw new Error(msg);
    }
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (credentials) => {
    setError(null);
    try {
      const data = await authService.login(credentials);
      const nextUser = data.user ?? data;
      if (isMountedRef.current) {
        setUser(nextUser);
      }
      return data;
    } catch (err) {
      const msg = err.message || 'Authentication sequence failed.';
      if (isMountedRef.current) setError(msg);
      throw new Error(msg);
    }
  }, []);

  // ── Google Auth ────────────────────────────────────────────────────────────
  const googleLogin = useCallback(async ({ credential, isSignUp = false, role } = {}) => {
    setError(null);
    try {
      const data = await authService.googleAuth({ credential, isSignUp, role });
      const nextUser = data.user ?? data;
      if (isMountedRef.current) {
        setUser(nextUser);
      }
      return data;
    } catch (err) {
      const msg = err.message || 'OAuth identity validation failed.';
      if (isMountedRef.current) setError(msg);
      throw new Error(msg);
    }
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await authService.logout(); // tells the server to clear the tt_session cookie
    } catch (err) {
      // Clear local state regardless — user intent is to log out either way
      console.error('Logout request failed:', err);
    } finally {
      if (isMountedRef.current) {
        setUser(null);
        setError(null);
      }
    }
  }, []);

  // ── Update User ────────────────────────────────────────────────────────────
  const updateUser = useCallback((updated) => {
    if (!updated) return;
    if (isMountedRef.current) {
      setUser(updated);
    }
  }, []);

  // ── Clear Errors ───────────────────────────────────────────────────────────
  const clearError = useCallback(() => {
    if (isMountedRef.current) setError(null);
  }, []);

  const contextValue = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    register,
    login,
    googleLogin,
    logout,
    updateUser,
    clearError,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be consumed strictly inside an AuthProvider element hierarchy.');
  }
  return context;
}