import { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

/**
 * useMatch Custom Hook
 * Path: client/src/hooks/useMatch.js
 * * Manages the real-time query interface with the Task Tide AI matchmaking engine.
 * Implements local memory caching, pagination state metrics, and sorting pipelines.
 */
export function useMatch() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, totalResults: 0 });
  
  // Local volatile in-memory storage to prevent duplicated API calls on identical queries
  const cacheRef = useRef({});
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * fetchRecommendations
   * Programmatically calls the backend neural matching vector endpoints.
   * * @param {object} params - Query filters
   * @param {number} params.page - Target pagination index page
   * @param {string} params.skillFilter - Optional comma-separated skill tag targets
   * @param {boolean} forceRefresh - If true, completely bypasses the local memory cache
   */
  const fetchRecommendations = useCallback(async (params = {}, forceRefresh = false) => {
    const { page = 1, skillFilter = '' } = params;
    const cacheKey = `page_${page}_skills_${skillFilter}`;

    // Read immediately from the volatile cache map if available to reduce backend network load
    if (!forceRefresh && cacheRef.current[cacheKey]) {
      const cachedData = cacheRef.current[cacheKey];
      setMatches(cachedData.results);
      setPagination(cachedData.pagination);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Secure authorization token retrieval from local application storage vectors
      const token = localStorage.getItem('tt_token');
      
      const response = await axios.get(`${API_BASE_URL}/match/recommendations`, {
        params: { page, limit: 10, skills: skillFilter },
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
        }
      });

      const { success, data, meta } = response.data;

      if (success && isMountedRef.current) {
        // Expected format: data = Array of matches, meta = { page, totalPages, count }
        const results = data || [];
        const paginationData = {
          currentPage: meta?.page || page,
          totalPages: meta?.totalPages || 1,
          totalResults: meta?.count || 0
        };

        // Commit records securely to local thread memory storage
        cacheRef.current[cacheKey] = { results, pagination: paginationData };

        setMatches(results);
        setPagination(paginationData);
      }
    } catch (err) {
      console.error('AI Recommendations Pipeline execution exception encountered:', err);
      if (isMountedRef.current) {
        setError(err.response?.data?.message || 'Failed to sync with the match engine optimization nodes.');
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * clearCache
   * Flushes local storage buffers instantly to force live backend syncs.
   */
  const clearCache = useCallback(() => {
    cacheRef.current = {};
  }, []);

  return {
    matches,
    loading,
    error,
    pagination,
    fetchRecommendations,
    clearCache,
    setMatches // Kept for edge-case layout mutations or optimistic updates
  };
}