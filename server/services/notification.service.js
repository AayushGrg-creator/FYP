/**
 * TaskTide Notification Controller
 * Path: server/src/controllers/notification.controller.js
 */

const Notification = require('../models/Notification');
const { sendEmail } = require('../services/emailService');

// @desc    Send a notification to a specific user
exports.sendNotification = async (req, res) => {
  try {
    const { userId, message, type } = req.body;

    // 1. Persist to Database (Ensures user can see it in their dashboard later)
    const notification = await Notification.create({
      userId,
      message,
      type,
      read: false
    });

    // 2. Real-time delivery (e.g., via Socket.io)
    // req.io.to(userId).emit('new_notification', notification);

    // 3. Optional: Email fallback for urgent items
    if (type === 'urgent') {
      await sendEmail(req.user.email, 'New TaskTide Update', message);
    }

    res.status(201).json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Notification delivery failed' });
  }
};

// @desc    Get all notifications for the authenticated user
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({ success: true, count: notifications.length, data: notifications });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Could not fetch notifications' });
  }
};