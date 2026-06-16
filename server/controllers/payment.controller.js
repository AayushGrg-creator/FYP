/**
 * payment.controller.js
 * HTTP handlers for Task Tide's escrow payment subsystem (§5.3).
 *
 * Handler groups:
 *   A) Standard REST endpoints  — protected by JWT cookie auth
 *      fundEscrow, approveMilestone, disputeMilestone,
 *      getTransactionHistory, getEscrowBalance, withdrawFunds
 *
 *   B) Webhook endpoints        — NO cookie auth; verified by HMAC signature
 *      handleStripeWebhook, handleKhaltiWebhook
 *      These are deliberately excluded from authMiddleware in the route file.
 *
 * Escrow state machine (§5.3.2 Figure 11):
 *   created → funded → milestone_submitted → approved | disputed → resolved | completed
 *
 * Fee: 8% platform deduction on every milestone release (§5.3 FR-PAY-10).
 * Idempotency keys prevent double-charging (§5.3 NFR-PAY-02).
 */

'use strict';

const mongoose   = require('mongoose');
const Milestone  = require('../models/Milestone');
const Project    = require('../models/Project');
const Transaction = require('../models/Transaction');
const User       = require('../models/User');

const khaltiService = require('../services/khalti.service');
const stripeService = require('../services/stripe.service');
const { emitToUser, emitToRoom } = require('../socket');
const logger        = require('../config/logger');

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const PLATFORM_FEE_RATE = 0.08;    // 8% (§5.3 FR-PAY-10)

/* ─────────────────────────────────────────────
   Shared error helper
───────────────────────────────────────────── */
function handleError(res, err, context = '') {
  const status  = err.statusCode || 500;
  const message = err.message    || 'An unexpected error occurred.';
  logger.error(`payment.controller [${context}]:`, message, err.stack ? err.stack.split('\n')[1] : '');
  return res.status(status).json({ success: false, message });
}

/* ─────────────────────────────────────────────
   Fee calculation helper — safe against 0 amounts
───────────────────────────────────────────── */
function calcFee(grossAmount) {
  if (!grossAmount || grossAmount <= 0) return { fee: 0, net: 0 };
  const fee = Math.round(grossAmount * PLATFORM_FEE_RATE * 100) / 100;
  const net = Math.round((grossAmount - fee) * 100) / 100;
  return { fee, net };
}

/* ═══════════════════════════════════════════════════════════════════
   GROUP A — Standard REST endpoints  (JWT-authenticated)
═══════════════════════════════════════════════════════════════════ */

/**
 * POST /api/payments/escrow/fund
 * Client funds the escrow for a project.
 * Body: { projectId, milestoneId, amount, currency, gateway: 'khalti'|'stripe', gatewayToken }
 * Header: Idempotency-Key  (enforced by idempotencyMiddleware upstream)
 */
async function fundEscrow(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { projectId, milestoneId, amount, currency = 'NPR', gateway, gatewayToken } = req.body;
    const clientId = req.user._id;

    // ── Validate project ownership ────────────
    const project = await Project.findById(projectId).session(session);
    if (!project) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Project not found.' });
    }
    if (project.clientId.toString() !== clientId.toString()) {
      await session.abortTransaction();
      return res.status(403).json({ success: false, message: 'Only the project client can fund escrow.' });
    }

    // ── Validate milestone ────────────────────
    const milestone = await Milestone.findOne({ _id: milestoneId, projectId }).session(session);
    if (!milestone) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Milestone not found.' });
    }
    if (milestone.status !== 'pending') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Milestone is already in status '${milestone.status}' and cannot be funded again.`,
      });
    }

    // ── Process payment through gateway ───────
    let gatewayResponse;
    const gatewayRef = `tasktide-${milestoneId}-${Date.now()}`;

    if (gateway === 'khalti') {
      gatewayResponse = await khaltiService.initiatePayment({
        token:     gatewayToken,
        amount:    Math.round(amount * 100), // Khalti uses paisa
        orderId:   gatewayRef,
        orderName: `Milestone: ${milestone.title || milestoneId}`,
      });
    } else if (gateway === 'stripe') {
      gatewayResponse = await stripeService.capturePayment({
        paymentMethodId: gatewayToken,
        amount:          Math.round(amount * 100), // Stripe uses cents
        currency:        currency.toLowerCase(),
        description:     `Task Tide escrow — milestone ${milestoneId}`,
        idempotencyKey:  req.headers['idempotency-key'] || gatewayRef,
      });
    } else {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: `Unsupported payment gateway: ${gateway}` });
    }

    // ── Record transaction ─────────────────────
    const transaction = await Transaction.create(
      [{
        projectId,
        milestoneId,
        clientId,
        freelancerId:  project.freelancerId,
        amount,
        currency,
        platformFee:   0,          // fee taken on release, not on fund
        netAmount:     amount,
        gateway,
        gatewayRef:    gatewayResponse.transactionId || gatewayRef,
        status:        'held',
      }],
      { session },
    );

    // ── Update milestone status → funded ───────
    await Milestone.findByIdAndUpdate(
      milestoneId,
      { $set: { status: 'funded', transactionId: transaction[0]._id } },
      { session, new: true },
    );

    // ── Update project escrow status ───────────
    await Project.findByIdAndUpdate(
      projectId,
      { $set: { escrowStatus: 'funded' } },
      { session },
    );

    await session.commitTransaction();
    logger.info(`payment: escrow funded — milestone=${milestoneId} amount=${amount} ${currency} via ${gateway}`);

    // Real-time notification to freelancer
    emitToUser(project.freelancerId, 'escrow-funded', {
      projectId,
      milestoneId,
      amount,
      currency,
      message: 'The client has funded the escrow for a milestone. You may begin work.',
    });

    return res.status(200).json({
      success:       true,
      message:       'Escrow funded successfully.',
      transactionId: transaction[0]._id,
      gateway:       gatewayResponse.transactionId || gatewayRef,
    });
  } catch (err) {
    await session.abortTransaction();
    return handleError(res, err, 'fundEscrow');
  } finally {
    session.endSession();
  }
}

/**
 * POST /api/payments/milestone/:milestoneId/approve
 * Client approves a submitted milestone — releases funds to freelancer.
 * Body: (empty)
 * Header: Idempotency-Key
 */
async function approveMilestone(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { milestoneId } = req.params;
    const clientId        = req.user._id;

    const milestone = await Milestone.findById(milestoneId)
      .populate('projectId')
      .session(session);

    if (!milestone) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Milestone not found.' });
    }

    const project = milestone.projectId;

    if (project.clientId.toString() !== clientId.toString()) {
      await session.abortTransaction();
      return res.status(403).json({ success: false, message: 'Only the project client can approve milestones.' });
    }

    if (milestone.status !== 'submitted') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: `Milestone must be in 'submitted' status to approve (current: '${milestone.status}').`,
      });
    }

    // ── Retrieve the held transaction ──────────
    const held = await Transaction.findOne({
      milestoneId,
      status: 'held',
    }).session(session);

    if (!held) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'No held escrow transaction found for this milestone.' });
    }

    const { fee, net } = calcFee(held.amount);

    // ── Release funds through gateway ──────────
    if (held.gateway === 'khalti') {
      await khaltiService.releasePayment({
        transactionId: held.gatewayRef,
        amount:        Math.round(net * 100),
        freelancerId:  project.freelancerId,
      });
    } else if (held.gateway === 'stripe') {
      await stripeService.transferToFreelancer({
        freelancerStripeId: (await User.findById(project.freelancerId).select('stripeConnectId').lean())?.stripeConnectId,
        amount:             Math.round(net * 100),
        currency:           held.currency.toLowerCase(),
        transactionId:      held._id.toString(),
      });
    }

    // ── Update transaction ─────────────────────
    await Transaction.findByIdAndUpdate(
      held._id,
      {
        $set: {
          status:      'released',
          platformFee: fee,
          netAmount:   net,
          releasedAt:  new Date(),
        },
      },
      { session },
    );

    // ── Update milestone ───────────────────────
    await Milestone.findByIdAndUpdate(
      milestoneId,
      { $set: { status: 'approved', approvedAt: new Date() } },
      { session },
    );

    // ── Update freelancer wallet balance ───────
    await User.findByIdAndUpdate(
      project.freelancerId,
      { $inc: { walletBalance: net } },
      { session },
    );

    // ── Check if all milestones are complete ───
    const pending = await Milestone.countDocuments({
      projectId: project._id,
      status:    { $nin: ['approved', 'cancelled'] },
    }).session(session);

    if (pending === 0) {
      await Project.findByIdAndUpdate(
        project._id,
        { $set: { escrowStatus: 'completed', status: 'completed' } },
        { session },
      );
    }

    await session.commitTransaction();

    logger.info(`payment: milestone approved — id=${milestoneId} gross=${held.amount} fee=${fee} net=${net}`);

    // Real-time notification
    emitToUser(project.freelancerId, 'milestone-approved', {
      milestoneId,
      projectId: project._id,
      netAmount: net,
      currency:  held.currency,
      message:   `Milestone approved. NPR ${net} credited to your wallet.`,
    });
    emitToRoom(project._id, 'escrow-status-changed', {
      projectId:   project._id,
      milestoneId,
      escrowStatus: pending === 0 ? 'completed' : 'funded',
    });

    return res.status(200).json({
      success:    true,
      message:    'Milestone approved and funds released.',
      netAmount:  net,
      platformFee: fee,
    });
  } catch (err) {
    await session.abortTransaction();
    return handleError(res, err, 'approveMilestone');
  } finally {
    session.endSession();
  }
}

/**
 * POST /api/payments/milestone/:milestoneId/dispute
 * Client disputes a milestone — freezes funds, notifies admin.
 * Body: { reason }
 */
async function disputeMilestone(req, res) {
  try {
    const { milestoneId } = req.params;
    const { reason = '' } = req.body;
    const clientId        = req.user._id;

    if (!reason.trim()) {
      return res.status(400).json({ success: false, message: 'A dispute reason is required.' });
    }

    const milestone = await Milestone.findById(milestoneId).populate('projectId');
    if (!milestone) {
      return res.status(404).json({ success: false, message: 'Milestone not found.' });
    }

    const project = milestone.projectId;

    if (project.clientId.toString() !== clientId.toString()) {
      return res.status(403).json({ success: false, message: 'Only the project client can raise a dispute.' });
    }

    if (!['submitted', 'funded'].includes(milestone.status)) {
      return res.status(400).json({
        success: false,
        message: `Milestone must be 'funded' or 'submitted' to dispute (current: '${milestone.status}').`,
      });
    }

    // Freeze the transaction
    await Transaction.findOneAndUpdate(
      { milestoneId, status: { $in: ['held', 'released'] } },
      { $set: { status: 'disputed', disputeReason: reason, disputedAt: new Date() } },
    );

    // Update milestone status
    await Milestone.findByIdAndUpdate(milestoneId, {
      $set: {
        status:        'disputed',
        disputeReason: reason,
        disputedAt:    new Date(),
      },
    });

    // Update project escrow status
    await Project.findByIdAndUpdate(project._id, {
      $set: { escrowStatus: 'disputed' },
    });

    logger.info(`payment: dispute raised — milestone=${milestoneId} by client=${clientId}`);

    // Notify both parties and admin
    emitToUser(project.freelancerId, 'milestone-disputed', {
      milestoneId,
      projectId: project._id,
      reason,
      message:   'A dispute has been raised on a milestone. Funds are frozen pending admin review.',
    });

    return res.status(200).json({
      success: true,
      message: 'Dispute recorded. Funds are frozen and an administrator has been notified.',
    });
  } catch (err) {
    return handleError(res, err, 'disputeMilestone');
  }
}

/**
 * GET /api/payments/transactions
 * Returns paginated transaction history for the authenticated user.
 * Query: page, limit
 */
async function getTransactionHistory(req, res) {
  try {
    const userId  = req.user._id;
    const role    = req.user.role;
    const page    = Math.max(1, parseInt(req.query.page, 10)  || 1);
    const limit   = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip    = (page - 1) * limit;

    const filter  = role === 'client'
      ? { clientId:     userId }
      : { freelancerId: userId };

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('projectId',   'title')
        .populate('milestoneId', 'title')
        .lean(),
      Transaction.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data:    transactions,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
    });
  } catch (err) {
    return handleError(res, err, 'getTransactionHistory');
  }
}

/**
 * GET /api/payments/balance
 * Returns the authenticated user's current wallet balance.
 */
async function getEscrowBalance(req, res) {
  try {
    const user = await User.findById(req.user._id).select('walletBalance').lean();
    return res.status(200).json({
      success:       true,
      walletBalance: user?.walletBalance || 0,
    });
  } catch (err) {
    return handleError(res, err, 'getEscrowBalance');
  }
}

/**
 * POST /api/payments/withdraw
 * Freelancer withdraws available balance to their linked wallet / bank.
 * Body: { amount, gateway: 'khalti'|'bank' }
 */
async function withdrawFunds(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount, gateway = 'khalti' } = req.body;
    const freelancerId = req.user._id;

    if (!amount || amount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Invalid withdrawal amount.' });
    }

    const user = await User.findById(freelancerId).session(session);
    if (!user || (user.walletBalance || 0) < amount) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance.' });
    }

    // Deduct balance first to prevent double-withdrawal
    await User.findByIdAndUpdate(
      freelancerId,
      { $inc: { walletBalance: -amount } },
      { session },
    );

    // Record outgoing transaction
    await Transaction.create(
      [{
        freelancerId,
        amount,
        currency:   'NPR',
        gateway,
        gatewayRef: `withdraw-${freelancerId}-${Date.now()}`,
        status:     'withdrawn',
        platformFee: 0,
        netAmount:  amount,
      }],
      { session },
    );

    await session.commitTransaction();

    logger.info(`payment: withdrawal — freelancer=${freelancerId} amount=${amount}`);

    return res.status(200).json({
      success: true,
      message: `Withdrawal of NPR ${amount} initiated. It will reach your ${gateway} wallet within 1–2 business days.`,
    });
  } catch (err) {
    await session.abortTransaction();
    return handleError(res, err, 'withdrawFunds');
  } finally {
    session.endSession();
  }
}
/* ═══════════════════════════════════════════════════════════════════
   GROUP B — Webhook endpoints  (NO JWT auth — HMAC-verified only)
   These handlers must be mounted WITHOUT authMiddleware.protect.
   The route file (payment.routes.js) is responsible for the bypass.
   Raw body parsing and signature verification are applied as
   route-scoped middleware BEFORE these handlers run.
═══════════════════════════════════════════════════════════════════ */

/**
 * POST /api/payments/webhook/stripe
 * Receives and processes Stripe payment events.
 *
 * Middleware chain (set in routes, NOT here):
 *   stripeWebhookBodyMiddleware → verifyStripeSignatureMiddleware → handleStripeWebhook
 *
 * Always returns 200 immediately after signature verification to prevent
 * Stripe from retrying unnecessarily (§5.3 NFR-PAY-03).
 * Processing errors are logged but do not change the response code.
 */
async function handleStripeWebhook(req, res) {
  // stripeEvent is attached by verifyStripeSignatureMiddleware
  const event = req.stripeEvent;

  if (!event) {
    return res.status(400).json({ success: false, message: 'No verified Stripe event found.' });
  }

  // Respond to Stripe immediately — async processing below
  res.status(200).json({ received: true });

  try {
    logger.info(`webhook/stripe: processing event type=${event.type} id=${event.id}`);

    switch (event.type) {

      /* ── Payment captured successfully ────── */
      case 'payment_intent.succeeded': {
        const pi        = event.data.object;
        const gatewayRef = pi.id;

        const transaction = await Transaction.findOneAndUpdate(
          { gatewayRef, status: { $nin: ['released', 'disputed', 'withdrawn'] } },
          { $set: { status: 'held', gatewayConfirmedAt: new Date() } },
          { new: true },
        );

        if (transaction?.milestoneId) {
          await Milestone.findByIdAndUpdate(transaction.milestoneId, {
            $set: { status: 'funded' },
          });
          await Project.findByIdAndUpdate(transaction.projectId, {
            $set: { escrowStatus: 'funded' },
          });

          emitToUser(transaction.freelancerId, 'escrow-funded', {
            milestoneId: transaction.milestoneId,
            projectId:   transaction.projectId,
            amount:      transaction.amount,
            currency:    transaction.currency,
            source:      'stripe-webhook',
          });

          logger.info(`webhook/stripe: milestone ${transaction.milestoneId} → funded via payment_intent.succeeded`);
        }
        break;
      }

      /* ── Payment failed ──────────────────── */
      case 'payment_intent.payment_failed': {
        const pi         = event.data.object;
        const gatewayRef = pi.id;
        const failureMsg = pi.last_payment_error?.message || 'Unknown failure';

        await Transaction.findOneAndUpdate(
          { gatewayRef },
          { $set: { status: 'failed', gatewayError: failureMsg } },
        );

        const tx = await Transaction.findOne({ gatewayRef }).lean();
        if (tx?.milestoneId) {
          await Milestone.findByIdAndUpdate(tx.milestoneId, { $set: { status: 'pending' } });
          emitToUser(tx.clientId, 'payment-failed', {
            milestoneId: tx.milestoneId,
            reason:      failureMsg,
          });
        }
        logger.warn(`webhook/stripe: payment failed — ref=${gatewayRef} reason=${failureMsg}`);
        break;
      }

      /* ── Stripe Connect transfer completed ── */
      case 'transfer.created': {
        const transfer   = event.data.object;
        const metaMilestone = transfer.metadata?.milestoneId;

        if (metaMilestone) {
          await Milestone.findByIdAndUpdate(metaMilestone, {
            $set: { status: 'approved', approvedAt: new Date() },
          });
          logger.info(`webhook/stripe: transfer.created → milestone ${metaMilestone} approved`);
        }
        break;
      }

      /* ── Dispute / chargeback opened ──────── */
      case 'charge.dispute.created': {
        const dispute    = event.data.object;
        const gatewayRef = dispute.payment_intent;

        await Transaction.findOneAndUpdate(
          { gatewayRef },
          { $set: { status: 'disputed', disputedAt: new Date(), gatewayDisputeId: dispute.id } },
        );

        const tx = await Transaction.findOne({ gatewayRef }).lean();
        if (tx) {
          await Milestone.findByIdAndUpdate(tx.milestoneId, { $set: { status: 'disputed' } });
          await Project.findByIdAndUpdate(tx.projectId, { $set: { escrowStatus: 'disputed' } });
          logger.warn(`webhook/stripe: chargeback opened — dispute=${dispute.id} tx=${tx._id}`);
        }
        break;
      }

      /* ── Refund completed ─────────────────── */
      case 'charge.refunded': {
        const charge     = event.data.object;
        const gatewayRef = charge.payment_intent;

        await Transaction.findOneAndUpdate(
          { gatewayRef },
          { $set: { status: 'refunded', refundedAt: new Date() } },
        );
        logger.info(`webhook/stripe: refund confirmed — ref=${gatewayRef}`);
        break;
      }

      default:
        logger.info(`webhook/stripe: unhandled event type=${event.type} — ignored`);
    }
  } catch (processingErr) {
    // Log but do not change the 200 already sent — prevents Stripe retries
    logger.error(`webhook/stripe: processing error for event ${event.id}:`, processingErr);
  }
}

/**
 * POST /api/payments/webhook/khalti
 * Receives and processes Khalti payment status callbacks.
 *
 * Middleware chain (set in routes):
 *   khaltiWebhookBodyMiddleware → verifyKhaltiSignatureMiddleware → handleKhaltiWebhook
 *
 * Khalti webhook payload shape (sandbox + production):
 * {
 *   event:   'payment.completed' | 'payment.failed' | 'payment.refunded',
 *   pidx:    '<khalti_payment_idx>',
 *   txnId:   '<transaction_id>',
 *   amount:  <amount_in_paisa>,
 *   status:  'Completed' | 'Failed' | 'Refunded',
 *   fee:     <khalti_fee_paisa>,
 *   refunded: boolean
 * }
 */
async function handleKhaltiWebhook(req, res) {
  const event = req.khaltiEvent;

  if (!event) {
    return res.status(400).json({ success: false, message: 'No verified Khalti event found.' });
  }

  // Acknowledge immediately (§5.3 NFR-PAY-03 retry logic)
  res.status(200).json({ received: true });

  try {
    const { event: eventType, pidx, txnId, amount: amountPaisa, status } = event;
    logger.info(`webhook/khalti: event=${eventType} pidx=${pidx} txnId=${txnId} status=${status}`);

    const amountNPR   = amountPaisa / 100;   // convert from paisa to NPR

    switch (eventType) {

      /* ── Payment completed ────────────────── */
      case 'payment.completed': {
        // Khalti uses pidx as the gateway reference in our Transaction
        const transaction = await Transaction.findOneAndUpdate(
          { gatewayRef: pidx, status: { $nin: ['released', 'disputed'] } },
          {
            $set: {
              status:             'held',
              gatewayConfirmedAt: new Date(),
              gatewayTxnId:       txnId,
            },
          },
          { new: true },
        );

        if (!transaction) {
          logger.warn(`webhook/khalti: no pending transaction for pidx=${pidx}`);
          break;
        }

        // Update milestone → funded
        await Milestone.findByIdAndUpdate(transaction.milestoneId, {
          $set: { status: 'funded', fundedAt: new Date() },
        });

        // Update project escrow status
        await Project.findByIdAndUpdate(transaction.projectId, {
          $set: { escrowStatus: 'funded' },
        });

        // Notify client (payment confirmed) and freelancer (work can begin)
        emitToUser(transaction.clientId, 'payment-confirmed', {
          milestoneId: transaction.milestoneId,
          projectId:   transaction.projectId,
          amount:      amountNPR,
          currency:    'NPR',
          message:     'Your Khalti payment was confirmed. Escrow is funded.',
        });
        emitToUser(transaction.freelancerId, 'escrow-funded', {
          milestoneId: transaction.milestoneId,
          projectId:   transaction.projectId,
          amount:      amountNPR,
          currency:    'NPR',
          source:      'khalti-webhook',
        });

        logger.info(`webhook/khalti: milestone ${transaction.milestoneId} → funded`);
        break;
      }

      /* ── Payment failed ──────────────────── */
      case 'payment.failed': {
        const transaction = await Transaction.findOneAndUpdate(
          { gatewayRef: pidx },
          { $set: { status: 'failed', gatewayError: `Khalti status: ${status}` } },
          { new: true },
        );

        if (transaction?.milestoneId) {
          await Milestone.findByIdAndUpdate(transaction.milestoneId, {
            $set: { status: 'pending' },
          });
          emitToUser(transaction.clientId, 'payment-failed', {
            milestoneId: transaction.milestoneId,
            reason:      `Khalti payment failed (status: ${status}).`,
          });
        }
        logger.warn(`webhook/khalti: payment failed — pidx=${pidx} status=${status}`);
        break;
      }

      /* ── Refund processed ────────────────── */
      case 'payment.refunded': {
        const transaction = await Transaction.findOneAndUpdate(
          { gatewayRef: pidx },
          { $set: { status: 'refunded', refundedAt: new Date() } },
          { new: true },
        );

        if (transaction?.projectId) {
          await Project.findByIdAndUpdate(transaction.projectId, {
            $set: { escrowStatus: 'refunded' },
          });
          await Milestone.findByIdAndUpdate(transaction.milestoneId, {
            $set: { status: 'refunded' },
          });
          emitToUser(transaction.clientId, 'payment-refunded', {
            milestoneId: transaction.milestoneId,
            amount:      amountNPR,
            currency:    'NPR',
            message:     'Your Khalti payment has been refunded.',
          });
          logger.info(`webhook/khalti: refund confirmed — pidx=${pidx} amount=${amountNPR} NPR`);
        }
        break;
      }

      default:
        logger.info(`webhook/khalti: unhandled event type=${eventType} — ignored`);
    }
  } catch (processingErr) {
    logger.error(`webhook/khalti: processing error for event ${JSON.stringify(event)}:`, processingErr);
  }
}

module.exports = {
  // REST endpoints (JWT-protected in routes)
  fundEscrow,
  approveMilestone,
  disputeMilestone,
  getTransactionHistory,
  getEscrowBalance,
  withdrawFunds,

  // Webhook endpoints (NO JWT — HMAC-only, bypasses authMiddleware)
  handleStripeWebhook,
  handleKhaltiWebhook,
};