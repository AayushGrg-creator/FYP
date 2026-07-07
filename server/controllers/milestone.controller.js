'use strict';

const Project      = require('../models/Project');
const { Milestone } = require('../models/Milestone');
const Transaction   = require('../models/Transaction');
const User          = require('../models/User');
const khaltiService  = require('../services/khalti.service');
const gamificationService = require('../services/gamification.service');
const reputationService   = require('../services/reputation.service');
const { POINT_VALUES }    = require('../config/constants');
const { emitToProjectRoom } = require('../socket');

const ok   = (res, data, status = 200) => res.status(status).json({ success: true,  ...data });
const fail = (res, msg,  status = 400) => res.status(status).json({ success: false, message: msg });

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
      returnUrl:         `${process.env.PLATFORM_URL}/payments/khalti/return?milestoneId=${milestone._id}`,
    });

    const transaction = await Transaction.create({
      project:              milestone.project,
      milestone:            milestone._id,
      payer:                milestone.client,
      receiver:             milestone.freelancer,
      amount:               Math.round(milestone.amount * 100),
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

    milestone.release();
    await milestone.save();

    transaction.recordStatusChange('released', { note: 'Milestone approved by client' });
    await transaction.save();

    await User.findByIdAndUpdate(milestone.freelancer, { $inc: { walletBalance: transaction.netAmount } });

    await gamificationService.awardPoints(
      milestone.freelancer,
      POINT_VALUES.MILESTONE_APPROVED,
      `Milestone approved: ${milestone.name}`
    );

 const project = await Project.findById(milestone.project);
if (project) {
  await project.recalculateProgress();
}

await reputationService.recalculateTrustScore(milestone.freelancer);
await gamificationService.checkAndAwardBadgesForUser(milestone.freelancer, {
  awardedForLabel: `Triggered by milestone approval: ${milestone.name}`,
  relatedProject: milestone.project,
});

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