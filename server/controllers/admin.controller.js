'use strict';

const mongoose  = require('mongoose');
const User      = require('../models/User');
const Dispute   = require('../models/Dispute');
const Project   = require('../models/Project');
const Transaction = require('../models/Transaction');

/* ══════════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════════ */

const ok   = (res, data, status = 200) => res.status(status).json({ success: true,  ...data });
const fail = (res, msg,  status = 400) => res.status(status).json({ success: false, message: msg });

const toObjectId = (id) => {
  try   { return new mongoose.Types.ObjectId(id); }
  catch { return null; }
};

/* ══════════════════════════════════════════════════════════════════
   PLATFORM OVERVIEW
══════════════════════════════════════════════════════════════════ */

/**
 * GET /api/admin/overview
 * High-level platform health metrics.
 */
exports.getOverview = async (req, res) => {
  try {
    const [
      totalUsers,
      totalFreelancers,
      totalClients,
      bannedUsers,
      totalProjects,
      activeProjects,
      openDisputes,
      resolvedDisputes,
      escalatedDisputes,
      recentSignups,
      escrowAgg,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'freelancer' }),
      User.countDocuments({ role: 'client' }),
      User.countDocuments({ isBanned: true }),
      Project.countDocuments(),
      Project.countDocuments({ status: { $in: ['active', 'in_progress'] } }),
      Dispute.countDocuments({ status: { $in: ['open', 'under_review', 'awaiting_info'] } }),
      Dispute.countDocuments({ status: { $in: ['resolved', 'closed'] } }),
      Dispute.countDocuments({ isEscalated: true, status: { $nin: ['resolved', 'closed'] } }),
      User.find()
        .sort({ createdAt: -1 })
        .limit(8)
        .select('firstName lastName email role trustScore isBanned createdAt'),
      Transaction.aggregate([
        { $match: { status: 'held' } },
        { $group: { _id: '$currency', total: { $sum: '$amount' } } },
      ]),
    ]);

    // Shape escrow totals
    const escrowHeld = {};
    escrowAgg.forEach(({ _id, total }) => { escrowHeld[_id] = total; });

    ok(res, {
      overview: {
        users:    { total: totalUsers, freelancers: totalFreelancers, clients: totalClients, banned: bannedUsers },
        projects: { total: totalProjects, active: activeProjects },
        disputes: { open: openDisputes, resolved: resolvedDisputes, escalated: escalatedDisputes },
        escrowHeld,
      },
      recentSignups,
    });
  } catch (err) {
    console.error('[admin.getOverview]', err);
    fail(res, 'Failed to load overview', 500);
  }
};

/* ══════════════════════════════════════════════════════════════════
   USER MANAGEMENT
══════════════════════════════════════════════════════════════════ */

/**
 * GET /api/admin/users
 * Paginated user list with optional search & role filter.
 */
exports.listUsers = async (req, res) => {
  try {
    const {
      page   = 1,
      limit  = 20,
      search = '',
      role,
      banned,
    } = req.query;

    const query = {};
    if (role)               query.role     = role;
    if (banned === 'true')  query.isBanned = true;
    if (banned === 'false') query.isBanned = { $ne: true };
    if (search.trim()) {
      const re = new RegExp(search.trim(), 'i');
      query.$or = [{ firstName: re }, { lastName: re }, { email: re }];
    }

    const skip  = (Number(page) - 1) * Number(limit);
    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select('-passwordHash'),
      User.countDocuments(query),
    ]);

    ok(res, { users, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error('[admin.listUsers]', err);
    fail(res, 'Failed to list users', 500);
  }
};

/**
 * GET /api/admin/users/:id
 * Full user detail for admin review.
 */
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-passwordHash');
    if (!user) return fail(res, 'User not found', 404);
    ok(res, { user });
  } catch (err) {
    console.error('[admin.getUser]', err);
    fail(res, 'Failed to fetch user', 500);
  }
};

/**
 * PATCH /api/admin/users/:id/ban
 * Body: { banned: boolean, reason?: string }
 * Toggle account ban status.
 */
exports.toggleBan = async (req, res) => {
  try {
    const { banned, reason = '' } = req.body;
    if (typeof banned !== 'boolean') return fail(res, '`banned` must be a boolean');

    const user = await User.findById(req.params.id);
    if (!user) return fail(res, 'User not found', 404);

    // Prevent admins from banning other admins
    if (user.role === 'admin') return fail(res, 'Cannot ban an admin account', 403);

    user.isBanned  = banned;
    user.banReason = banned ? reason : '';
    user.bannedAt  = banned ? new Date() : null;
    user.bannedBy  = banned ? req.user._id : null;

    await user.save();

    ok(res, {
      message: `User ${banned ? 'banned' : 'unbanned'} successfully`,
      user: { _id: user._id, isBanned: user.isBanned, banReason: user.banReason },
    });
  } catch (err) {
    console.error('[admin.toggleBan]', err);
    fail(res, 'Failed to update ban status', 500);
  }
};

/**
 * PATCH /api/admin/users/:id/trust-score
 * Body: { trustScore: number }
 * Manually override a user's trust score.
 */
exports.updateTrustScore = async (req, res) => {
  try {
    const { trustScore } = req.body;
    const score = Number(trustScore);
    if (isNaN(score) || score < 0 || score > 100) {
      return fail(res, 'trustScore must be a number between 0 and 100');
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { trustScore: score },
      { new: true, select: '-passwordHash' }
    );
    if (!user) return fail(res, 'User not found', 404);

    ok(res, { message: 'Trust score updated', user });
  } catch (err) {
    console.error('[admin.updateTrustScore]', err);
    fail(res, 'Failed to update trust score', 500);
  }
};

/**
 * PATCH /api/admin/users/:id/role
 * Body: { role: 'client' | 'freelancer' | 'admin' }
 * Change a user's platform role.
 */
exports.updateRole = async (req, res) => {
  try {
    const { role } = req.body;
    const valid = ['client', 'freelancer', 'admin'];
    if (!valid.includes(role)) return fail(res, `role must be one of: ${valid.join(', ')}`);

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, select: '-passwordHash' }
    );
    if (!user) return fail(res, 'User not found', 404);

    ok(res, { message: 'Role updated', user });
  } catch (err) {
    console.error('[admin.updateRole]', err);
    fail(res, 'Failed to update role', 500);
  }
};

/* ══════════════════════════════════════════════════════════════════
   DISPUTE MANAGEMENT
══════════════════════════════════════════════════════════════════ */

/**
 * GET /api/admin/disputes
 * Paginated dispute queue with optional status filter.
 */
exports.listDisputes = async (req, res) => {
  try {
    const {
      page   = 1,
      limit  = 15,
      status,
      priority,
    } = req.query;

    const query = {};
    if (status)   query.status   = status;
    if (priority) query.priority = priority;

    const skip = (Number(page) - 1) * Number(limit);
    const [disputes, total] = await Promise.all([
      Dispute.find(query)
        .sort({ isEscalated: -1, createdAt: 1 })
        .skip(skip)
        .limit(Number(limit))
        .populate('initiator',  'firstName lastName email role')
        .populate('respondent', 'firstName lastName email role')
        .populate('project',    'title totalAmount escrowStatus')
        .populate('milestone',  'title amount status')
        .populate('assignedAdmin', 'firstName lastName'),
      Dispute.countDocuments(query),
    ]);

    ok(res, { disputes, total, page: Number(page), pages: Math.ceil(total / Number(limit)) });
  } catch (err) {
    console.error('[admin.listDisputes]', err);
    fail(res, 'Failed to list disputes', 500);
  }
};

/**
 * GET /api/admin/disputes/:id
 * Full dispute detail including all evidence and action log.
 */
exports.getDispute = async (req, res) => {
  try {
    const dispute = await Dispute.findById(req.params.id)
      .populate('initiator',    'firstName lastName email role trustScore')
      .populate('respondent',   'firstName lastName email role trustScore')
      .populate('project',      'title description totalAmount escrowStatus clientId freelancerId')
      .populate('milestone',    'title amount status dueDate')
      .populate('assignedAdmin','firstName lastName email')
      .populate('resolvedBy',   'firstName lastName')
      .populate('adminActions.admin', 'firstName lastName');

    if (!dispute) return fail(res, 'Dispute not found', 404);
    ok(res, { dispute });
  } catch (err) {
    console.error('[admin.getDispute]', err);
    fail(res, 'Failed to fetch dispute', 500);
  }
};

/**
 * PATCH /api/admin/disputes/:id/assign
 * Body: { adminId?: string }  (defaults to calling admin)
 * Assign dispute to an admin.
 */
exports.assignDispute = async (req, res) => {
  try {
    const adminId = req.body.adminId
      ? toObjectId(req.body.adminId)
      : req.user._id;

    if (!adminId) return fail(res, 'Invalid adminId');

    const dispute = await Dispute.findByIdAndUpdate(
      req.params.id,
      { assignedAdmin: adminId, status: 'under_review' },
      { new: true }
    );
    if (!dispute) return fail(res, 'Dispute not found', 404);

    ok(res, { message: 'Dispute assigned', dispute });
  } catch (err) {
    console.error('[admin.assignDispute]', err);
    fail(res, 'Failed to assign dispute', 500);
  }
};

/**
 * POST /api/admin/disputes/:id/action
 * Body: { action, note?, amountNPR? }
 * Log an admin action without yet closing the dispute.
 */
exports.addDisputeAction = async (req, res) => {
  try {
    const { action, note = '', amountNPR = 0 } = req.body;
    const allowed = [
      'release_to_freelancer',
      'refund_to_client',
      'request_more_info',
      'escalate',
      'close_no_action',
    ];
    if (!allowed.includes(action)) {
      return fail(res, `action must be one of: ${allowed.join(', ')}`);
    }

    const dispute = await Dispute.findById(req.params.id);
    if (!dispute) return fail(res, 'Dispute not found', 404);
    if (['resolved', 'closed'].includes(dispute.status)) {
      return fail(res, 'Cannot act on a resolved or closed dispute');
    }

    dispute.adminActions.push({
      admin:     req.user._id,
      action,
      note,
      amountNPR: Number(amountNPR),
    });

    if (action === 'escalate') {
      dispute.isEscalated = true;
      dispute.priority    = 'critical';
      dispute.status      = 'under_review';
    } else if (action === 'request_more_info') {
      dispute.status = 'awaiting_info';
    }

    await dispute.save();
    ok(res, { message: 'Action recorded', dispute });
  } catch (err) {
    console.error('[admin.addDisputeAction]', err);
    fail(res, 'Failed to record action', 500);
  }
};

/**
 * PATCH /api/admin/disputes/:id/resolve
 * Body: { resolution, resolutionNote?, amountNPR? }
 * Settle a dispute and trigger escrow adjustment.
 *
 * resolution:
 *   'release_to_freelancer' — full escrowed amount goes to freelancer
 *   'refund_to_client'      — full escrowed amount refunded to client
 *   'split'                 — 50/50 split (or use amountNPR as freelancer portion)
 *   'no_action'             — dispute closed with no financial change
 */
exports.resolveDispute = async (req, res) => {
  try {
    const { resolution, resolutionNote = '', amountNPR } = req.body;
    const validResolutions = [
      'release_to_freelancer',
      'refund_to_client',
      'split',
      'no_action',
    ];
    if (!validResolutions.includes(resolution)) {
      return fail(res, `resolution must be one of: ${validResolutions.join(', ')}`);
    }

    const dispute = await Dispute.findById(req.params.id)
      .populate('project');
    if (!dispute) return fail(res, 'Dispute not found', 404);
    if (['resolved', 'closed'].includes(dispute.status)) {
      return fail(res, 'Dispute is already resolved');
    }

    /* ── Update dispute document ── */
    dispute.status         = 'resolved';
    dispute.resolution     = resolution;
    dispute.resolutionNote = resolutionNote;
    dispute.resolvedAt     = new Date();
    dispute.resolvedBy     = req.user._id;

    // Log the final ruling as an admin action
    dispute.adminActions.push({
      admin:     req.user._id,
      action:    resolution === 'split' ? 'release_to_freelancer' : resolution,
      note:      resolutionNote,
      amountNPR: Number(amountNPR || dispute.escrowAmount),
    });

    await dispute.save();

    /* ── Update project escrow status ── */
    if (dispute.project) {
      const escrowStatus =
        resolution === 'release_to_freelancer' ? 'released' :
        resolution === 'refund_to_client'      ? 'refunded' :
        resolution === 'split'                 ? 'split'    : 'closed';

      await Project.findByIdAndUpdate(dispute.project._id, {
        escrowStatus,
        [`disputeResolution`]: resolution,
      });
    }

    ok(res, { message: 'Dispute resolved successfully', dispute });
  } catch (err) {
    console.error('[admin.resolveDispute]', err);
    fail(res, 'Failed to resolve dispute', 500);
  }
};

/* ══════════════════════════════════════════════════════════════════
   ESCROW MANUAL ADJUSTMENTS
══════════════════════════════════════════════════════════════════ */

/**
 * POST /api/admin/escrow/:projectId/adjust
 * Body: { action: 'release' | 'refund', amount, note }
 * Manually release or refund escrow outside of the dispute flow.
 */
exports.adjustEscrow = async (req, res) => {
  try {
    const { action, amount, note = '' } = req.body;
    if (!['release', 'refund'].includes(action)) {
      return fail(res, 'action must be "release" or "refund"');
    }
    if (!amount || Number(amount) <= 0) {
      return fail(res, 'amount must be a positive number');
    }

    const project = await Project.findById(req.params.projectId);
    if (!project) return fail(res, 'Project not found', 404);

    // Record the manual adjustment as a transaction
    await Transaction.create({
      projectId:    project._id,
      clientId:     project.clientId,
      freelancerId: project.freelancerId,
      amount:       Number(amount),
      currency:     'NPR',
      platformFee:  0,
      netAmount:    Number(amount),
      gateway:      'manual_admin',
      gatewayRef:   `admin_${Date.now()}`,
      status:       action === 'release' ? 'released' : 'refunded',
      note,
      processedBy:  req.user._id,
    });

    await Project.findByIdAndUpdate(project._id, {
      escrowStatus: action === 'release' ? 'released' : 'refunded',
    });

    ok(res, { message: `Escrow ${action} processed successfully` });
  } catch (err) {
    console.error('[admin.adjustEscrow]', err);
    fail(res, 'Failed to process escrow adjustment', 500);
  }
};

/* ══════════════════════════════════════════════════════════════════
   PLATFORM REPORTS
══════════════════════════════════════════════════════════════════ */

/**
 * GET /api/admin/reports/summary
 * Aggregated monthly signup, dispute, and transaction data.
 */
exports.getReportSummary = async (req, res) => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      newUsersThisMonth,
      disputesThisMonth,
      transactionsAgg,
      topFreelancers,
    ] = await Promise.all([
      User.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Dispute.countDocuments({ createdAt: { $gte: thirtyDaysAgo } }),
      Transaction.aggregate([
        { $match: { status: 'released', createdAt: { $gte: thirtyDaysAgo } } },
        { $group: { _id: '$currency', totalVolume: { $sum: '$netAmount' }, count: { $sum: 1 } } },
      ]),
      User.find({ role: 'freelancer' })
        .sort({ trustScore: -1 })
        .limit(5)
        .select('firstName lastName email trustScore'),
    ]);

    ok(res, {
      report: {
        newUsersThisMonth,
        disputesThisMonth,
        transactionVolume: transactionsAgg,
        topFreelancers,
      },
    });
  } catch (err) {
    console.error('[admin.getReportSummary]', err);
    fail(res, 'Failed to generate report', 500);
  }
};