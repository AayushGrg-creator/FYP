/**
 * TaskTide Job Route Integration Tests
 * Path: server/tests/job.routes.test.js
 * * Strategy:
 * • Verifies CRUD operations for job postings.
 * • Validates Role-Based Access Control (RBAC).
 * • Ensures ownership validation (users can only edit their own jobs).
 */

'use strict';

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../app');
const User = require('../../models/User');
const Job = require('../../models/Job');

// Test Fixtures
const CLIENT_USER = {
  name: 'Test Client',
  email: 'client@tasktide.test',
  password: 'SecurePassword123!',
  role: 'client'
};

const FREELANCER_USER = {
  name: 'Test Freelancer',
  email: 'freelancer@tasktide.test',
  password: 'SecurePassword123!',
  role: 'freelancer'
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
  await Job.deleteMany({});
  await mongoose.connection.close();
});

/* ═══════════════════════════════════════════════════════════════════
   Job CRUD & Access Tests
═══════════════════════════════════════════════════════════════════ */
describe('Job API Access Patterns', () => {
  let clientCookie;
  let freelancerCookie;

  beforeAll(async () => {
    clientCookie = await getAuthCookie(CLIENT_USER);
    freelancerCookie = await getAuthCookie(FREELANCER_USER);
  });

  test('POST /api/jobs — Client can create a job', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .set('Cookie', clientCookie)
      .send({
        title: 'Build a Website',
        description: 'Need a developer',
        budget: 5000
      });

    expect(res.status).toBe(201);
    expect(res.body.data).toHaveProperty('_id');
  });

  test('POST /api/jobs — Freelancer forbidden from creating jobs', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .set('Cookie', freelancerCookie)
      .send({
        title: 'Malicious Job Post',
        description: 'Should fail',
        budget: 100
      });

    expect(res.status).toBe(403);
  });

  test('GET /api/jobs — Public access allowed', async () => {
    const res = await request(app).get('/api/jobs');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('PUT /api/jobs/:id — Ownership validation', async () => {
    // 1. Create a job as client
    const jobRes = await request(app)
      .post('/api/jobs')
      .set('Cookie', clientCookie)
      .send({ title: 'Edit Me', description: 'desc', budget: 1000 });
    
    const jobId = jobRes.body.data._id;

    // 2. Attempt to update with different user (Freelancer)
    const updateRes = await request(app)
      .put(`/api/jobs/${jobId}`)
      .set('Cookie', freelancerCookie)
      .send({ title: 'Hacked Title' });

    expect(updateRes.status).toBe(403);
  });
});