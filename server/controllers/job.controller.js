'use strict';

const jobService = require('../services/job.service');
const { validateJobFields } = require('../utils/validate');

const ok   = (res, data, status = 200) => res.status(status).json({ success: true,  ...data });
const fail = (res, msg,  status = 400) => res.status(status).json({ success: false, message: msg });

/* ══════════════════════════════════════════════════════════════════
   GET /api/jobs
   Public. Supports: search, category, budgetType, status, page, limit
══════════════════════════════════════════════════════════════════ */
exports.getAllJobs = async (req, res) => {
  try {
    const result = await jobService.getAllJobs(req.query);
    ok(res, result);
  } catch (err) {
    console.error('[job.getAllJobs]', err);
    fail(res, err.message, err.statusCode || 500);
  }
};

/* ══════════════════════════════════════════════════════════════════
   GET /api/jobs/:id
   Public.
══════════════════════════════════════════════════════════════════ */
exports.getJobById = async (req, res) => {
  try {
    const job = await jobService.getJobById(req.params.id);
    ok(res, { job });
  } catch (err) {
    console.error('[job.getJobById]', err);
    fail(res, err.message, err.statusCode || 500);
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

    const job = await jobService.createJob(req.user._id, req.body);
    ok(res, { message: 'Job posted successfully', job }, 201);
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map((e) => e.message).join(', ');
      return fail(res, msg);
    }
    console.error('[job.createJob]', err);
    fail(res, err.message, err.statusCode || 500);
  }
};

/* ══════════════════════════════════════════════════════════════════
   PUT /api/jobs/:id
   Client owner only. Protected.
══════════════════════════════════════════════════════════════════ */
exports.updateJob = async (req, res) => {
  try {
    const job = await jobService.updateJob(
      req.params.id,
      req.user._id,
      req.user.role,
      req.body
    );
    ok(res, { message: 'Job updated successfully', job });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map((e) => e.message).join(', ');
      return fail(res, msg);
    }
    console.error('[job.updateJob]', err);
    fail(res, err.message, err.statusCode || 500);
  }
};

/* ══════════════════════════════════════════════════════════════════
   DELETE /api/jobs/:id
   Client owner or admin. Soft-delete via isArchived flag.
══════════════════════════════════════════════════════════════════ */
exports.deleteJob = async (req, res) => {
  try {
    await jobService.deleteJob(req.params.id, req.user._id, req.user.role);
    ok(res, { message: 'Job removed successfully' });
  } catch (err) {
    console.error('[job.deleteJob]', err);
    fail(res, err.message, err.statusCode || 500);
  }
};

/* ══════════════════════════════════════════════════════════════════
   GET /api/jobs/my
   Returns jobs posted by the currently authenticated client.
══════════════════════════════════════════════════════════════════ */
exports.getMyJobs = async (req, res) => {
  try {
    const result = await jobService.getMyJobs(req.user._id, req.query);
    ok(res, result);
  } catch (err) {
    console.error('[job.getMyJobs]', err);
    fail(res, err.message, err.statusCode || 500);
  }
};

/* ══════════════════════════════════════════════════════════════════
   PATCH /api/jobs/:id/complete
   Assigned freelancer only (must hold an accepted Proposal on this
   job). Only valid while the job is 'in_progress'.
══════════════════════════════════════════════════════════════════ */
exports.markJobComplete = async (req, res) => {
  try {
    const job = await jobService.markJobComplete(req.params.id, req.user._id);
    ok(res, { message: 'Job marked as completed', job });
  } catch (err) {
    console.error('[job.markJobComplete]', err);
    fail(res, err.message, err.statusCode || 500);
  }
};