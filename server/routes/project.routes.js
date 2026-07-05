'use strict';

/**
 * project.routes.js
 *
 * Mounts at: /api/projects  (set in server/app.js)
 *
 *   GET    /api/projects/mine              - list my projects (client or freelancer side)
 *   GET    /api/projects/:id               - full project detail
 *   PATCH  /api/projects/:id/status        - update project lifecycle status
 *   POST   /api/projects/:id/files         - upload a project file
 *   GET    /api/projects/:id/files         - list project files
 *   DELETE /api/projects/:id/files/:fileId - delete a project file
 *
 * NOTE: '/mine' must be registered BEFORE '/:id', same pattern already
 * used correctly in job.routes.js - otherwise Express would treat "mine"
 * as an :id param and never reach the real handler.
 */

const express = require('express');
const router  = express.Router();

const projectController  = require('../controllers/project.controller');
const { protect }        = require('../middleware/authMiddleware');
const uploadProjectFile  = require('../middleware/projectFileUpload');

router.use(protect);

router.get('/mine', projectController.getMyProjects);
router.get('/:id', projectController.getProjectById);
router.patch('/:id/status', projectController.updateProjectStatus);

router.post('/:id/files', uploadProjectFile.single('file'), projectController.uploadProjectFile);
router.get('/:id/files', projectController.getProjectFiles);
router.delete('/:id/files/:fileId', projectController.deleteProjectFile);

module.exports = router;