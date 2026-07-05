import api from './api';

export const messageService = {
  getInbox: () => api.get('/messages/inbox'),
  getUnreadCount: () => api.get('/messages/unread-count'),
  getOrCreateConversation: (projectId) => api.post(`/messages/conversations/${projectId}`),
  getConversation: (conversationId) => api.get(`/messages/conversations/${conversationId}`),
  getMessages: (conversationId, params = {}) =>
    api.get(`/messages/conversations/${conversationId}/messages`, { params }),
  markRead: (conversationId, upToMessageId) =>
    api.patch(`/messages/conversations/${conversationId}/read`, { upToMessageId }),
  deleteMessage: (messageId) => api.delete(`/messages/${messageId}`),
};

export default messageService;