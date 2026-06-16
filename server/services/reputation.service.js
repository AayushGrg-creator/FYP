/**
 * TaskTide Reputation Controller
 * Path: server/src/controllers/reputation.controller.js
 * * Computes user trust scores based on multi-factor behavioral data.
 */

const Review = require('../models/Review');
const User = require('../models/User');

// @desc    Calculate score using a weighted average algorithm
exports.calculateTrustScore = async (req, res) => {
  try {
    const { userId } = req.params;

    // 1. Fetch performance metrics from the database
    const stats = await Review.aggregate([
      { $match: { revieweeId: mongoose.Types.ObjectId(userId) } },
      { 
        $group: { 
          _id: '$revieweeId',
          avgRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 }
        }
      }
    ]);

    if (stats.length === 0) return res.status(200).json({ score: 0 });

    // 2. Algorithm: Weighted score (Rating * 0.7 + Experience Factor * 0.3)
    const { avgRating, totalReviews } = stats[0];
    const experienceFactor = Math.min(totalReviews / 50, 1); // Caps out at 50 reviews
    const finalScore = Math.round((avgRating * 0.7 + (experienceFactor * 5) * 0.3) * 20);

    res.status(200).json({ success: true, score: finalScore });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Calculation error' });
  }
};

// @desc    Administrative update for reputation points
exports.updateReputation = async (req, res) => {
  try {
    const { points, reason } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { $inc: { reputationPoints: points } },
      { new: true }
    );

    // Create an audit log of the reputation change
    console.log(`Audit: User ${user._id} points updated by ${points}. Reason: ${reason}`);

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Update failed' });
  }
};