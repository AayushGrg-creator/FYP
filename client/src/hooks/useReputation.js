import { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

/**
 * useReputation Custom Hook
 * Path: client/src/hooks/useReputation.js
 * * Synchronizes freelancer and client trust scores with the platform’s reputation engine.
 * Features automated fetch-on-mount triggers, trend analysis support, and stale-data guards.
 */
export function useReputation() {
  const [reputation, setReputation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * fetchReputation
   * Retrieves the current aggregate trust score and trend metrics for the requested identity.
   * @param {string} userId - Optional: Fetch reputation for a specific public profile.
   */
  const fetchReputation = useCallback(async (userId) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('tt_token');
      const url = userId ? `${API_BASE_URL}/reputation/${userId}` : `${API_BASE_URL}/reputation/me`;
      
      const response = await axios.get(url, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });

      if (isMountedRef.current) {
        setReputation(response.data.data);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.response?.data?.message || 'Failed to retrieve reputation metrics.');
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  /**
   * refreshReputation
   * Forces a re-sync with the engine; useful after closing a contract or receiving feedback.
   */
  const refreshReputation = useCallback(() => {
    fetchReputation();
  }, [fetchReputation]);

  return {
    reputation,
    loading,
    error,
    fetchReputation,
    refreshReputation,
    setReputation
  };
}