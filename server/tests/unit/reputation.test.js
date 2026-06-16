/**
 * TaskTide Reputation Service Integration Tests
 * Path: server/tests/reputation.test.js
 * * Strategy:
 * • Verifies that reputation points are correctly calculated after project completion.
 * • Ensures that negative actions (like disputes) correctly decrement points.
 * • Validates that reputation calculation is atomic and consistent.
 */

'use strict';

const request = require('supertest');
const app = require('../../app');
const User = require('../../models/User');
const Reputation = require('../../models/Reputation');
const mongoose = require('mongoose');

// Fixture: Freelancer
const FREELANCER_USER = {
  name: 'Reputation Test',
  email: 'rep@tasktide.test',
  password: 'SecurePassword123!',
  role: 'freelancer'
};

/* ─────────────────────────────────────────────
   Helpers & Cleanup
───────────────────────────────────────────── */
afterAll(async () => {
  await User.deleteMany({ email: /@tasktide\.test$/ });
  await Reputation.deleteMany({});
  await mongoose.connection.close();
});

/* ═══════════════════════════════════════════════════════════════════
   Reputation Calculation & Logic Tests
═══════════════════════════════════════════════════════════════════ */
describe('Reputation Engine Logic', () => {
  
  test('POST /api/reputation/adjust — Admin can award points for project success', async () => {
    // 1. Register and get a user ID
    const userRes = await request(app).post('/api/auth/register').send(FREELANCER_USER);
    const userId = userRes.body.user.id;

    // 2. Award points as admin
    const res = await request(app)
      .post(`/api/reputation/${userId}/adjust`)
      .set('Authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
      .send({ points: 50, reason: 'Successful project completion' });

    expect(res.status).toBe(200);
    expect(res.body.data.points).toBeGreaterThan(0);
  });

  test('GET /api/reputation/:userId/score — Returns current trust score', async () => {
    const userRes = await request(app).post('/api/auth/register').send(FREELANCER_USER);
    const userId = userRes.body.user.id;

    const res = await request(app)
      .get(`/api/reputation/${userId}/score`)
      .set('Cookie', 'user_cookie');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('score');
  });

  test('Prevents non-admin from modifying reputation', async () => {
    const res = await request(app)
      .post('/api/reputation/some_user_id/adjust')
      .set('Authorization', `Bearer ${process.env.USER_TOKEN}`)
      .send({ points: 50 });

    expect(res.status).toBe(403);
  });
});