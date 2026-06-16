'use strict';

const Job      = require('../models/Job');
const Proposal = require('../models/Proposal');
const { buildPaginationQuery } = require('../helpers/paginate');
const { validateJobFields }    = require('../utils/validate');

const ok   = (res, data, status = 200) => res.status(status).json({ success: true,  ...data });
const fail = (res, msg,  status = 400) => res.status(status).json({ success: false, message: msg });

/* ══════════════════════════════════════════════════════════════════
   GET /api/jobs
   Public. Supports: search, category, budgetType, status, page, limit
══════════════════════════════════════════════════════════════════ */
exports.getAllJobs = async (req, res) => {
  try {
    const {
      search, category, budgetType,
      status = 'open', minBudget, maxBudget,
      page = 1, limit = 12,
    } = req.query;

    const filter = { isArchived: false };
    if (status)     filter.status     = status;
    if (category)   filter.category   = category;
    if (budgetType) filter.budgetType = budgetType;
    if (minBudget || maxBudget) {
      filter.budgetAmount = {};
      if (minBudget) filter.budgetAmount.$gte = Number(minBudget);
      if (maxBudget) filter.budgetAmount.$lte = Number(maxBudget);
    }
    if (search && search.trim()) {
      filter.$text = { $search: search.trim() };
    }

    const { skip, limitN, totalPages, totalDocs } =
      await buildPaginationQuery(Job, filter, page, limit);

    const jobs = await Job.find(filter)
      .sort(search ? { score: { $meta: 'textScore' } } : { createdAt: -1 })
      .skip(skip)
      .limit(limitN)
      .populate('client', 'firstName lastName email')
      .lean();

    ok(res, { jobs, pagination: { page: Number(page), limit: limitN, totalDocs, totalPages } });
  } catch (err) {
    console.error('[job.getAllJobs]', err);
    fail(res, err.message, 500);
  }
};

/* ══════════════════════════════════════════════════════════════════
   GET /api/jobs/:id
   Public.
══════════════════════════════════════════════════════════════════ */
exports.getJobById = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('client', 'firstName lastName email avatarUrl trustScore')
      .lean();

    if (!job) return fail(res, 'Job not found', 404);
    if (job.isArchived) return fail(res, 'Job is no longer available', 410);

    // Proposal count for this job
    const proposalCount = await Proposal.countDocuments({ job: job._id });

    ok(res, { job: { ...job, proposalCount } });
  } catch (err) {
    console.error('[job.getJobById]', err);
    fail(res, err.message, 500);
  }
};

/* ══════════════════════════════════════════════════════════════════
   POST /api/jobs
   Client only. Protected.
══════════════════════════════════════════════════════════════════ */
exports.createJob = async (req, res) => {
  try {
    const validationError = validateJobFields(req.body);
    if (validationError) return fail(res, validationError);

    const { title, description, budgetType, budgetAmount,
            skillsRequired, category, deliveryTimeframe } = req.body;

    const job = await Job.create({
      client:           req.user._id,
      title,
      description,
      budgetType,
      budgetAmount:     Number(budgetAmount),
      skillsRequired:   Array.isArray(skillsRequired)
                          ? skillsRequired
                          : skillsRequired.split(',').map((s) => s.trim()),
      category,
      deliveryTimeframe: deliveryTimeframe ? Number(deliveryTimeframe) : undefined,
    });

    ok(res, { message: 'Job posted successfully', job }, 201);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map((e) => e.message).join(', ');
      return fail(res, msg);
    }
    console.error('[job.createJob]', err);
    fail(res, err.message, 500);
  }
};

/* ══════════════════════════════════════════════════════════════════
   PUT /api/jobs/:id
   Client owner only. Protected.
══════════════════════════════════════════════════════════════════ */
exports.updateJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return fail(res, 'Job not found', 404);

    // Only the owning client or admin can edit
    if (
      job.client.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return fail(res, 'Forbidden — you do not own this job', 403);
    }

    if (job.status !== 'open') {
      return fail(res, 'Only open jobs can be edited');
    }

    const allowedFields = [
      'title', 'description', 'budgetType', 'budgetAmount',
      'skillsRequired', 'category', 'deliveryTimeframe',
    ];
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) job[field] = req.body[field];
    });

    await job.save();
    ok(res, { message: 'Job updated successfully', job });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map((e) => e.message).join(', ');
      return fail(res, msg);
    }
    console.error('[job.updateJob]', err);
    fail(res, err.message, 500);
  }
};

/* ══════════════════════════════════════════════════════════════════
   DELETE /api/jobs/:id
   Client owner or admin. Soft-delete via isArchived flag.
══════════════════════════════════════════════════════════════════ */
exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return fail(res, 'Job not found', 404);

    if (
      job.client.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return fail(res, 'Forbidden — you do not own this job', 403);
    }

    if (job.status === 'in_progress') {
      return fail(res, 'Cannot delete a job that is currently in progress');
    }

    job.isArchived = true;
    job.status     = 'completed'; // treat as closed
    await job.save();

    ok(res, { message: 'Job removed successfully' });
  } catch (err) {
    console.error('[job.deleteJob]', err);
    fail(res, err.message, 500);
  }
};

/* ══════════════════════════════════════════════════════════════════
   GET /api/jobs/my
   Returns jobs posted by the currently authenticated client.
══════════════════════════════════════════════════════════════════ */
exports.getMyJobs = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const filter = { client: req.user._id, isArchived: false };
    if (status) filter.status = status;

    const { skip, limitN, totalDocs, totalPages } =
      await buildPaginationQuery(Job, filter, page, limit);

    const jobs = await Job.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitN)
      .lean();

    ok(res, { jobs, pagination: { page: Number(page), limit: limitN, totalDocs, totalPages } });
  } catch (err) {
    console.error('[job.getMyJobs]', err);
    fail(res, err.message, 500);
  }
};