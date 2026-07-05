'use strict';

/**
 * project.controller.js
 *
 * Routes consumed by project.routes.js:
 *   GET    /api/projects/mine           – list projects the logged-in user is part of
 *   GET    /api/projects/:id            – full project detail
 *   PATCH  /api/projects/:id/status     – restricted lifecycle transitions
 *   POST   /api/projects/:id/files      – upload a project file (NEW)
 *   GET    /api/projects/:id/files      – list project files (NEW)
 *   DELETE /api/projects/:id/files/:fileId – delete a project file (NEW)
 */

const Project    = require('../models/Project');
const cloudinary = require('../config/cloudinary');

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
══════════════════════════════════════════════════════════════════ */
exports.getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('client',     'name email avatarUrl trustScore')
      .populate('freelancer', 'name email avatarUrl trustScore')
      .populate('job',        'title description category budgetAmount budgetType skillsRequired')
      .populate('files.uploadedBy', 'name avatarUrl')
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

/* ══════════════════════════════════════════════════════════════════
   POST /api/projects/:id/files
   Protected — participant only. Expects multipart/form-data with a
   single field named 'file' (parsed by projectFileUpload middleware,
   which populates req.file via Cloudinary).
══════════════════════════════════════════════════════════════════ */
exports.uploadProjectFile = async (req, res) => {
  try {
    if (!req.file) {
      return fail(res, 'No file uploaded.');
    }

    const project = await Project.findById(req.params.id);
    if (!project) {
      return fail(res, 'Project not found.', 404);
    }

    if (!isParticipant(project, req.user)) {
      return fail(res, 'You are not authorised to upload files to this project.', 403);
    }

    const fileRecord = {
      url:          req.file.path,
      publicId:     req.file.filename, // multer-storage-cloudinary sets this to the Cloudinary public_id
      originalName: req.file.originalname,
      fileType:     req.file.mimetype,
      size:         req.file.size,
      uploadedBy:   req.user._id,
      uploadedAt:   new Date(),
    };

    project.files.push(fileRecord);
    await project.save();

    const savedFile = project.files[project.files.length - 1];
    ok(res, { message: 'File uploaded successfully.', file: savedFile }, 201);
  } catch (err) {
    console.error('[project.uploadProjectFile]', err);
    fail(res, err.message || 'File upload failed.', 500);
  }
};

/* ══════════════════════════════════════════════════════════════════
   GET /api/projects/:id/files
   Protected — participant only.
══════════════════════════════════════════════════════════════════ */
exports.getProjectFiles = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('files.uploadedBy', 'name avatarUrl')
      .select('client freelancer files');

    if (!project) {
      return fail(res, 'Project not found.', 404);
    }

    if (!isParticipant(project, req.user)) {
      return fail(res, 'You are not authorised to view these files.', 403);
    }

    ok(res, { files: project.files });
  } catch (err) {
    console.error('[project.getProjectFiles]', err);
    fail(res, 'Failed to load project files.', 500);
  }
};

/* ══════════════════════════════════════════════════════════════════
   DELETE /api/projects/:id/files/:fileId
   Protected — only the uploader or an admin may delete a file.
   Removes it from Cloudinary as well as the Project document.
══════════════════════════════════════════════════════════════════ */
exports.deleteProjectFile = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return fail(res, 'Project not found.', 404);
    }

    if (!isParticipant(project, req.user)) {
      return fail(res, 'You are not authorised to modify this project.', 403);
    }

    const file = project.files.id(req.params.fileId);
    if (!file) {
      return fail(res, 'File not found.', 404);
    }

    if (file.uploadedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return fail(res, 'You can only delete files you uploaded.', 403);
    }

    try {
      await cloudinary.uploader.destroy(file.publicId, { resource_type: 'auto' });
    } catch (cloudErr) {
      // Log but don't block removal from our DB if Cloudinary cleanup fails —
      // an orphaned Cloudinary asset is a lesser problem than a file the user
      // can't remove from their project view.
      console.error('[project.deleteProjectFile] Cloudinary cleanup failed:', cloudErr.message);
    }

    file.deleteOne();
    await project.save();

    ok(res, { message: 'File deleted successfully.' });
  } catch (err) {
    console.error('[project.deleteProjectFile]', err);
    fail(res, 'Failed to delete file.', 500);
  }
};