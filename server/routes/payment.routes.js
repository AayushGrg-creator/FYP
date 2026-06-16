/**
 * payment.routes.js
 * Express router for Task Tide's escrow payment subsystem.
 *
 * Mounts at: /api/payments  (configured in server/app.js)
 *
 * CRITICAL ARCHITECTURE NOTE (§5.3 webhook requirement):
 * Webhook routes are declared BEFORE the global protect middleware block.
 * They use raw body parsing + HMAC verification INSTEAD of JWT cookies.
 * Standard REST routes use protect + authorise as normal.
 *
 * Wrong:  router.use(protect); ... router.post('/webhook/stripe', ...);
 * Right:  [webhook routes first, no protect] ... router.use(protect); ... [REST routes]
 */

'use strict';

const express       = require('express');
const router        = express.Router();

const paymentCtrl  = require('../controllers/payment.controller');
const { protect }  = require('../middleware/authMiddleware');
const { authorise } = require('../middleware/roleMiddleware');
const { idempotencyMiddleware } = require('../utils/idempotency');
const {
  stripeWebhookBodyMiddleware,
  verifyStripeSignatureMiddleware,
  khaltiWebhookBodyMiddleware,
  verifyKhaltiSignatureMiddleware,
} = require('../utils/webhookVerify');

/* ═══════════════════════════════════════════════════════════════════
   WEBHOOK ROUTES  ── No JWT, No cookie auth, HMAC signature only
   These MUST be declared before router.use(protect) below.
═══════════════════════════════════════════════════════════════════ */

/**
 * POST /api/payments/webhook/stripe
 * 1. stripeWebhookBodyMiddleware  → parse raw Buffer into req.rawBody
 * 2. verifyStripeSignatureMiddleware → verify HMAC, attach req.stripeEvent
 * 3. handleStripeWebhook          → process event, always return 200
 */
router.post(
  '/webhook/stripe',
  stripeWebhookBodyMiddleware,
  verifyStripeSignatureMiddleware,
  paymentCtrl.handleStripeWebhook,
);

/**
 * POST /api/payments/webhook/khalti
 * 1. khaltiWebhookBodyMiddleware        → parse raw Buffer into req.rawBody
 * 2. verifyKhaltiSignatureMiddleware    → verify HMAC, attach req.khaltiEvent
 * 3. handleKhaltiWebhook               → process event, always return 200
 */
router.post(
  '/webhook/khalti',
  khaltiWebhookBodyMiddleware,
  verifyKhaltiSignatureMiddleware,
  paymentCtrl.handleKhaltiWebhook,
);

/* ═══════════════════════════════════════════════════════════════════
   STANDARD REST ROUTES  ── JWT required below this line
═══════════════════════════════════════════════════════════════════ */
router.use(protect);

/**
 * POST /api/payments/escrow/fund
 * Client funds the escrow for a milestone.
 * Requires Idempotency-Key header (enforced by idempotencyMiddleware).
 */
router.post(
  '/escrow/fund',
  authorise('client'),
  idempotencyMiddleware,
  paymentCtrl.fundEscrow,
);

/**
 * POST /api/payments/milestone/:milestoneId/approve
 * Client approves a submitted milestone and releases funds to freelancer.
 * Requires Idempotency-Key to prevent double-release.
 */
router.post(
  '/milestone/:milestoneId/approve',
  authorise('client'),
  idempotencyMiddleware,
  paymentCtrl.approveMilestone,
);

/**
 * POST /api/payments/milestone/:milestoneId/dispute
 * Client raises a dispute — freezes funds, notifies admin.
 */
router.post(
  '/milestone/:milestoneId/dispute',
  authorise('client'),
  paymentCtrl.disputeMilestone,
);

/**
 * GET /api/payments/transactions?page=1&limit=20
 * Paginated transaction history for the authenticated user (client or freelancer).
 */
router.get(
  '/transactions',
  authorise('client', 'freelancer', 'admin'),
  paymentCtrl.getTransactionHistory,
);

/**
 * GET /api/payments/balance
 * Current wallet balance for the authenticated user.
 */
router.get(
  '/balance',
  authorise('client', 'freelancer'),
  paymentCtrl.getEscrowBalance,
);

/**
 * POST /api/payments/withdraw
 * Freelancer withdraws available wallet balance.
 * Requires Idempotency-Key to prevent duplicate withdrawals.
 */
router.post(
  '/withdraw',
  authorise('freelancer'),
  idempotencyMiddleware,
  paymentCtrl.withdrawFunds,
);

module.exports = router;