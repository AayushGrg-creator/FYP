/**
 * Conversation.js
 * Mongoose schema for chat rooms in Task Tide.
 *
 * A Conversation is a 1-to-1 room tied to a specific Project.
 * The two participants are always the client who owns the project and the
 * freelancer assigned to it.  This mirrors the project workspace model
 * described in §5.4 (Real-Time Messaging SRS).
 *
 * Fields:
 *   projectId          – FK to Project  (one project → one conversation)
 *   clientId           – FK to User (role: client)
 *   freelancerId       – FK to User (role: freelancer)
 *   participants       – denormalised array [clientId, freelancerId] for fast
 *                        membership checks without joining
 *   lastMessage        – embedded snapshot of the latest message for UI previews
 *   lastMessageAt      – indexed timestamp for inbox sorting
 *   unreadCounts       – Map<userId, number> tracking per-user unread counts
 *   isActive           – false once the project is closed / completed
 *   createdAt / updatedAt
 */

'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ─────────────────────────────────────────────
   Sub-schema: lastMessage snapshot
   Embedded so the inbox list never needs to JOIN the messages collection.
───────────────────────────────────────────── */
const LastMessageSchema = new Schema(
  {
    messageId: {
      type: Schema.Types.ObjectId,
      ref:  'Message',
    },
    senderName: {
      type:    String,
      default: '',
    },
    preview: {
      // Truncated text or '[File attachment]' label
      type:    String,
      default: '',
      maxlength: 120,
    },
    sentAt: {
      type:    Date,
      default: null,
    },
  },
  { _id: false },
);

/* ─────────────────────────────────────────────
   Main schema
───────────────────────────────────────────── */
const ConversationSchema = new Schema(
  {
    /* ── Project context ── */
    projectId: {
      type:     Schema.Types.ObjectId,
      ref:      'Project',
      required: [true, 'projectId is required'],
      unique:   true,   // one conversation per project
      index:    true,
    },

    /* ── Participants ── */
    clientId: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'clientId is required'],
    },
    freelancerId: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'freelancerId is required'],
    },
    // Flat array for fast $in membership queries in the socket auth layer
    participants: {
      type:    [{ type: Schema.Types.ObjectId, ref: 'User' }],
      default: [],
      validate: {
        validator: function (arr) { return arr.length === 2; },
        message:   'A conversation must have exactly 2 participants.',
      },
    },

    /* ── Last-message snapshot ── */
    lastMessage: {
      type:    LastMessageSchema,
      default: () => ({}),
    },
    lastMessageAt: {
      type:    Date,
      default: null,
      index:   true,   // sorts the inbox by most recent activity
    },

    /* ── Per-user unread counts ── */
    // Stored as a plain object: { '<userId>': <count> }
    // Updated atomically with $inc on new message, reset on mark-read.
    unreadCounts: {
      type:    Map,
      of:      Number,
      default: {},
    },

    /* ── Status ── */
    isActive: {
      type:    Boolean,
      default: true,
      index:   true,
    },
  },
  {
    timestamps: true,
    toJSON:    { virtuals: true },
    toObject:  { virtuals: true },
  },
);

/* ─────────────────────────────────────────────
   Pre-save: keep participants array in sync with clientId / freelancerId
───────────────────────────────────────────── */
ConversationSchema.pre('save', function (next) {
  this.participants = [this.clientId, this.freelancerId];
  next();
});

/* ─────────────────────────────────────────────
   Instance method: isMember(userId)
   Returns true if userId is one of the two participants.
───────────────────────────────────────────── */
ConversationSchema.methods.isMember = function (userId) {
  const id = userId.toString();
  return (
    this.clientId.toString()     === id ||
    this.freelancerId.toString() === id
  );
};

/* ─────────────────────────────────────────────
   Instance method: getOtherParticipant(userId)
   Returns the ObjectId of the other participant.
───────────────────────────────────────────── */
ConversationSchema.methods.getOtherParticipant = function (userId) {
  const id = userId.toString();
  if (this.clientId.toString() === id) return this.freelancerId;
  if (this.freelancerId.toString() === id) return this.clientId;
  return null;
};

/* ─────────────────────────────────────────────
   Instance method: incrementUnread(userId)
   Increments the unread counter for the RECIPIENT (not the sender).
───────────────────────────────────────────── */
ConversationSchema.methods.incrementUnread = function (recipientId) {
  const key     = recipientId.toString();
  const current = this.unreadCounts.get(key) || 0;
  this.unreadCounts.set(key, current + 1);
  return this;
};

/* ─────────────────────────────────────────────
   Instance method: resetUnread(userId)
   Resets unread counter to 0 when the user opens the conversation.
───────────────────────────────────────────── */
ConversationSchema.methods.resetUnread = function (userId) {
  this.unreadCounts.set(userId.toString(), 0);
  return this;
};

/* ─────────────────────────────────────────────
   Instance method: updateLastMessage(message, senderName)
   Updates the embedded snapshot after a new message is saved.
───────────────────────────────────────────── */
ConversationSchema.methods.updateLastMessage = function (message, senderName = '') {
  const preview = message.fileUrl && !message.messageText
    ? '[File attachment]'
    : (message.messageText || '').slice(0, 120);

  this.lastMessage = {
    messageId:  message._id,
    senderName: senderName,
    preview,
    sentAt:     message.createdAt || new Date(),
  };
  this.lastMessageAt = message.createdAt || new Date();
  return this;
};

/* ─────────────────────────────────────────────
   Static: findForUser(userId)
   Returns all conversations the user is a participant in,
   sorted by most recent activity.
───────────────────────────────────────────── */
ConversationSchema.statics.findForUser = function (userId) {
  return this.find({
    participants: userId,
    isActive:     true,
  })
    .sort({ lastMessageAt: -1 })
    .populate('clientId',     'name email')
    .populate('freelancerId', 'name email')
    .populate('projectId',    'title escrowStatus')
    .lean();
};

/* ─────────────────────────────────────────────
   Static: findByProject(projectId)
   Returns the single conversation for a project, or null.
───────────────────────────────────────────── */
ConversationSchema.statics.findByProject = function (projectId) {
  return this.findOne({ projectId }).lean();
};

/* ─────────────────────────────────────────────
   Indexes
───────────────────────────────────────────── */
ConversationSchema.index({ participants: 1, lastMessageAt: -1 });
ConversationSchema.index({ clientId: 1, isActive: 1 });
ConversationSchema.index({ freelancerId: 1, isActive: 1 });

module.exports = mongoose.model('Conversation', ConversationSchema);