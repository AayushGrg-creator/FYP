/**
 * TaskTide Profile Controller
 * Path: server/src/controllers/profileController.js
 */

const User = require('../models/User'); // Assuming Mongoose/Sequelize model

// @desc    Get current user profile
// @route   GET /api/v1/profile
export const getProfile = async (req, res) => {
  try {
    // req.user.id is typically populated by your auth middleware
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ message: 'User profile not found' });
    }
    
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update current user profile
// @route   PUT /api/v1/profile
export const updateProfile = async (req, res) => {
  try {
    const { bio, skills, title } = req.body;

    // Define fields allowed for mass update to prevent privilege escalation
    const updateFields = { bio, skills, title };

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    res.status(400).json({ message: 'Invalid data', error: error.message });
  }
};