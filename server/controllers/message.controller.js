'use strict';

const messageService = require('../services/message.service');

function handleError(res, err) {
  const status = err.statusCode || 500;
  return res.status(status).json({ success: false, message: err.message });
}

exports.getInbox = async (req, res) => {
  try {
    const conversations = await messageService.getInboxForUser(req.user.id);
    return res.status(200).json({ success: true, count: conversations.length, data: conversations });
  } catch (err) { return handleError(res, err); }
};

exports.getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await messageService.getUnreadCountForUser(req.user.id);
    return res.status(200).json({ success: true, unreadCount });
  } catch (err) { return handleError(res, err); }
};

exports.getOrCreateConversation = async (req, res) => {
  try {
    const { projectId } = req.params;
    const conversation = await messageService.getOrCreateConversation(projectId);
    return res.status(200).json({ success: true, data: conversation });
  } catch (err) { return handleError(res, err); }
};

exports.getConversation = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await messageService.getConversationById(conversationId, req.user.id);
    return res.status(200).json({ success: true, data: conversation });
  } catch (err) { return handleError(res, err); }
};

exports.getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { page, limit } = req.query;
    const result = await messageService.getMessageHistory(conversationId, req.user.id, { page, limit });
    return res.status(200).json({ success: true, ...result });
  } catch (err) { return handleError(res, err); }
};

exports.markRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { upToMessageId } = req.body;
    const result = await messageService.markMessagesRead(conversationId, req.user.id, upToMessageId);
    return res.status(200).json({ success: true, ...result });
  } catch (err) { return handleError(res, err); }
};

exports.deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const message = await messageService.softDeleteMessage(messageId, req.user.id);
    return res.status(200).json({ success: true, data: message });
  } catch (err) { return handleError(res, err); }
};