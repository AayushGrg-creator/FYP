import api from './api';

/**
 * TaskTide Payment Service
 * Path: client/src/services/paymentService.js
 *
 * Wallet-level concerns only: balance, transaction history, withdrawals.
 * Milestone funding/approval/dispute are NOT here -- they live in
 * milestoneService.js, since they act on a specific milestone's escrow,
 * not the user's account as a whole. Keeping the split this way matches
 * how the backend is organised (payment.controller.js vs
 * milestone.controller.js) and avoids two places doing the same job.
 */
export const paymentService = {
  /**
   * Paginated transaction history for the logged-in user.
   * @param {Object} params - { page, limit }
   */
  getTransactionHistory: (params = {}) =>
    api.get('/payments/transactions', { params }),

  /**
   * Current wallet balance for the logged-in user.
   */
  getBalance: () =>
    api.get('/payments/balance'),

  /**
   * Withdraw funds from wallet balance.
   * @param {number} amount
   */
  withdraw: (amount) =>
    api.post('/payments/withdraw', { amount }),
};

export default paymentService;