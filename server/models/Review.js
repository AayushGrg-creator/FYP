'use strict';

const mongoose = require('mongoose');
const { Schema } = mongoose;

const ReviewSchema = new Schema(
  {
    project: {
      type:     Schema.Types.ObjectId,
      ref:      'Project',
      required: [true, 'Review must reference a project.'],
    },

    // One review per milestone — enforced via unique index below.
    // This is a deliberate scoping choice: rating attaches to individual
    // milestone completion (status 'released' or 'resolved'), not a
    // whole-project "completed" event, since that hook was never inspected.
    milestone: {
      type:     Schema.Types.ObjectId,
      ref:      'Milestone',
      required: [true, 'Review must reference a milestone.'],
      unique:   true,
    },

    client: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'Review must reference the client who gave it.'],
    },

    freelancer: {
      type:     Schema.Types.ObjectId,
      ref:      'User',
      required: [true, 'Review must reference the freelancer being rated.'],
    },

    rating: {
      type:     Number,
      required: [true, 'Rating is required.'],
      min:      [1, 'Rating must be at least 1.'],
      max:      [5, 'Rating cannot exceed 5.'],
    },

    comment: {
      type:      String,
      trim:      true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters.'],
      default:   '',
    },
  },
  { timestamps: true },
);

ReviewSchema.index({ freelancer: 1 });
ReviewSchema.index({ project: 1 });

module.exports = mongoose.model('Review', ReviewSchema);