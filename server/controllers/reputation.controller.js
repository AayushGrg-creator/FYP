

const User = require('../models/User');
const Review = require('../models/Review');

// @desc    Get comprehensive reputation breakdown
// @route   GET /api/v1/reputation/:userId
export const getReputation = async (req, res) => {
  try {
    const userId = req.params.userId || req.user.id;
    
    // Aggregate data from reviews to calculate total rating and count
    const reputation = await Review.aggregate([
      { $match: { targetUserId: userId } },
      { $group: { 
          _id: "$targetUserId", 
          averageRating: { $avg: "$rating" },
          totalReviews: { $sum: 1 } 
      }}
    ]);

    res.status(200).json({ 
      reputation: reputation[0] || { averageRating: 0, totalReviews: 0 } 
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching reputation', error: error.message });
  }
};

// @desc    Admin-only: Manually adjust reputation based on dispute resolution
// @route   PUT /api/v1/reputation/:userId
export const updateReputation = async (req, res) => {
  try {
    // Only admins should have access to manual adjustments
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { adjustment } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.params.userId,
      { $inc: { reputationPoints: adjustment } },
      { new: true }
    );

    res.status(200).json({ message: 'Reputation adjusted', newScore: updatedUser.reputationPoints });
  } catch (error) {
    res.status(500).json({ message: 'Update failed', error: error.message });
  }
};

// @desc    Calculate dynamic trust score (internal platform metric)
// @route   GET /api/v1/reputation/trust/:userId
export const getTrustScore = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    
    // Logic: Baseline (50) + (CompletedJobs * 2) - (Disputes * 10)
    const trustScore = 50 + (user.completedJobs * 2) - (user.disputeCount * 10);
    
    res.status(200).json({ trustScore: Math.max(0, Math.min(100, trustScore)) });
  } catch (error) {
    res.status(500).json({ message: 'Calculation failed', error: error.message });
  }
};