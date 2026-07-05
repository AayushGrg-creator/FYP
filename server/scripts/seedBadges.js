'use strict';

require('dotenv').config();
const mongoose = require('mongoose');
const Badge = require('../models/Badge');

async function seedBadges() {
  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('[seedBadges] No MONGO_URI / MONGODB_URI found in .env — check your actual variable name in config/db.js and adjust this script.');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log('[seedBadges] Connected to MongoDB.');

  let created = 0;
  let updated = 0;

  for (const badgeData of Badge.DEFAULTS) {
    const result = await Badge.findOneAndUpdate(
      { slug: badgeData.slug },
      { $set: badgeData },
      { upsert: true, new: true, rawResult: true }
    );

    if (result.lastErrorObject?.upserted) {
      created += 1;
    } else {
      updated += 1;
    }
  }

  console.log(`[seedBadges] Done. Created: ${created}, Updated: ${updated}, Total in DEFAULTS: ${Badge.DEFAULTS.length}`);
  await mongoose.disconnect();
  process.exit(0);
}

seedBadges().catch((err) => {
  console.error('[seedBadges] Failed:', err);
  process.exit(1);
});