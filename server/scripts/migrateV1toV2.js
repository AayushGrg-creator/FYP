/**
 * TaskTide Database Migration v1 to v2
 * Path: server/scripts/migrate.js
 * * Performs a safe, atomic migration of schema data.
 */

const mongoose = require('mongoose');
const User = require('../models/User'); // Import necessary models

async function migrateV1toV2() {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    console.log(' Running migration from v1 to v2...');

    // 1. Example: Add new field to all existing users
    // Using updateMany ensures atomic updates across the collection
    const result = await User.updateMany(
      { version: { $ne: 'v2' } }, // Filter: Only update records not yet on v2
      { 
        $set: { version: 'v2', reputationPoints: 100 },
        $unset: { oldLegacyField: "" } // Clean up deprecated data
      },
      { session }
    );

    console.log(`Migration completed: ${result.modifiedCount} records updated.`);

    await session.commitTransaction();
  } catch (error) {
    await session.abortTransaction();
    console.error('Migration failed, transaction aborted:', error.message);
    process.exit(1);
  } finally {
    session.endSession();
    await mongoose.disconnect();
  }
}

// Run the script
migrateV1toV2();