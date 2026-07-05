'use strict';

/**
 * project.routes.js
 * NEW FILE — did not exist before this session.
 *
 * Mounts at: /api/projects  (set in server/app.js)
 *
 *   GET   /api/projects/mine        - list my projects (client or freelancer side)
 *   GET   /api/projects/:id         - full project detail
 *   PATCH /api/projects/:id/status  - update project lifecycle status
 *
 * NOTE: '/mine' must be registered BEFORE '/:id', same pattern already
 * used correctly in job.routes.js - otherwise Express would treat "mine"
 * as an :id param and never reach the real handler.
 */

const express = require('express');
const router  = express.Router();

const projectController = require('../controllers/project.controller');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/mine', projectController.getMyProjects);
router.get('/:id', projectController.getProjectById);
router.patch('/:id/status', projectController.updateProjectStatus);

module.exports = router;