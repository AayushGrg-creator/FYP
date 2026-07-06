/**
 * TaskTide Profile Controller
 * Path: server/controllers/profile.controller.js
 */

'use strict';

const ClientProfile = require('../models/ClientProfile');
const FreelancerProfile = require('../models/FreelancerProfile');

// Helper: pick the right model based on logged-in user's role
const getProfileModel = (role) => {
  if (role === 'client') return ClientProfile;
  if (role === 'freelancer') return FreelancerProfile;
  return null;
};

// @desc    Get current user's profile (client or freelancer)
// @route   GET /api/profile/me
exports.getMyProfile = async (req, res) => {
  try {
    const Model = getProfileModel(req.user.role);
    if (!Model) {
      return res.status(400).json({ message: 'Invalid role for profile lookup' });
    }

    const profile = await Model.findOne({ userId: req.user._id })
      .populate('userId', 'name email avatarUrl role');

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found. Please complete your profile.' });
    }

    res.status(200).json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Create or update current user's profile
// @route   PUT /api/profile/me
exports.upsertMyProfile = async (req, res) => {
  try {
    const Model = getProfileModel(req.user.role);
    if (!Model) {
      return res.status(400).json({ message: 'Invalid role for profile update' });
    }

    // Whitelist fields per role to prevent mass-assignment of unrelated fields
    let allowedFields;
    if (req.user.role === 'client') {
      allowedFields = ['companyName', 'industryType', 'location'];
    } else {
      allowedFields = ['bio', 'hourlyRate', 'skills', 'portfolio', 'location', 'githubUrl', 'linkedinUrl'];
    }

    const updateData = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) updateData[field] = req.body[field];
    }

    const profile = await Model.findOneAndUpdate(
      { userId: req.user._id },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    );

    res.status(200).json({
      message: 'Profile updated successfully',
      data: profile,
    });
  } catch (error) {
    res.status(400).json({ message: 'Invalid data', error: error.message });
  }
};

// @desc    Get any user's public profile by userId
// @route   GET /api/profile/:userId
exports.getPublicProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.query; // ?role=client or ?role=freelancer

    const Model = getProfileModel(role);
    if (!Model) {
      return res.status(400).json({ message: 'role query param must be client or freelancer' });
    }

    const profile = await Model.findOne({ userId }).populate('userId', 'name avatarUrl');

    if (!profile) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    res.status(200).json(profile);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update avatar (uses uploadMiddleware, req.file.path from Cloudinary)
// @route   POST /api/profile/me/avatar
exports.updateAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const Model = getProfileModel(req.user.role);
    if (!Model) {
      return res.status(400).json({ message: 'Invalid role for avatar update' });
    }

    const profile = await Model.findOneAndUpdate(
      { userId: req.user._id },
      { $set: { avatarUrl: req.file.path } },
      { new: true, upsert: true }
    );

    res.status(200).json({ message: 'Avatar updated', data: profile });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};