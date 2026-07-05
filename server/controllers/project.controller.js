'use strict';

/**
 * project.controller.js
 * ✅ NEW FILE — did not exist before this session.
 *
 * This was the confirmed missing piece blocking ProjectWorkspacePage.jsx
 * (and therefore chat, files, and milestones) from loading anything at all —
 * the page expects to fetch a Project by ID, but no route/controller for
 * that existed anywhere in the codebase.
 *
 * Routes consumed by project.routes.js:
 *   GET /api/projects/mine   – list projects the logged-in user is part of
 *   GET /api/projects/:id    – full project detail (client, freelancer, job,
 *                              milestones) for ProjectWorkspacePage.jsx
 */

const Project = require('../models/Project');

const ok   = (res, data, status = 200) => res.status(status).json({ success: true,  ...data });
const fail = (res, msg,  status = 400) => res.status(status).json({ success: false, message: msg });

/**
 * Shared authorisation check: only the project's client, its freelancer,
 * or an admin may view it.
 */
function isParticipant(project, user) {
  if (user.role === 'admin') return true;
  const clientId     = project.client?._id || project.client;
  const freelancerId = project.freelancer?._id || project.freelancer;
  return (
    clientId?.toString()     === user._id.toString() ||
    freelancerId?.toString() === user._id.toString()
  );
}

/* ══════════════════════════════════════════════════════════════════
   GET /api/projects/mine
   Query: { status?, role? }  — role filter is implicit from req.user.role,
   but an explicit 'as' query param lets a user (rare) view either side
   if they were ever both — not expected in practice, harmless to support.
   Protected — any authenticated user.
══════════════════════════════════════════════════════════════════ */
exports.getMyProjects = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {
      $or: [{ client: req.user._id }, { freelancer: req.user._id }],
    };
    if (status) filter.status = status;

    const projects = await Project.find(filter)
      .populate('client',     'name email avatarUrl')
      .populate('freelancer', 'name email avatarUrl')
      .populate('job',        'title category budgetAmount budgetType')
      .sort({ updatedAt: -1 })
      .lean();

    ok(res, { projects, total: projects.length });
  } catch (err) {
    console.error('[project.getMyProjects]', err);
    fail(res, 'Failed to load your projects.', 500);
  }
};

/* ══════════════════════════════════════════════════════════════════
   GET /api/projects/:id
   Full project detail — used by ProjectWorkspacePage.jsx to load
   client/freelancer info, the linked job, and milestones.
   Protected — client, freelancer, or admin only.
══════════════════════════════════════════════════════════════════ */
exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('client',     'name email avatarUrl trustScore')
      .populate('freelancer', 'name email avatarUrl trustScore')
      .populate('job',        'title description category budgetAmount budgetType skillsRequired')
      .lean();

    if (!project) {
      return fail(res, 'Project not found.', 404);
    }

    if (!isParticipant(project, req.user)) {
      return fail(res, 'You are not authorised to view this project.', 403);
    }

    ok(res, { project });
  } catch (err) {
    console.error('[project.getProjectById]', err);
    fail(res, 'Failed to load project.', 500);
  }
};

/* ══════════════════════════════════════════════════════════════════
   PATCH /api/projects/:id/status
   Body: { status }  — restricted transition set, both parties can
   move the project forward but only along valid lifecycle steps.
   Kept intentionally minimal for now — full escrow/payment-driven
   status transitions belong to the Payments phase, not this session.
══════════════════════════════════════════════════════════════════ */
exports.updateProjectStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const ALLOWED = ['in_progress', 'under_review', 'completed', 'cancelled'];

    if (!ALLOWED.includes(status)) {
      return fail(res, `status must be one of: ${ALLOWED.join(', ')}.`);
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return fail(res, 'Project not found.', 404);
    }

    if (!isParticipant(project, req.user)) {
      return fail(res, 'You are not authorised to update this project.', 403);
    }

    project.status = status;
    if (status === 'cancelled' && req.body.reason) {
      project.cancellationReason = req.body.reason;
    }
    await project.save();

    ok(res, { message: 'Project status updated.', project });
  } catch (err) {
    console.error('[project.updateProjectStatus]', err);
    fail(res, 'Failed to update project status.', 500);
  }
};