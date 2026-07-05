'use strict';

const { Router } = require('express');
const { protect } = require('../middleware/authMiddleware');
const messageController = require('../controllers/message.controller');

const router = Router();

router.get('/inbox', protect, messageController.getInbox);
router.get('/unread-count', protect, messageController.getUnreadCount);
router.post('/conversations/:projectId', protect, messageController.getOrCreateConversation);
router.get('/conversations/:conversationId', protect, messageController.getConversation);
router.get('/conversations/:conversationId/messages', protect, messageController.getMessages);
router.patch('/conversations/:conversationId/read', protect, messageController.markRead);
router.delete('/:messageId', protect, messageController.deleteMessage);

module.exports = router;