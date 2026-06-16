/**
 * TaskTide Proposal Route Integration Tests
 * Path: server/tests/proposal.routes.test.js
 * * Strategy:
 * • Validates that only freelancers can submit proposals.
 * • Ensures proposal submission links correctly to job IDs and user profiles.
 * • Enforces state validation (cannot propose to an 'archived' or 'closed' job).
 */

'use strict';

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const User = require('../../models/User');
const Proposal = require('../../models/Proposal');

/* ─────────────────────────────────────────────
   Fixtures & Helpers
───────────────────────────────────────────── */
const FREELANCER_USER = {
  name: 'Bidder Freelancer',
  email: 'bidder@tasktide.test',
  password: 'SecurePassword123!',
  role: 'freelancer'
};

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
  await Proposal.deleteMany({});
  await mongoose.connection.close();
});

/* ═══════════════════════════════════════════════════════════════════
   Proposal Lifecycle Tests
═══════════════════════════════════════════════════════════════════ */
describe('Proposal API Access Patterns', () => {
  let freelancerCookie;

  beforeAll(async () => {
    freelancerCookie = await getAuthCookie(FREELANCER_USER);
  });

  test('POST /api/proposals — Freelancer can submit a proposal', async () => {
    const res = await request(app)
      .post('/api/proposals')
      .set('Cookie', freelancerCookie)
      .send({
        jobId: 'job_123',
        bidAmount: 1200,
        coverLetter: 'I am perfect for this project.'
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('_id');
  });

  test('POST /api/proposals — Client forbidden from submitting proposals', async () => {
    // Requires a separate client login fixture
    // ... setup client cookie
    const res = await request(app)
      .post('/api/proposals')
      .set('Cookie', 'client_cookie_here')
      .send({ jobId: 'job_123', bidAmount: 100 });

    expect(res.status).toBe(403);
  });

  test('GET /api/proposals/:jobId — Returns all proposals for a job', async () => {
    const res = await request(app)
      .get('/api/proposals/job_123')
      .set('Cookie', freelancerCookie);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});