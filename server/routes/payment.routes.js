'use strict';

/**
 * payment.routes.js
 * Express router for wallet/balance/withdrawal endpoints.
 *
 * Mounts at: /api/payments  (configured in server/app.js)
 *
 * NOTE on architecture:
 *   - Milestone funding (initiate + confirm), approval/release, and
 *     disputes are handled by milestone.routes.js / milestone.controller.js,
 *     since they act on a specific milestone's escrowed Transaction.
 *   - There are NO webhook routes here. This project uses Khalti's
 *     return-URL flow only (confirmed: no KHALTI_WEBHOOK_SECRET is
 *     configured, and no webhook URL is registered in the Khalti
 *     dashboard). Payment confirmation happens via
 *     PATCH /api/milestones/:id/confirm-payment instead, which calls
 *     khaltiService.verifyReturn() server-side.
 *   - Stripe is not used in this project.
 */

const express = require('express');
const router  = express.Router();

const paymentCtrl  = require('../controllers/payment.controller');
const { protect }   = require('../middleware/authMiddleware');
const { checkRole } = require('../middleware/roleMiddleware'); // FIXED: was importing 'authorise', which doesn't exist

router.use(protect);

/**
 * GET /api/payments/transactions?page=1&limit=20
 * Paginated transaction history for the authenticated user (client, freelancer, or admin).
 */
router.get(
  '/transactions',
  checkRole(['client', 'freelancer', 'admin']),
  paymentCtrl.getTransactionHistory,
);

/**
 * GET /api/payments/balance
 * Current wallet balance for the authenticated user.
 */
router.get(
  '/balance',
  checkRole(['client', 'freelancer']),
  paymentCtrl.getEscrowBalance,
);

/**
 * POST /api/payments/withdraw
 * Withdraw available wallet balance. In practice this will almost
 * always be a freelancer (clients don't accumulate walletBalance on
 * this platform), but the endpoint itself doesn't hard-restrict the role
 * beyond requiring authentication -- checkRole below limits it to
 * freelancer and admin as a sensible default.
 */
router.post(
  '/withdraw',
  checkRole(['freelancer', 'admin']),
  paymentCtrl.withdrawFunds,
);

module.exports = router;