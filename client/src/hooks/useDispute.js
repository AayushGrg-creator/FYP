import { useState, useCallback, useRef, useEffect } from 'react';
import {
  submitDispute as submitDisputeRequest,
  getDisputeReport as getDisputeReportRequest,
  acceptDisputeResolution as acceptDisputeResolutionRequest,
} from '../services/disputeService';

/**
 * useDispute Custom Hook
 * Path: client/src/hooks/useDispute.js
 *
 * Handles submitting a dispute, fetching its generated report, and
 * accepting the suggested resolution. Uses the shared `api.js` instance
 * (cookie-based auth), matching the pattern that actually authenticates
 * against authMiddleware's protect() — NOT the raw axios+localStorage
 * pattern used in useReputation.js.
 */
export function useDispute() {
  const [dispute, setDispute] = useState(null);
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
   * submitDispute
   * Files a new dispute against a project/milestone.
   */
  const submitDispute = useCallback(async ({ projectId, milestoneId, reason, description, evidence }) => {
    setLoading(true);
    setError(null);
    try {
      const data = await submitDisputeRequest({ projectId, milestoneId, reason, description, evidence });
      if (isMountedRef.current) setDispute(data);
      return data;
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.response?.data?.message || 'Failed to submit dispute.');
      }
      throw err;
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  /**
   * fetchReport
   * Retrieves (and lazily triggers generation of) the dispute's report.
   */
  const fetchReport = useCallback(async (disputeId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDisputeReportRequest(disputeId);
      if (isMountedRef.current) setDispute(data);
      return data;
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.response?.data?.message || 'Failed to retrieve dispute report.');
      }
      throw err;
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  /**
   * acceptResolution
   * Records the current user's acceptance of the suggested resolution.
   * Once both parties have accepted, the backend resolves the dispute
   * and releases/refunds/splits the milestone automatically.
   */
  const acceptResolution = useCallback(async (disputeId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await acceptDisputeResolutionRequest(disputeId);
      if (isMountedRef.current) setDispute(data);
      return data;
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.response?.data?.message || 'Failed to accept resolution.');
      }
      throw err;
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  return {
    dispute,
    loading,
    error,
    submitDispute,
    fetchReport,
    acceptResolution,
    setDispute,
  };
}