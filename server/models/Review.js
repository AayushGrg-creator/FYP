/**
 * TaskTide Review Model
 * Path: server/src/models/Review.js
 */

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  projectId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Project', 
    required: true,
    index: true // Optimized for lookup by project
  },
  reviewerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  revieweeId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true // Crucial for aggregating reputation scores quickly
  },
  rating: { 
    type: Number, 
    required: true, 
    min: 1, 
    max: 5 
  },
  comment: { 
    type: String, 
    trim: true,
    maxlength: 1000 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
});

/* Compound index to prevent duplicate reviews for the same project-user pairing */
reviewSchema.index({ projectId: 1, reviewerId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);