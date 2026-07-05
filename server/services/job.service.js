'use strict';

const Job      = require('../models/Job');
const Proposal = require('../models/Proposal');
const { buildPaginationQuery } = require('../helpers/paginate');

/* ══════════════════════════════════════════════════════════════════
   Helper: normalise skillsRequired into a clean array
   Accepts either an array or a comma-separated string.
══════════════════════════════════════════════════════════════════ */
const normaliseSkills = (skillsRequired) => {
  if (Array.isArray(skillsRequired)) return skillsRequired;
  if (typeof skillsRequired === 'string') {
    return skillsRequired.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

/* ══════════════════════════════════════════════════════════════════
   getAllJobs — public job board with filters + pagination
══════════════════════════════════════════════════════════════════ */
exports.getAllJobs = async (query) => {
  const {
    search, category, budgetType,
    status = 'open', minBudget, maxBudget,
    page = 1, limit = 12,
  } = query;

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

  return { jobs, pagination: { page: Number(page), limit: limitN, totalDocs, totalPages } };
};

/* ══════════════════════════════════════════════════════════════════
   getJobById — public single job view, includes proposal count
══════════════════════════════════════════════════════════════════ */
exports.getJobById = async (jobId) => {
  const job = await Job.findById(jobId)
    .populate('client', 'firstName lastName email avatarUrl trustScore')
    .lean();

  if (!job) {
    const err = new Error('Job not found');
    err.statusCode = 404;
    throw err;
  }

  if (job.isArchived) {
    const err = new Error('Job is no longer available');
    err.statusCode = 410;
    throw err;
  }

  const proposalCount = await Proposal.countDocuments({ job: job._id });

  return { ...job, proposalCount };
};

/* ══════════════════════════════════════════════════════════════════
   createJob — client only
══════════════════════════════════════════════════════════════════ */
exports.createJob = async (clientId, body) => {
  const { title, description, budgetType, budgetAmount,
          skillsRequired, category, deliveryTimeframe } = body;

  const job = await Job.create({
    client:            clientId,
    title,
    description,
    budgetType,
    budgetAmount:      Number(budgetAmount),
    skillsRequired:    normaliseSkills(skillsRequired),
    category,
    deliveryTimeframe: deliveryTimeframe ? Number(deliveryTimeframe) : undefined,
  });

  return job;
};

/* ══════════════════════════════════════════════════════════════════
   updateJob — owning client (or admin) only, and only while 'open'
══════════════════════════════════════════════════════════════════ */
exports.updateJob = async (jobId, userId, userRole, body) => {
  const job = await Job.findById(jobId);
  if (!job) {
    const err = new Error('Job not found');
    err.statusCode = 404;
    throw err;
  }

  if (job.client.toString() !== userId.toString() && userRole !== 'admin') {
    const err = new Error('Forbidden — you do not own this job');
    err.statusCode = 403;
    throw err;
  }

  if (job.status !== 'open') {
    const err = new Error('Only open jobs can be edited');
    err.statusCode = 400;
    throw err;
  }

  const allowedFields = [
    'title', 'description', 'budgetType', 'budgetAmount',
    'skillsRequired', 'category', 'deliveryTimeframe',
  ];

  allowedFields.forEach((field) => {
    if (body[field] === undefined) return;
    job[field] = field === 'skillsRequired'
      ? normaliseSkills(body[field])
      : body[field];
  });

  await job.save();
  return job;
};

/* ══════════════════════════════════════════════════════════════════
   deleteJob — owning client (or admin) only, soft-delete
══════════════════════════════════════════════════════════════════ */
exports.deleteJob = async (jobId, userId, userRole) => {
  const job = await Job.findById(jobId);
  if (!job) {
    const err = new Error('Job not found');
    err.statusCode = 404;
    throw err;
  }

  if (job.client.toString() !== userId.toString() && userRole !== 'admin') {
    const err = new Error('Forbidden — you do not own this job');
    err.statusCode = 403;
    throw err;
  }

  if (job.status === 'in_progress') {
    const err = new Error('Cannot delete a job that is currently in progress');
    err.statusCode = 400;
    throw err;
  }

  job.isArchived = true;
  job.status     = 'completed';
  await job.save();
};

/* ══════════════════════════════════════════════════════════════════
   getMyJobs — jobs posted by the authenticated client
══════════════════════════════════════════════════════════════════ */
exports.getMyJobs = async (clientId, query) => {
  const { status, page = 1, limit = 10 } = query;
  const filter = { client: clientId, isArchived: false };
  if (status) filter.status = status;

  const { skip, limitN, totalDocs, totalPages } =
    await buildPaginationQuery(Job, filter, page, limit);

  const jobs = await Job.find(filter)
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitN)
    .lean();

  return { jobs, pagination: { page: Number(page), limit: limitN, totalDocs, totalPages } };
};

/* ══════════════════════════════════════════════════════════════════
   markJobComplete — the ASSIGNED FREELANCER only (verified via an
   accepted Proposal on this job, since Job.js has no direct field
   linking a job to a working freelancer). Only valid from 'in_progress'.
══════════════════════════════════════════════════════════════════ */
exports.markJobComplete = async (jobId, freelancerId) => {
  const job = await Job.findById(jobId);
  if (!job) {
    const err = new Error('Job not found');
    err.statusCode = 404;
    throw err;
  }

  if (job.status !== 'in_progress') {
    const err = new Error('Only jobs currently in progress can be marked completed');
    err.statusCode = 400;
    throw err;
  }

  const acceptedProposal = await Proposal.findOne({
    job: jobId,
    freelancer: freelancerId,
    status: 'accepted',
  });

  if (!acceptedProposal) {
    const err = new Error('Forbidden — you do not have an accepted proposal on this job');
    err.statusCode = 403;
    throw err;
  }

  job.status = 'completed';
  await job.save();
  return job;
};