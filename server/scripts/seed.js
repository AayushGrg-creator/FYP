/**
 * TaskTide Database Seeding Utility
 * Path: server/scripts/seed.js
 * * Idempotent seeder: Creates base data only if it doesn't already exist.
 */

const mongoose = require('mongoose');
const User = require('../models/User');

const seedData = [
  { email: 'admin@tasktide.com', role: 'admin', password: 'securePassword123' },
  { email: 'client@tasktide.com', role: 'client', password: 'password123' },
  { email: 'freelancer@tasktide.com', role: 'freelancer', password: 'password123' }
];

async function seedDatabase() {
  try {
    console.log('Checking database status...');
    
    // Check if users already exist to prevent duplication
    const count = await User.countDocuments();
    
    if (count > 0) {
      console.log(' Database already contains records. Skipping seed.');
      return;
    }

    console.log('Seeding base data...');
    await User.insertMany(seedData);
    
    console.log('Database seeded successfully.');
  } catch (error) {
    console.error('Error during seeding:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

seedDatabase();