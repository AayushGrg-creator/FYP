import api from './api';

/**
 * TaskTide Payment & Escrow Service
 * Path: client/src/services/paymentService.js
 * * Coordinates secure financial transactions, milestone escrow management, 
 * and user payout history for the marketplace platform.
 */
export const paymentService = {
  /**
   * Retrieve global user transaction history
   * @param {Object} params - Filtering params (status, type, timeframe)
   */
  getTransactions: (params = {}) => 
    api.get('/payments/transactions', { params }),

  /**
   * Retrieve specific milestone escrow details
   * @param {string} milestoneId 
   */
  getEscrowStatus: (milestoneId) => 
    api.get(`/payments/escrow/${milestoneId}`),

  /**
   * Fund a milestone (Escrow initiation)
   * @param {string} milestoneId 
   * @param {number} amount 
   */
  fundMilestone: (milestoneId, amount) => 
    api.post('/payments/escrow/fund', { milestoneId, amount }),

  /**
   * Release payment from escrow to freelancer
   * @param {string} milestoneId 
   */
  releasePayment: (milestoneId) => 
    api.post('/payments/escrow/release', { milestoneId }),

  /**
   * Request platform arbitration for disputed milestone payments
   * @param {string} milestoneId 
   * @param {string} reason 
   */
  disputePayment: (milestoneId, reason) => 
    api.post('/payments/escrow/dispute', { milestoneId, reason }),
};

export default paymentService;