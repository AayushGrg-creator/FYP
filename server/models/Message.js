/**
 * Message.js
 * Mongoose schema for individual chat messages in Task Tide.
 *
 * Each document represents one message sent inside a Conversation room.
 * Messages are scoped to a project workspace; users outside the project
 * cannot access them (enforced at the service + socket layer).
 *
 * Fields (§5.4 Real-Time Messaging SRS):
 *   conversationId  – FK to Conversation (the room this message belongs to)
 *   sender          – FK to User (the author)
 *   messageText     – plain-text body (may be empty when fileUrl is set)
 *   fileUrl         – S3 / cloud storage URL for attached file (optional)
 *   fileType        – mime category: 'image' | 'pdf' | 'zip' | 'other'
 *   readBy          – array of { userId, readAt } for per-user read receipts
 *   isSystemMessage – true for automated milestone / escrow status notices
 *   deletedAt       – soft-delete timestamp (null = not deleted)
 *   createdAt / updatedAt – Mongoose auto-timestamps
 */

'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

/* ─────────────────────────────────────────────
   Sub-schema: read receipt entry
───────────────────────────────────────────── */
const ReadReceiptSchema = new Schema(
  {
    userId: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    readAt: {
      type:    Date,
      default: Date.now,
    },
  },
  { _id: false },
);

/* ─────────────────────────────────────────────
   Main schema
───────────────────────────────────────────── */
const MessageSchema = new Schema(
  {
    /* ── Core references ── */
    conversationId: {
      type:     Schema.Types.ObjectId,
      ref:      'Conversation',
      required: [true, 'conversationId is required'],
      index:    true,
    },
    sender: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'sender is required'],
      index:    true,
    },

    /* ── Content ── */
    messageText: {
      type:    String,
      trim:    true,
      default: '',
      maxlength: [4000, 'Message text cannot exceed 4000 characters'],
    },
    fileUrl: {
      type:    String,
      trim:    true,
      default: null,
    },
    fileType: {
      type:    String,
      enum:    ['image', 'pdf', 'zip', 'other', null],
      default: null,
    },
    fileName: {
      type:    String,
      trim:    true,
      default: null,
    },

    /* ── Read tracking ── */
    // readBy stores who has seen the message and when.
    // The sending user is automatically added at creation.
    readBy: {
      type:    [ReadReceiptSchema],
      default: [],
    },

    /* ── Flags ── */
    isSystemMessage: {
      type:    Boolean,
      default: false,
    },

    /* ── Soft delete ── */
    deletedAt: {
      type:    Date,
      default: null,
      index:   true,
    },
  },
  {
    timestamps: true, // adds createdAt + updatedAt
    toJSON:    { virtuals: true },
    toObject:  { virtuals: true },
  },
);

/* ─────────────────────────────────────────────
   Validation: at least one of messageText or fileUrl must be present
───────────────────────────────────────────── */
MessageSchema.pre('validate', function (next) {
  if (!this.messageText && !this.fileUrl) {
    return next(new Error('A message must contain either text or a file attachment.'));
  }
  next();
});

/* ─────────────────────────────────────────────
   Virtual: isRead (convenience flag for the sender's own view)
   True when at least one OTHER participant has a read receipt.
───────────────────────────────────────────── */
MessageSchema.virtual('isRead').get(function () {
  return this.readBy.some(
    r => r.userId.toString() !== this.sender.toString(),
  );
});

/* ─────────────────────────────────────────────
   Instance method: markReadBy(userId)
   Adds a read receipt for the given user if not already present.
   Returns the updated document (caller must save).
───────────────────────────────────────────── */
MessageSchema.methods.markReadBy = function (userId) {
  const already = this.readBy.some(r => r.userId.toString() === userId.toString());
  if (!already) {
    this.readBy.push({ userId, readAt: new Date() });
  }
  return this;
};

/* ─────────────────────────────────────────────
   Indexes
   Compound index on conversationId + createdAt supports paginated
   message history queries efficiently (§4.4 Database).
───────────────────────────────────────────── */
MessageSchema.index({ conversationId: 1, createdAt: -1 });
MessageSchema.index({ sender: 1, createdAt: -1 });

/* ─────────────────────────────────────────────
   Static: findByConversation
   Returns messages for a conversation, newest-last, with pagination.
   Excludes soft-deleted messages.
───────────────────────────────────────────── */
MessageSchema.statics.findByConversation = function (
  conversationId,
  { page = 1, limit = 50 } = {},
) {
  const skip = (Math.max(page, 1) - 1) * Math.min(limit, 100);
  return this.find({ conversationId, deletedAt: null })
    .sort({ createdAt: 1 })
    .skip(skip)
    .limit(Math.min(limit, 100))
    .populate('sender', 'name role')
    .lean();
};

module.exports = mongoose.model('Message', MessageSchema);