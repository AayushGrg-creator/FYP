import { useState, useCallback, useRef, useEffect } from 'react';
import api from '../services/api';

/**
 * usePayment
 * Path: client/src/hooks/usePayment.js
 *
 * Wraps wallet-level endpoints: balance, transaction history, withdraw.
 * Uses the shared `api` service (same one used everywhere else in the app),
 * which relies on the httpOnly `tt_session` cookie for auth -- NOT a
 * localStorage token. Manually attaching an Authorization header here
 * would silently fail, since httpOnly cookies are deliberately invisible
 * to JavaScript.
 *
 * Milestone funding/approval/dispute are NOT here -- those are handled
 * directly via milestoneService in the components that need them (see
 * ProjectWorkspacePage.jsx), since they act on a specific milestone, not
 * the user's wallet as a whole.
 */
export function usePayment() {
  const [balance, setBalance]           = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination]     = useState({ total: 0, page: 1, pages: 1 });
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const fetchBalance = useCallback(async () => {
    setError(null);
    try {
      const data = await api.get('/payments/balance');
      if (isMountedRef.current) setBalance(data.walletBalance || 0);
      return data.walletBalance || 0;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load wallet balance.';
      if (isMountedRef.current) setError(msg);
      throw new Error(msg);
    }
  }, []);

  const fetchTransactionHistory = useCallback(async (page = 1, limit = 20) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.get('/payments/transactions', { params: { page, limit } });
      if (isMountedRef.current) {
        setTransactions(data.data || []);
        setPagination(data.pagination || { total: 0, page: 1, pages: 1 });
      }
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load transaction history.';
      if (isMountedRef.current) setError(msg);
      throw new Error(msg);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, []);

  const withdraw = useCallback(async (amount) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.post('/payments/withdraw', { amount });
      // Refresh balance + history so the UI reflects the withdrawal immediately
      await Promise.all([fetchBalance(), fetchTransactionHistory(pagination.page)]);
      return data;
    } catch (err) {
      const msg = err.response?.data?.message || 'Withdrawal failed.';
      if (isMountedRef.current) setError(msg);
      throw new Error(msg);
    } finally {
      if (isMountedRef.current) setLoading(false);
    }
  }, [fetchBalance, fetchTransactionHistory, pagination.page]);

  return {
    balance,
    transactions,
    pagination,
    loading,
    error,
    fetchBalance,
    fetchTransactionHistory,
    withdraw,
  };
}

export default usePayment;