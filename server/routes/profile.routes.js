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
const upload = require('../middleware/uploadMiddleware'); // your Cloudinary multer setup

/* Logged-in user's own profile */
router.route('/me')
  .get(protect, profileController.getMyProfile)
  .put(protect, profileController.upsertMyProfile);

/* Avatar upload for logged-in user */
router.post('/me/avatar', protect, upload.single('avatar'), profileController.updateAvatar);

/* Public: view any user's profile by ID (?role=client or ?role=freelancer) */
router.get('/:userId', profileController.getPublicProfile);

module.exports = router;