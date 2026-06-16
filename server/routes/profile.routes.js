/**
 * profile.routes.js
 * Express router for Task Tide's user identity and profile data management subsystem.
 *
 * Mounts at: /api/profiles  (or configured endpoint in server/app.js)
 */

'use strict';

const express = require('express');
const router = express.Router();

const profileController = require('../controllers/profile.controller');
const { protect } = require('../middleware/authMiddleware');

/* 1. Global Middleware: Enforce Authentication for all profile routes */
router.use(protect);

/* 2. Profile Operations */
router.route('/')
  .get(profileController.getProfile)
  .put(profileController.updateProfile);

module.exports = router;