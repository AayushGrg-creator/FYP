import api from './api';

/**
 * TaskTide Messaging Service
 * Path: client/src/services/messageService.js
 * * Handles asynchronous message archival, file attachment delivery, 
 * and conversational thread retrieval.
 */
export const messageService = {
  /**
   * Retrieve message history for a specific conversation
   * @param {string} conversationId - The thread/room unique identifier
   * @param {Object} params - Pagination params (limit, cursor)
   */
  getMessages: (conversationId, params = {}) => 
    api.get(`/messages/${conversationId}`, { params }),

  /**
   * Post a new message to a conversation thread
   * @param {string} conversationId 
   * @param {Object} messageData - { text, fileUrl, fileType, tempId }
   */
  sendMessage: (conversationId, messageData) => 
    api.post(`/messages/${conversationId}`, messageData),

  /**
   * Fetch a summary of active conversations for the user's dashboard sidebar
   */
  getConversations: () => 
    api.get('/messages/conversations'),

  /**
   * Upload attachment to storage service
   * @param {FormData} fileData - The raw file binary payload
   */
  uploadAttachment: (fileData) => 
    api.post('/messages/upload', fileData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export default messageService;