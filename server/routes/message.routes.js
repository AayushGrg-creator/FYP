'use strict';

const Message = require('../models/Message.model');
const Conversation = require('../models/Conversation.model');
const Project = require('../models/Project.model'); // Assuming a Project model exists

/**
 * GET /api/messages/inbox
 * Returns the list of conversations for the logged-in user.
 */
exports.getInbox = async (req, res) => {
  try {
    const userId = req.user.id;

    // Find all conversations the user is part of
    const conversations = await Conversation.find({ participants: userId })
      .populate('projectId', 'title status budget')
      .populate('participants', 'name email avatar role')
      .populate({
        path: 'lastMessage',
        match: { isDeleted: false }
      })
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      count: conversations.length,
      data: conversations,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/messages/unread-count
 * Returns total unread count across all active conversations for the NotificationBell.
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;

    // Count messages where the user is a participant in the conversation,
    // but has not read the message yet, and isn't the sender.
    const unreadCount = await Message.countDocuments({
      sender: { $ne: userId },
      readBy: { $ne: userId },
      isDeleted: false,
      conversationId: {
        $in: await Conversation.find({ participants: userId }).distinct('_id')
      }
    });

    return res.status(200).json({
      success: true,
      unreadCount,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/messages/conversations/project/:projectId
 * Gets or creates a single conversation tied to a specific project workspace.
 */
exports.getOrCreateConversation = async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    // Check if conversation already exists for this project
    let conversation = await Conversation.findOne({ projectId })
      .populate('projectId', 'title status')
      .populate('participants', 'name email role avatar');

    if (conversation) {
      // Ensure the accessing user is actually an authorized participant
      if (!conversation.participants.some(p => p._id.toString() === userId) && req.user.role !== 'admin') {
        return res.status(403).json({ success: false, message: 'Unauthorized access to this conversation.' });
      }
      return res.status(200).json({ success: true, data: conversation });
    }

    // If it doesn't exist, verify project existence and gather participants
    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ success: false, message: 'Project context not found.' });
    }

    // Verify requesting user is the client or freelancer on this specific project
    const isClient = project.client && project.client.toString() === userId;
    const isFreelancer = project.freelancer && project.freelancer.toString() === userId;
    
    if (!isClient && !isFreelancer && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'You must be assigned to this project to initialize a workspace chat.' });
    }

    // Create the conversation workspace
    conversation = await Conversation.create({
      projectId,
      participants: [project.client, project.freelancer].filter(Boolean),
    });

    const populatedConv = await Conversation.findById(conversation._id)
      .populate('projectId', 'title status')
      .populate('participants', 'name email role avatar');

    return res.status(201).json({
      success: true,
      data: populatedConv,
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/messages/conversations/:conversationId
 * Returns metadata and active project context for a conversation thread.
 */
exports.getConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;

    const conversation = await Conversation.findById(conversationId)
      .populate('projectId', 'title status description budget')
      .populate('participants', 'name email role avatar');

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    // Security boundary check
    if (!conversation.participants.some(p => p._id.toString() === userId) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }

    return res.status(200).json({ success: true, data: conversation });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/messages/conversations/:conversationId/messages
 * Returns clean paginated message histories.
 */
exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.id;
    
    // Pagination params setup
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 50;
    const skip = (page - 1) * limit;

    // Verify membership
    const conversation = await Conversation.findOne({ _id: conversationId, participants: userId });
    if (!conversation && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access to this message thread is forbidden.' });
    }

    // Fetch messages (excluding soft-deleted instances)
    const messages = await Message.find({ conversationId, isDeleted: false })
      .sort({ createdAt: -1 }) // Newest first for pagination processing
      .skip(skip)
      .limit(limit)
      .populate('sender', 'name avatar role');

    const totalMessages = await Message.countDocuments({ conversationId, isDeleted: false });

    return res.status(200).json({
      success: true,
      pagination: {
        total: totalMessages,
        page,
        limit,
        pages: Math.ceil(totalMessages / limit),
      },
      // Reverse array back to chronological order for UI ease of rendering
      data: messages.reverse(), 
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * PATCH /api/messages/conversations/:conversationId/read
 * Flushes pending unread flags for incoming messages up to an optional targeted message footprint.
 */
exports.markRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { upToMessageId } = req.body;
    const userId = req.user.id;

    // Base criteria: incoming messages inside this conversation thread not sent by current user
    const query = {
      conversationId,
      sender: { $ne: userId },
      readBy: { $ne: userId }
    };

    // If an upper bound ID is provided, target only items up to that specific sequence marker
    if (upToMessageId) {
      query._id = { $lte: upToMessageId };
    }

    // Add user into the readBy tracking array 
    await Message.updateMany(query, {
      $addToSet: { readBy: userId }
    });

    return res.status(200).json({
      success: true,
      message: 'Messages successfully marked as read.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/messages/:messageId
 * Standard safe soft-delete. Keeps history consistent, avoids breaking indexing pointers.
 */
exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }

    // Enforcement clause: Only the literal author can perform deletion actions
    if (message.sender.toString() !== userId) {
      return res.status(403).json({ success: false, message: 'You can only delete your own messages.' });
    }

    message.isDeleted = true;
    await message.save();

    // If the soft-deleted message was flagged as the last message in the parent thread,
    // recalculate or leave it to clean up visual consistency.
    return res.status(200).json({
      success: true,
      message: 'Message soft-deleted successfully.',
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};