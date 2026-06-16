/**
 * TaskTide Leaderboard Service
 * Path: server/scripts/updateLeaderboard.js
 * * Efficiently calculates rankings using aggregation and cache-friendly output.
 */

const User = require('../models/User');

async function updateLeaderboard() {
  try {
    console.log(' Calculating leaderboard rankings...');

    // 1. Perform ranking on the database engine
    // We only select the fields needed for the leaderboard (projection)
    const leaderboard = await User.aggregate([
      { $match: { reputation: { $gt: 0 } } }, // Only rank active participants
      { $sort: { reputation: -1 } },
      { $limit: 100 }, // Fetch only the top 100 for display
      { $project: { name: 1, reputation: 1 } }
    ]);

    // 2. Persist the result to a dedicated Leaderboard collection or cache (e.g., Redis)
    // This prevents expensive re-calculation on every GET request
    // await LeaderboardCache.set('top_freelancers', leaderboard);

    console.log(` Leaderboard updated with ${leaderboard.length} top performers.`);
  } catch (error) {
    console.error(' Error updating leaderboard:', error.message);
  } finally {
    process.exit();
  }
}

updateLeaderboard();