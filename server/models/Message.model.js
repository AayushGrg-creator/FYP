const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  conversationId: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  isDeleted: { type: Boolean, default: false }
}, { timestamps: true });

// Document post-save hook to automatically update parent conversation reference safely
MessageSchema.post('save', async function(doc) {
  await mongoose.model('Conversation').findByIdAndUpdate(doc.conversationId, {
    lastMessage: doc._id
  });
});

module.exports = mongoose.model('Message', MessageSchema);