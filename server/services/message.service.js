/**
 * message.service.js
 * Business logic layer for Task Tide's real-time messaging subsystem.
 *
 * Responsibilities:
 *   • Creating and retrieving Conversations
 *   • Fetching paginated message history
 *   • Marking messages as read and resetting unread counters
 *   • Building inbox summaries for the dashboard
 *
 * This service is intentionally decoupled from Socket.io.
 * Socket event handlers (socket.js) call this service for persistence;
 * REST route handlers (message.controller.js) call it for HTTP reads.
 * No socket imports live here.
 */

'use strict';

const Message      = require('../models/Message');
const Conversation = require('../models/Conversation');
const Project      = require('../models/Project');
const logger       = require('../config/logger');

/* ─────────────────────────────────────────────
   getOrCreateConversation
   Returns the existing Conversation for a project, or creates one.

   @param {string} projectId
   @returns {Promise<Conversation>}
───────────────────────────────────────────── */
async function getOrCreateConversation(projectId) {
  const existing = await Conversation.findOne({ projectId });
  if (existing) return existing;

  // Load the project to derive participants
  const project = await Project.findById(projectId)
    .select('clientId freelancerId')
    .lean();

  if (!project) {
    throw Object.assign(new Error('Project not found.'), { statusCode: 404 });
  }
  if (!project.clientId || !project.freelancerId) {
    throw Object.assign(
      new Error('Project must have both a client and a freelancer before a conversation can be created.'),
      { statusCode: 400 },
    );
  }

  const conversation = await Conversation.create({
    projectId,
    clientId:     project.clientId,
    freelancerId: project.freelancerId,
    // participants pre-save hook will populate from clientId + freelancerId
  });

  logger.info(`message.service: conversation created for project ${projectId}`);
  return conversation;
}

/* ─────────────────────────────────────────────
   getConversationById
   Returns a single conversation if the requesting user is a participant.

   @param {string} conversationId
   @param {string} requestingUserId  – checked for membership
   @returns {Promise<Conversation>}
───────────────────────────────────────────── */
async function getConversationById(conversationId, requestingUserId) {
  const conv = await Conversation.findById(conversationId)
    .populate('clientId',     'name email')
    .populate('freelancerId', 'name email')
    .populate('projectId',    'title escrowStatus status')
    .lean();

  if (!conv) {
    throw Object.assign(new Error('Conversation not found.'), { statusCode: 404 });
  }

  const isMember = conv.participants.some(p => p.toString() === requestingUserId.toString());
  if (!isMember) {
    throw Object.assign(new Error('Access denied.'), { statusCode: 403 });
  }

  return conv;
}

/* ─────────────────────────────────────────────
   getInboxForUser
   Returns all conversations the user is part of, sorted by last activity.
   Attaches the user's own unread count to each record for badge display.

   @param {string} userId
   @returns {Promise<Array>}
───────────────────────────────────────────── */
async function getInboxForUser(userId) {
  const conversations = await Conversation.findForUser(userId);

  return conversations.map(conv => {
    const unread = (conv.unreadCounts instanceof Map)
      ? (conv.unreadCounts.get(userId.toString()) || 0)
      : (conv.unreadCounts?.[userId.toString()] || 0);

    return { ...conv, myUnreadCount: unread };
  });
}

/* ─────────────────────────────────────────────
   getMessageHistory
   Returns paginated messages for a conversation.
   Validates membership before returning any data.

   @param {string} conversationId
   @param {string} requestingUserId
   @param {{ page?: number, limit?: number }} options
   @returns {Promise<{ messages: Array, total: number, page: number, pages: number }>}
───────────────────────────────────────────── */
async function getMessageHistory(conversationId, requestingUserId, { page = 1, limit = 50 } = {}) {
  // Membership check
  const conv = await Conversation.findById(conversationId).lean();
  if (!conv) {
    throw Object.assign(new Error('Conversation not found.'), { statusCode: 404 });
  }

  const isMember = conv.participants.some(p => p.toString() === requestingUserId.toString());
  if (!isMember) {
    throw Object.assign(new Error('Access denied.'), { statusCode: 403 });
  }

  const safePage  = Math.max(1, parseInt(page, 10)  || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  const skip      = (safePage - 1) * safeLimit;

  const [messages, total] = await Promise.all([
    Message.find({ conversationId, deletedAt: null })
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(safeLimit)
      .populate('sender', 'name role')
      .lean(),
    Message.countDocuments({ conversationId, deletedAt: null }),
  ]);

  return {
    messages,
    total,
    page:  safePage,
    pages: Math.ceil(total / safeLimit) || 1,
  };
}

/* ─────────────────────────────────────────────
   markMessagesRead
   Marks unread messages (sent by others) as read by requestingUserId.
   Resets the unread counter on the Conversation.

   @param {string} conversationId
   @param {string} requestingUserId
   @param {string} [upToMessageId]  – optional cap; defaults to all
   @returns {Promise<{ marked: number }>}
───────────────────────────────────────────── */
async function markMessagesRead(conversationId, requestingUserId, upToMessageId = null) {
  const userId = requestingUserId.toString();

  // Verify membership
  const conv = await Conversation.findById(conversationId).lean();
  if (!conv) {
    throw Object.assign(new Error('Conversation not found.'), { statusCode: 404 });
  }
  const isMember = conv.participants.some(p => p.toString() === userId);
  if (!isMember) {
    throw Object.assign(new Error('Access denied.'), { statusCode: 403 });
  }

  const filter = {
    conversationId,
    sender:            { $ne: userId },
    deletedAt:         null,
    'readBy.userId':   { $ne: userId },
  };
  if (upToMessageId) {
    filter._id = { $lte: upToMessageId };
  }

  const result = await Message.updateMany(filter, {
    $push: { readBy: { userId, readAt: new Date() } },
  });

  // Atomically reset unread counter
  await Conversation.findByIdAndUpdate(
    conversationId,
    { $set: { [`unreadCounts.${userId}`]: 0 } },
  );

  return { marked: result.modifiedCount };
}

/* ─────────────────────────────────────────────
   softDeleteMessage
   Soft-deletes a message (sets deletedAt). Only the sender may delete.

   @param {string} messageId
   @param {string} requestingUserId
   @returns {Promise<Message>}
───────────────────────────────────────────── */
async function softDeleteMessage(messageId, requestingUserId) {
  const message = await Message.findById(messageId);
  if (!message) {
    throw Object.assign(new Error('Message not found.'), { statusCode: 404 });
  }
  if (message.sender.toString() !== requestingUserId.toString()) {
    throw Object.assign(new Error('You can only delete your own messages.'), { statusCode: 403 });
  }
  if (message.deletedAt) {
    throw Object.assign(new Error('Message is already deleted.'), { statusCode: 400 });
  }

  message.deletedAt = new Date();
  await message.save();

  logger.info(`message.service: message ${messageId} soft-deleted by user ${requestingUserId}`);
  return message;
}

/* ─────────────────────────────────────────────
   getUnreadCountForUser
   Returns total unread messages across ALL conversations for a user.
   Used for the NotificationBell badge (§client/components/notifications).

   @param {string} userId
   @returns {Promise<number>}
───────────────────────────────────────────── */
async function getUnreadCountForUser(userId) {
  const conversations = await Conversation.find(
    { participants: userId, isActive: true },
    { unreadCounts: 1 },
  ).lean();

  return conversations.reduce((total, conv) => {
    const counts = conv.unreadCounts || {};
    // unreadCounts may be a plain object from .lean()
    const val = counts instanceof Map
      ? (counts.get(userId.toString()) || 0)
      : (counts[userId.toString()] || 0);
    return total + val;
  }, 0);
}

/* ─────────────────────────────────────────────
   closeConversation
   Marks a conversation as inactive when its project completes.
   Called by project completion webhook / admin action.

   @param {string} projectId
   @returns {Promise<void>}
───────────────────────────────────────────── */
async function closeConversation(projectId) {
  const result = await Conversation.findOneAndUpdate(
    { projectId },
    { $set: { isActive: false } },
    { new: true },
  );
  if (result) {
    logger.info(`message.service: conversation closed for project ${projectId}`);
  }
}

module.exports = {
  getOrCreateConversation,
  getConversationById,
  getInboxForUser,
  getMessageHistory,
  markMessagesRead,
  softDeleteMessage,
  getUnreadCountForUser,
  closeConversation,
};