/**
 * TaskTide Freelancer Matching Route Integration Tests
 * Path: server/tests/match.routes.test.js
 * * Strategy:
 * • Validates that only authenticated clients can trigger matching logic.
 * • Ensures that the matching engine respects filtering criteria (e.g., reputation thresholds).
 * • Verifies data contract consistency for frontend integration.
 */

'use strict';

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const User = require('../../models/User');

// Fixtures for testing the match logic
const CLIENT_USER = {
  name: 'Search Client',
  email: 'searcher@tasktide.test',
  password: 'SecurePassword123!',
  role: 'client'
};

/* ─────────────────────────────────────────────
   Helpers & Cleanup
───────────────────────────────────────────── */
async function getAuthCookie(fixture) {
  await request(app).post('/api/auth/register').send(fixture);
  const res = await request(app).post('/api/auth/login').send({
    email: fixture.email,
    password: fixture.password
  });
  return res.headers['set-cookie'][0];
}

afterAll(async () => {
  await User.deleteMany({ email: /@tasktide\.test$/ });
  await mongoose.connection.close();
});

/* ═══════════════════════════════════════════════════════════════════
   Matching Engine Tests
═══════════════════════════════════════════════════════════════════ */
describe('Freelancer Matching API', () => {
  let clientCookie;

  beforeAll(async () => {
    clientCookie = await getAuthCookie(CLIENT_USER);
  });

  test('GET /api/matches/:jobId — Returns 200 with valid matches', async () => {
    // Assuming a job exists and has a match pipeline
    const res = await request(app)
      .get('/api/matches/job_123')
      .set('Cookie', clientCookie);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('matches');
    expect(Array.isArray(res.body.matches)).toBe(true);
  });

  test('GET /api/matches/:jobId — Enforces filtering by minReputation', async () => {
    const minRep = 90;
    const res = await request(app)
      .get(`/api/matches/job_123?minReputation=${minRep}`)
      .set('Cookie', clientCookie);

    expect(res.status).toBe(200);
    // Ensure all returned matches meet the threshold
    const allHighRep = res.body.matches.every(m => m.reputationScore >= minRep);
    expect(allHighRep).toBe(true);
  });

  test('GET /api/matches/:jobId — Denies access to unauthenticated users', async () => {
    const res = await request(app).get('/api/matches/job_123');
    expect(res.status).toBe(401);
  });
});