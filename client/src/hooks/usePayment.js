import { useState, useCallback, useRef, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

/**
 * usePayment Custom Hook
 * Path: client/src/hooks/usePayment.js
 * * Coordinates financial transaction pipelines, escrow milestone funding, 
 * and user payout history for the marketplace platform.
 */
export function usePayment() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ── Fetch Transaction History Registry ──
  const fetchPaymentHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('tt_token');
      const response = await axios.get(`${API_BASE_URL}/payments/history`, {
        headers: { Authorization: token ? `Bearer ${token}` : '' }
      });
      
      if (isMountedRef.current) {
        setPayments(response.data.data || []);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.response?.data?.message || 'Failed to retrieve transaction registry.');
      }
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  // ── Escrow Milestone Funding Pipeline ──
  const fundMilestone = useCallback(async (milestoneId, amount) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('tt_token');
      const response = await axios.post(`${API_BASE_URL}/payments/escrow/fund`, 
        { milestoneId, amount },
        { headers: { Authorization: token ? `Bearer ${token}` : '' } }
      );
      
      // Refresh list post-mutation to maintain data integrity with the database truth
      await fetchPaymentHistory();
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Escrow funding request denied.';
      if (isMountedRef.current) setError(msg);
      throw new Error(msg);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [fetchPaymentHistory]);

  // ── Freelancer Payout Release Hook ──
  const releasePayment = useCallback(async (milestoneId) => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('tt_token');
      await axios.post(`${API_BASE_URL}/payments/escrow/release`, 
        { milestoneId },
        { headers: { Authorization: token ? `Bearer ${token}` : '' } }
      );
      await fetchPaymentHistory();
    } catch (err) {
      const msg = err.response?.data?.message || 'Payout release authorized failure.';
      if (isMountedRef.current) setError(msg);
      throw new Error(msg);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [fetchPaymentHistory]);

  return {
    payments,
    loading,
    error,
    fetchPaymentHistory,
    fundMilestone,
    releasePayment
  };
}