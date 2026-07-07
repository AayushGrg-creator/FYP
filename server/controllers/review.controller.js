'use strict';

const mongoose = require('mongoose');
const Review = require('../models/Review');
const { Milestone } = require('../models/Milestone');
const User = require('../models/User');
const Project = require('../models/Project');

const ok   = (res, data, status = 200) => res.status(status).json({ success: true,  ...data });
const fail = (res, msg,  status = 400) => res.status(status).json({ success: false, message: msg });

// Recomputes avgRating/ratingCount from the Review collection and stores
// the result on the User doc (same pattern as reputationService's
// recalculateTrustScore — cached on the user, recalculated on write).
async function recalculateAvgRating(freelancerId) {
  const result = await Review.aggregate([
    { $match: { freelancer: new mongoose.Types.ObjectId(freelancerId) } },
    { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
  ]);

  const avgRating   = result.length ? Math.round(result[0].avg * 10) / 10 : 0;
  const ratingCount = result.length ? result[0].count : 0;

  await User.findByIdAndUpdate(freelancerId, { avgRating, ratingCount });
  return { avgRating, ratingCount };
}

exports.submitReview = async (req, res) => {
  try {
    const { milestoneId, rating, comment } = req.body;

    const numericRating = Number(rating);
    if (!numericRating || numericRating < 1 || numericRating > 5) {
      return fail(res, 'Rating must be a number between 1 and 5.', 400);
    }

    const milestone = await Milestone.findById(milestoneId);
    if (!milestone) return fail(res, 'Milestone not found.', 404);

    if (milestone.client.toString() !== req.user._id.toString()) {
      return fail(res, 'You do not own this milestone.', 403);
    }

    if (!['released', 'resolved'].includes(milestone.status)) {
      return fail(
        res,
        `Only completed milestones can be rated (current: '${milestone.status}').`,
        400,
      );
    }

    const existing = await Review.findOne({ milestone: milestone._id });
    if (existing) {
      return fail(res, 'You have already rated this milestone.', 409);
    }

    const review = await Review.create({
      project:    milestone.project,
      milestone:  milestone._id,
      client:     milestone.client,
      freelancer: milestone.freelancer,
      rating:     numericRating,
      comment:    comment?.trim() || '',
    });

    const summary = await recalculateAvgRating(milestone.freelancer);

    ok(res, { message: 'Rating submitted.', review, ...summary }, 201);
  } catch (err) {
    if (err.code === 11000) {
      return fail(res, 'You have already rated this milestone.', 409);
    }
    if (err.name === 'ValidationError') {
      const msg = Object.values(err.errors).map((e) => e.message).join(', ');
      return fail(res, msg);
    }
    console.error('[review.submitReview]', err);
    fail(res, err.message, 500);
  }
};

// Used by the freelancer dashboard to show avgRating / ratingCount.
exports.getMySummary = async (req, res) => {
  try {
    if (req.user.role !== 'freelancer') {
      return fail(res, 'Only freelancers have a rating summary.', 403);
    }
    const summary = await recalculateAvgRating(req.user._id);
    ok(res, summary);
  } catch (err) {
    console.error('[review.getMySummary]', err);
    fail(res, 'Failed to load rating summary.', 500);
  }
};

// Used by ProjectWorkspacePage to know which milestones already have a
// review, so the "Rate Freelancer" button doesn't show twice.
exports.getReviewsForProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId).select('client freelancer');
    if (!project) return fail(res, 'Project not found.', 404);

    const isParticipant =
      project.client.toString()     === req.user._id.toString() ||
      project.freelancer.toString() === req.user._id.toString();

    if (!isParticipant) return fail(res, 'Not authorised.', 403);

    const reviews = await Review.find({ project: req.params.projectId })
      .select('milestone rating comment');

    ok(res, { reviews });
  } catch (err) {
    console.error('[review.getReviewsForProject]', err);
    fail(res, 'Failed to load reviews.', 500);
  }
};

exports.getReviewForMilestone = async (req, res) => {
  try {
    const review = await Review.findOne({ milestone: req.params.milestoneId });
    if (!review) return fail(res, 'No review found for this milestone.', 404);

    const isParticipant =
      review.client.toString()     === req.user._id.toString() ||
      review.freelancer.toString() === req.user._id.toString();

    if (!isParticipant) return fail(res, 'Not authorised.', 403);

    ok(res, { review });
  } catch (err) {
    console.error('[review.getReviewForMilestone]', err);
    fail(res, 'Failed to load review.', 500);
  }
};