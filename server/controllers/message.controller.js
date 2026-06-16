
'use strict';

const messageService = require('../services/message.service');
const logger         = require('../config/logger');

/* ─────────────────────────────────────────────
   Shared error responder
───────────────────────────────────────────── */
function handleError(res, err, context = '') {
  logger.error(`message.controller ${context}:`, err.message || err);
  const status = err.statusCode || 500;
  return res.status(status).json({
    success: false,
    message: err.message || 'An unexpected error occurred.',
  });
}

/* ─────────────────────────────────────────────
   GET /api/messages/inbox
   Returns all conversations for the authenticated user,
   sorted by most recent activity.
───────────────────────────────────────────── */
async function getInbox(req, res) {
  try {
    const conversations = await messageService.getInboxForUser(req.user._id);
    return res.status(200).json({
      success: true,
      count:   conversations.length,
      data:    conversations,
    });
  } catch (err) {
    return handleError(res, err, 'getInbox');
  }
}

/* ─────────────────────────────────────────────
   GET /api/messages/unread-count
   Returns total unread message count across all conversations.
   Used by NotificationBell component.
───────────────────────────────────────────── */
async function getUnreadCount(req, res) {
  try {
    const count = await messageService.getUnreadCountForUser(req.user._id);
    return res.status(200).json({ success: true, unreadCount: count });
  } catch (err) {
    return handleError(res, err, 'getUnreadCount');
  }
}

/* ─────────────────────────────────────────────
   POST /api/messages/conversations/project/:projectId
   Gets an existing conversation for a project, or creates one.
   Both the client and freelancer of the project may call this.
───────────────────────────────────────────── */
async function getOrCreateConversation(req, res) {
  try {
    const { projectId } = req.params;

    const conversation = await messageService.getOrCreateConversation(projectId);

    // Verify the requesting user is actually a participant
    const isMember = conversation.participants.some(
      p => p.toString() === req.user._id.toString(),
    );
    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: 'You are not a participant in this project.',
      });
    }

    return res.status(200).json({ success: true, data: conversation });
  } catch (err) {
    return handleError(res, err, 'getOrCreateConversation');
  }
}

/* ─────────────────────────────────────────────
   GET /api/messages/conversations/:conversationId
   Returns conversation metadata including project context.
───────────────────────────────────────────── */
async function getConversation(req, res) {
  try {
    const conversation = await messageService.getConversationById(
      req.params.conversationId,
      req.user._id,
    );
    return res.status(200).json({ success: true, data: conversation });
  } catch (err) {
    return handleError(res, err, 'getConversation');
  }
}

/* ─────────────────────────────────────────────
   GET /api/messages/conversations/:conversationId/messages
   Returns paginated message history.
   Query params: page (default 1), limit (default 50, max 100)
───────────────────────────────────────────── */
async function getMessages(req, res) {
  try {
    const { conversationId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const result = await messageService.getMessageHistory(
      conversationId,
      req.user._id,
      { page: Number(page), limit: Number(limit) },
    );

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err) {
    return handleError(res, err, 'getMessages');
  }
}

/* ─────────────────────────────────────────────
   PATCH /api/messages/conversations/:conversationId/read
   Marks messages in a conversation as read by the current user.
   Body (optional): { upToMessageId }
   Also called by the socket mark-read event for REST-only clients.
───────────────────────────────────────────── */
async function markRead(req, res) {
  try {
    const { conversationId } = req.params;
    const { upToMessageId }  = req.body || {};

    const result = await messageService.markMessagesRead(
      conversationId,
      req.user._id,
      upToMessageId || null,
    );

    return res.status(200).json({
      success: true,
      message: `${result.marked} message(s) marked as read.`,
      marked:  result.marked,
    });
  } catch (err) {
    return handleError(res, err, 'markRead');
  }
}

/* ─────────────────────────────────────────────
   DELETE /api/messages/:messageId
   Soft-deletes a message. Only the original sender may delete.
   The message remains in the database with deletedAt set.
───────────────────────────────────────────── */
async function deleteMessage(req, res) {
  try {
    const { messageId } = req.params;

    await messageService.softDeleteMessage(messageId, req.user._id);

    return res.status(200).json({
      success: true,
      message: 'Message deleted.',
    });
  } catch (err) {
    return handleError(res, err, 'deleteMessage');
  }
}

module.exports = {
  getInbox,
  getUnreadCount,
  getOrCreateConversation,
  getConversation,
  getMessages,
  markRead,
  deleteMessage,
};