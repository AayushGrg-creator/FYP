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
  const [user, setUser] = useState(() => {
    return authService.getCachedUser() || null;
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    
    const restoreSession = async () => {
      const token = localStorage.getItem('tt_token');
      const cached = authService.getCachedUser();

      if (!token || !cached) {
        if (isMountedRef.current) setLoading(false);
        return;
      }

      try {
        const fresh = await authService.getMe();
        const freshUser = fresh.user ?? fresh;
        
        if (isMountedRef.current) {
          setUser(freshUser);
          localStorage.setItem('tt_user', JSON.stringify(freshUser));
        }
      } catch (err) {
        console.error('Session expiration or token verification failure:', err);
        if (isMountedRef.current) {
          authService.logout();
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
      if (isMountedRef.current) {
        setUser(data.user ?? data);
      }
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration routine failed.';
      if (isMountedRef.current) setError(msg);
      throw new Error(msg);
    }
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(async (credentials) => {
    setError(null);
    try {
      const data = await authService.login(credentials);
      if (isMountedRef.current) {
        setUser(data.user ?? data);
      }
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Authentication sequence failed.';
      if (isMountedRef.current) setError(msg);
      throw new Error(msg);
    }
  }, []);

  // ── Google Auth (FIXED) ────────────────────────────────────────────────────
  // Now accepts { credential, isSignUp, role } instead of a raw token string
  const googleLogin = useCallback(async ({ credential, isSignUp = false, role } = {}) => {
    setError(null);
    try {
      const data = await authService.googleAuth({ credential, isSignUp, role });
      if (isMountedRef.current) {
        setUser(data.user ?? data);
        // Cache user locally so session restores on page refresh
        localStorage.setItem('tt_user', JSON.stringify(data.user ?? data));
        if (data.token) {
          localStorage.setItem('tt_token', data.token);
        }
      }
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'OAuth identity validation failed.';
      if (isMountedRef.current) setError(msg);
      throw new Error(msg);
    }
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    authService.logout();
    if (isMountedRef.current) {
      setUser(null);
      setError(null);
    }
  }, []);

  // ── Update User ────────────────────────────────────────────────────────────
  const updateUser = useCallback((updated) => {
    if (!updated) return;
    if (isMountedRef.current) {
      setUser(updated);
      localStorage.setItem('tt_user', JSON.stringify(updated));
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