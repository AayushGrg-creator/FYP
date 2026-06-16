import { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

/**
 * useProfile Custom Hook
 * Path: client/src/hooks/useProfile.js
 * * Manages the global state of the user's professional profile document.
 * Coordinates data retrieval, field mutations, and backend synchronization.
 */
export function useProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ── Fetch Profile Payload ──
  const fetchProfile = useCallback(async (userId) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('tt_token');
      const url = userId ? `${API_BASE_URL}/profile/${userId}` : `${API_BASE_URL}/profile/me`;
      
      const response = await axios.get(url, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });

      if (isMountedRef.current) {
        setProfile(response.data.data);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.response?.data?.message || 'Failed to retrieve profile data.');
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  // ── Patch Profile Mutation Pipeline ──
  const updateProfile = useCallback(async (updateData) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('tt_token');
      const response = await axios.patch(`${API_BASE_URL}/profile/me`, updateData, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });

      if (isMountedRef.current) {
        // Optimistically update local state with returned backend document
        setProfile(response.data.data);
      }
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Profile mutation rejected by backend.';
      if (isMountedRef.current) setError(msg);
      throw new Error(msg);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  return {
    profile,
    loading,
    error,
    fetchProfile,
    updateProfile,
    setProfile // Exported for fine-grained local-only state adjustments
  };
}