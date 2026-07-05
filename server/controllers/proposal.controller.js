'use strict';

const Proposal = require('../models/Proposal');
const Job      = require('../models/Job');
const Project  = require('../models/Project');

const ok   = (res, data, status = 200) => res.status(status).json({ success: true,  ...data });
const fail = (res, msg,  status = 400) => res.status(status).json({ success: false, message: msg });

/* ══════════════════════════════════════════════════════════════════
   POST /api/proposals
   Freelancer only. Submit a new bid on an open job.
══════════════════════════════════════════════════════════════════ */
exports.createProposal = async (req, res) => {
  try {
    const { job: jobId, bidAmount, deliveryTimeframe, coverLetter, attachedMilestones } = req.body;

    const job = await Job.findById(jobId);
    if (!job) return fail(res, 'Job not found', 404);
    if (job.isArchived || job.status !== 'open') {
      return fail(res, 'This job is no longer accepting proposals', 400);
    }

    const proposal = await Proposal.create({
      job:               jobId,
      freelancer:        req.user._id,
      bidAmount,
      deliveryTimeframe,
      coverLetter,
      attachedMilestones,
    });

    ok(res, { message: 'Proposal submitted successfully', proposal }, 201);
  } catch (err) {
    if (err.code === 11000) {
      return fail(res, 'You have already submitted a proposal for this job', 409);
    }
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map((e) => e.message).join(', ');
      return fail(res, msg);
    }
    console.error('[proposal.createProposal]', err);
    fail(res, err.message, 500);
  }
};

/* ══════════════════════════════════════════════════════════════════
   GET /api/proposals
   Returns the authenticated user's own proposals (freelancer)
   or proposals on jobs they posted (client).
   Supports optional ?status= filter.

   NOTE: User schema field is `name` (not firstName/lastName), and
   trustScore lives on FreelancerProfile, not User — removed from this
   populate since it was always silently undefined here.
══════════════════════════════════════════════════════════════════ */
exports.getProposals = async (req, res) => {
  try {
    const { status } = req.query;
    let filter;

    if (req.user.role === 'freelancer') {
      filter = { freelancer: req.user._id };
    } else if (req.user.role === 'client') {
      const myJobIds = await Job.find({ client: req.user._id }).distinct('_id');
      filter = { job: { $in: myJobIds } };
    } else {
      // admin or other roles: no implicit scoping
      filter = {};
    }

    if (status) filter.status = status;

    const proposals = await Proposal.find(filter)
      .populate('job', 'title budgetType budgetAmount status')
      .populate('freelancer', 'name email avatarUrl')
      .sort({ createdAt: -1 })
      .lean();

    ok(res, { proposals });
  } catch (err) {
    console.error('[proposal.getProposals]', err);
    fail(res, err.message, 500);
  }
};

/* ══════════════════════════════════════════════════════════════════
   GET /api/proposals/:id
   Freelancer who submitted it, or the client who owns the job.
══════════════════════════════════════════════════════════════════ */
exports.getProposalById = async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id)
      .populate('job', 'title client budgetType budgetAmount status')
      .populate('freelancer', 'name email avatarUrl');

    if (!proposal) return fail(res, 'Proposal not found', 404);

    const isFreelancerOwner = proposal.freelancer._id.toString() === req.user._id.toString();
    const isClientOwner     = proposal.job.client.toString() === req.user._id.toString();

    if (!isFreelancerOwner && !isClientOwner && req.user.role !== 'admin') {
      return fail(res, 'Forbidden', 403);
    }

    ok(res, { proposal });
  } catch (err) {
    console.error('[proposal.getProposalById]', err);
    fail(res, err.message, 500);
  }
};

/* ══════════════════════════════════════════════════════════════════
   GET /api/proposals/job/:jobId
   Client only — all proposals submitted for one of their jobs.
══════════════════════════════════════════════════════════════════ */
exports.getProposalsForJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return fail(res, 'Job not found', 404);

    if (job.client.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return fail(res, 'Forbidden — you do not own this job', 403);
    }

    const proposals = await Proposal.find({ job: req.params.jobId })
      .populate('freelancer', 'name email avatarUrl')
      .sort({ matchScore: -1, createdAt: -1 })
      .lean();

    ok(res, { proposals });
  } catch (err) {
    console.error('[proposal.getProposalsForJob]', err);
    fail(res, err.message, 500);
  }
};

/* ══════════════════════════════════════════════════════════════════
   PATCH /api/proposals/:id
   Freelancer owner only. Edit bid details — only while still pending.
══════════════════════════════════════════════════════════════════ */
exports.updateProposal = async (req, res) => {
  try {
    const proposal = await Proposal.findById(req.params.id);
    if (!proposal) return fail(res, 'Proposal not found', 404);

    if (proposal.freelancer.toString() !== req.user._id.toString()) {
      return fail(res, 'Forbidden — you do not own this proposal', 403);
    }
    if (proposal.status !== 'pending') {
      return fail(res, 'Only pending proposals can be edited');
    }

    const allowedFields = ['bidAmount', 'deliveryTimeframe', 'coverLetter', 'attachedMilestones'];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) proposal[field] = req.body[field];
    });

    await proposal.save();
    ok(res, { message: 'Proposal updated successfully', proposal });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map((e) => e.message).join(', ');
      return fail(res, msg);
    }
    console.error('[proposal.updateProposal]', err);
    fail(res, err.message, 500);
  }
};

/* ══════════════════════════════════════════════════════════════════
   PATCH /api/proposals/:id/status
   Client owner only. Accept or reject a proposal on their job.
   (Accepting auto-rejects sibling proposals via the model's post-save hook.)

   Accepting a proposal:
     1. Flips the parent Job's status from 'open' to 'in_progress'.
     2. Creates the Project document — the container that chat,
        milestones, and file management all depend on. Without this,
        no Conversation can ever be created and the workspace page
        (/workspace/:projectId) has nothing to route to.
══════════════════════════════════════════════════════════════════ */
exports.updateProposalStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['accepted', 'rejected'].includes(status)) {
      return fail(res, "status must be 'accepted' or 'rejected'");
    }

    const proposal = await Proposal.findById(req.params.id).populate('job');
    if (!proposal) return fail(res, 'Proposal not found', 404);

    if (proposal.job.client.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return fail(res, 'Forbidden — you do not own the job this proposal is for', 403);
    }
    if (proposal.status !== 'pending') {
      return fail(res, 'This proposal has already been decided');
    }

    proposal.status = status;
    await proposal.save();

    let project = null;

    if (status === 'accepted') {
      if (proposal.job.status === 'open') {
        proposal.job.status = 'in_progress';
        await proposal.job.save();
      }

      project = await Project.create({
        client:       proposal.job.client,
        freelancer:   proposal.freelancer,
        job:          proposal.job._id,
        proposal:     proposal._id,
        agreedAmount: proposal.bidAmount,
      });
    }

    ok(res, { message: `Proposal ${status}`, proposal, project });
  } catch (err) {
    console.error('[proposal.updateProposalStatus]', err);
    fail(res, err.message, 500);
  }
};