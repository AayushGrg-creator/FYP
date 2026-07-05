'use strict';

/**
 * milestone.controller.js
 *
 * Routes consumed by milestone.routes.js:
 *   POST   /api/milestones                       - create a milestone (client only)
 *   GET    /api/milestones/project/:projectId    - list milestones for a project (participant only)
 *   PATCH  /api/milestones/:id/fund              - client initiates a real Khalti payment
 *   PATCH  /api/milestones/:id/confirm-payment   - client confirms payment after Khalti redirect
 *   PATCH  /api/milestones/:id/submit            - freelancer submits work (assigned freelancer only)
 *   PATCH  /api/milestones/:id/approve           - client approves + releases funds
 *   PATCH  /api/milestones/:id/dispute           - client raises a dispute (client only)
 *   PATCH  /api/milestones/:id/cancel            - client cancels a non-terminal milestone
 *   DELETE /api/milestones/:id                   - client deletes an unfunded/cancelled milestone
 *
 * FUNDING FLOW (Khalti, return-URL only -- no inbound webhook is configured):
 *   1. fundMilestone            -- client clicks "Fund". We call Khalti's
 *      initiatePayment(), create a Transaction with status 'pending', and
 *      return a paymentUrl. The milestone stays in status 'created' --
 *      it is NOT marked funded yet.
 *   2. Khalti redirects the browser back to our return_url with ?pidx=...
 *   3. confirmMilestoneFunding  -- the frontend reads pidx from the URL and
 *      calls this endpoint. We do a server-side lookup via
 *      khaltiService.verifyReturn() to confirm the payment actually
 *      succeeded before trusting it. Only then does the Transaction move
 *      to 'escrowed' and the milestone move to 'funded'.
 */

const Project      = require('../models/Project');
const { Milestone } = require('../models/Milestone');
const Transaction   = require('../models/Transaction');
const User          = require('../models/User');
const khaltiService  = require('../services/khalti.service');
const { emitToProjectRoom } = require('../socket');

const ok   = (res, data, status = 200) => res.status(status).json({ success: true,  ...data });
const fail = (res, msg,  status = 400) => res.status(status).json({ success: false, message: msg });

/* ══════════════════════════════════════════════════════════════════
   POST /api/milestones
   Client only -- must own the project referenced in the body.
══════════════════════════════════════════════════════════════════ */
exports.createMilestone = async (req, res) => {
  try {
    const { project: projectId, name, description, amount, currency, order, dueDate } = req.body;

    const project = await Project.findById(projectId);
    if (!project) return fail(res, 'Project not found.', 404);

    if (project.client.toString() !== req.user._id.toString()) {
      return fail(res, 'You do not own this project.', 403);
    }

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      return fail(res, 'Amount must be a positive number.', 400);
    }

    // Prevent milestones from ever summing past the project's agreed total.
    const existingMilestones = await Milestone.find({ project: projectId }).select('amount');
    const existingTotal = existingMilestones.reduce((sum, m) => sum + m.amount, 0);
    const newTotal = existingTotal + numericAmount;

    if (newTotal > project.agreedAmount) {
      const remaining = project.agreedAmount - existingTotal;
      return fail(
        res,
        `This milestone (NPR ${numericAmount}) would push total milestones to NPR ${newTotal}, exceeding the project's agreed amount of NPR ${project.agreedAmount}. Remaining budget: NPR ${remaining > 0 ? remaining : 0}.`,
        400
      );
    }

    const milestone = await Milestone.create({
      project:     projectId,
      client:      project.client,
      freelancer:  project.freelancer,
      name,
      description,
      amount:      numericAmount,
      currency,
      order,
      dueDate,
    });

    ok(res, { message: 'Milestone created successfully.', milestone }, 201);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map((e) => e.message).join(', ');
      return fail(res, msg);
    }
    console.error('[milestone.createMilestone]', err);
    fail(res, err.message, 500);
  }
};

/* ══════════════════════════════════════════════════════════════════
   GET /api/milestones/project/:projectId
   Any project participant (client, freelancer, or admin).
══════════════════════════════════════════════════════════════════ */
exports.getMilestonesForProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId).select('client freelancer');
    if (!project) return fail(res, 'Project not found.', 404);

    const isParticipant =
      req.user.role === 'admin' ||
      project.client.toString()     === req.user._id.toString() ||
      project.freelancer.toString() === req.user._id.toString();

    if (!isParticipant) {
      return fail(res, 'You are not authorised to view these milestones.', 403);
    }

    const milestones = await Milestone.findByProject(req.params.projectId);
    ok(res, { milestones });
  } catch (err) {
    console.error('[milestone.getMilestonesForProject]', err);
    fail(res, 'Failed to load milestones.', 500);
  }
};

/* ══════════════════════════════════════════════════════════════════
   PATCH /api/milestones/:id/fund
   Client only (must be the milestone's own client).
   Initiates a real Khalti payment. Does NOT mark the milestone as
   funded -- that only happens once confirmMilestoneFunding verifies
   the payment actually succeeded.
══════════════════════════════════════════════════════════════════ */
exports.fundMilestone = async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.id);
    if (!milestone) return fail(res, 'Milestone not found.', 404);

    if (milestone.client.toString() !== req.user._id.toString()) {
      return fail(res, 'You do not own this milestone.', 403);
    }
    if (milestone.status !== 'created') {
      return fail(res, `Milestone must be 'created' to be funded (current: '${milestone.status}').`, 400);
    }

    const khaltiResponse = await khaltiService.initiatePayment({
      amountNPR:         milestone.amount,
      purchaseOrderId:   milestone._id.toString(),
      purchaseOrderName: milestone.name,
      customerName:      req.user.name,
      customerEmail:     req.user.email,
      // milestoneId is included here because Khalti's redirect only carries
      // back a `pidx` -- without this, the return page would have no way
      // to know which milestone a given payment belongs to.
      returnUrl:         `${process.env.PLATFORM_URL}/payments/khalti/return?milestoneId=${milestone._id}`,
    });

    const transaction = await Transaction.create({
      project:              milestone.project,
      milestone:            milestone._id,
      payer:                milestone.client,
      receiver:             milestone.freelancer,
      amount:               Math.round(milestone.amount * 100), // paisa
      amountDisplay:        milestone.amount,
      currency:             milestone.currency,
      gateway:              'khalti',
      gatewayTransactionId: khaltiResponse.pidx,
      gatewayInitPayload:   khaltiResponse.raw,
      status:               'pending',
      description:          `Funding for milestone: ${milestone.name}`,
    });

    ok(res, {
      message:       'Payment initiated. Redirect the client to paymentUrl to complete it.',
      paymentUrl:    khaltiResponse.paymentUrl,
      pidx:          khaltiResponse.pidx,
      transactionId: transaction._id,
    });
  } catch (err) {
    console.error('[milestone.fundMilestone]', err);
    fail(res, err.message, err.isGatewayError ? 502 : 400);
  }
};

/* ══════════════════════════════════════════════════════════════════
   PATCH /api/milestones/:id/confirm-payment
   Client only. Called by the frontend after Khalti redirects back
   with ?pidx=... -- verifies the payment server-side before trusting it.
   Body: { pidx }
══════════════════════════════════════════════════════════════════ */
exports.confirmMilestoneFunding = async (req, res) => {
  try {
    const { pidx } = req.body;
    if (!pidx) return fail(res, 'pidx is required.', 400);

    const milestone = await Milestone.findById(req.params.id);
    if (!milestone) return fail(res, 'Milestone not found.', 404);

    if (milestone.client.toString() !== req.user._id.toString()) {
      return fail(res, 'You do not own this milestone.', 403);
    }

    const transaction = await Transaction.findOne({
      milestone:            milestone._id,
      gatewayTransactionId: pidx,
    });
    if (!transaction) return fail(res, 'No matching transaction found for this payment.', 404);

    // Already processed -- return current state instead of re-processing
    if (transaction.status !== 'pending') {
      return ok(res, { message: `Payment already ${transaction.status}.`, milestone, transaction });
    }

    const { valid, lookup } = await khaltiService.verifyReturn(pidx, milestone.amount);

    if (!valid) {
      transaction.recordStatusChange('failed', {
        note:           'Khalti verification failed',
        gatewayPayload: lookup.raw,
      });
      await transaction.save();
      return fail(res, 'Payment could not be verified.', 400);
    }

    transaction.gatewayChargeId      = lookup.transactionId;
    transaction.gatewayVerifyPayload = lookup.raw;
    transaction.recordStatusChange('escrowed', { note: 'Confirmed via Khalti verifyReturn' });
    await transaction.save();

    milestone.fund(pidx, 'khalti', transaction.idempotencyKey);
    await milestone.save();

    emitToProjectRoom(milestone.project, 'milestone-funded', {
      milestoneId: milestone._id,
      amount:      milestone.amount,
    });

    ok(res, { message: 'Payment confirmed. Milestone is now funded.', milestone, transaction });
  } catch (err) {
    console.error('[milestone.confirmMilestoneFunding]', err);
    fail(res, err.message, 500);
  }
};

/* ══════════════════════════════════════════════════════════════════
   PATCH /api/milestones/:id/submit
   Freelancer only (must be the milestone's assigned freelancer).
   Body: { deliverableUrl, notes }
══════════════════════════════════════════════════════════════════ */
exports.submitMilestone = async (req, res) => {
  try {
    const { deliverableUrl, notes } = req.body;

    const milestone = await Milestone.findById(req.params.id);
    if (!milestone) return fail(res, 'Milestone not found.', 404);

    if (milestone.freelancer.toString() !== req.user._id.toString()) {
      return fail(res, 'You are not the assigned freelancer for this milestone.', 403);
    }

    milestone.submitWork(deliverableUrl, notes);
    await milestone.save();

    ok(res, { message: 'Work submitted for review.', milestone });
  } catch (err) {
    console.error('[milestone.submitMilestone]', err);
    fail(res, err.message, 400);
  }
};

/* ══════════════════════════════════════════════════════════════════
   PATCH /api/milestones/:id/approve
   Client only. Releases the escrowed transaction to the freelancer's
   wallet and moves the milestone to 'released'. Triggers
   Project.recalculateProgress automatically via Milestone's
   post-save hook.
══════════════════════════════════════════════════════════════════ */
exports.approveMilestone = async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.id);
    if (!milestone) return fail(res, 'Milestone not found.', 404);

    if (milestone.client.toString() !== req.user._id.toString()) {
      return fail(res, 'You do not own this milestone.', 403);
    }

    const transaction = await Transaction.findOne({ milestone: milestone._id, status: 'escrowed' });
    if (!transaction) {
      return fail(res, 'No escrowed transaction found for this milestone. It may not be funded yet.', 400);
    }

    // milestone.release() enforces the 'pending_approval' -> 'released' transition
    milestone.release();
    await milestone.save();

    transaction.recordStatusChange('released', { note: 'Milestone approved by client' });
    await transaction.save();

    await User.findByIdAndUpdate(milestone.freelancer, { $inc: { walletBalance: transaction.netAmount } });
 // ADD THIS: recalculate the project's released amount + progress
    const project = await Project.findById(milestone.project);
    if (project) {
      await project.recalculateProgress();
    }

    emitToProjectRoom(milestone.project, 'milestone-released', {
      milestoneId: milestone._id,
      netAmount:   transaction.netAmount,
    });

    ok(res, { message: 'Milestone approved and funds released.', milestone });
  } catch (err) {
    console.error('[milestone.approveMilestone]', err);
    fail(res, err.message, 400);
  }
};

/* ══════════════════════════════════════════════════════════════════
   PATCH /api/milestones/:id/dispute
   Client only. Body: { reason }
══════════════════════════════════════════════════════════════════ */
exports.disputeMilestone = async (req, res) => {
  try {
    const { reason } = req.body;

    const milestone = await Milestone.findById(req.params.id);
    if (!milestone) return fail(res, 'Milestone not found.', 404);

    if (milestone.client.toString() !== req.user._id.toString()) {
      return fail(res, 'You do not own this milestone.', 403);
    }

    milestone.raiseDispute(reason);
    await milestone.save();

    const transaction = await Transaction.findOne({ milestone: milestone._id, status: 'escrowed' });
    if (transaction) {
      transaction.recordStatusChange('disputed', { note: reason });
      await transaction.save();
    }

    emitToProjectRoom(milestone.project, 'milestone-disputed', {
      milestoneId: milestone._id,
      reason,
    });

    ok(res, { message: 'Dispute raised.', milestone });
  } catch (err) {
    console.error('[milestone.disputeMilestone]', err);
    fail(res, err.message, 400);
  }
};

/* ══════════════════════════════════════════════════════════════════
   PATCH /api/milestones/:id/cancel
   Client only. Cancels a funded (or otherwise non-terminal) milestone
   without deleting its record -- preserves history for anything that
   had funds committed, unlike a hard delete which is create-only.
══════════════════════════════════════════════════════════════════ */
exports.cancelMilestone = async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.id);
    if (!milestone) return fail(res, 'Milestone not found.', 404);

    if (milestone.client.toString() !== req.user._id.toString()) {
      return fail(res, 'You do not own this milestone.', 403);
    }

    if (milestone.status !== 'created') {
      return fail(res, `Only unfunded milestones can be cancelled (current: '${milestone.status}'). Use dispute instead.`, 400);
    }

    milestone.cancel();
    await milestone.save();

    ok(res, { message: 'Milestone cancelled.', milestone });
  } catch (err) {
    console.error('[milestone.cancelMilestone]', err);
    fail(res, err.message, 400);
  }
};

/* ══════════════════════════════════════════════════════════════════
   DELETE /api/milestones/:id
   Client only (must own it), and only while status is still 'created'
   or 'cancelled' -- once funded, use cancel/dispute instead, not a
   hard delete.
══════════════════════════════════════════════════════════════════ */
exports.deleteMilestone = async (req, res) => {
  try {
    const milestone = await Milestone.findById(req.params.id);
    if (!milestone) return fail(res, 'Milestone not found.', 404);

    if (milestone.client.toString() !== req.user._id.toString()) {
      return fail(res, 'You do not own this milestone.', 403);
    }

    if (!['created', 'cancelled'].includes(milestone.status)) {
      return fail(res, 'Only milestones that are not yet funded, or have been cancelled, can be deleted.', 400);
    }

    await milestone.deleteOne();

    ok(res, { message: 'Milestone deleted successfully.' });
  } catch (err) {
    console.error('[milestone.deleteMilestone]', err);
    fail(res, err.message, 500);
  }
};