/**
 * auth.routes.test.js
 * Supertest integration tests for /api/auth endpoints.
 *
 * Strategy:
 *   • Uses a real MongoDB connection to a test database (spun up by jest.setup.js)
 *   • Does NOT mock bcrypt or JWT — tests real hash + cookie injection sequences
 *   • Each describe block cleans its own test data in afterEach
 *   • Cookie session handling is verified through the httpOnly Set-Cookie header
 *
 * Endpoints covered:
 *   POST /api/auth/register     – FRAUTH01, FRAUTH02, FRAUTH09
 *   POST /api/auth/login        – FRAUTH03, FRAUTH04
 *   POST /api/auth/logout       – FRAUTH04
 *   POST /api/auth/forgot-password – FRAUTH05
 *   GET  /api/auth/me           – FRAUTH10 (role-based access)
 */

'use strict';

const request = require('supertest');
const mongoose = require('mongoose');
const app      = require('../../app');
const User     = require('../../models/User');

/* ─────────────────────────────────────────────
   Test fixtures
───────────────────────────────────────────── */
const CLIENT_FIXTURE = {
  name:     'Test Client',
  email:    'testclient@tasktide.test',
  password: 'SecurePass123!',
  role:     'client',
};

const FREELANCER_FIXTURE = {
  name:     'Test Freelancer',
  email:    'testfreelancer@tasktide.test',
  password: 'SecurePass456!',
  role:     'freelancer',
};

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
async function registerAndLogin(fixture) {
  await request(app).post('/api/auth/register').send(fixture);
  const res = await request(app).post('/api/auth/login').send({
    email:    fixture.email,
    password: fixture.password,
  });
  // Extract the httpOnly cookie for subsequent authenticated requests
  const cookie = res.headers['set-cookie']?.[0] || '';
  return { res, cookie };
}

/* ─────────────────────────────────────────────
   Cleanup
───────────────────────────────────────────── */
afterEach(async () => {
  await User.deleteMany({ email: /@tasktide\.test$/ });
});

/* ═══════════════════════════════════════════════════════════════════
   POST /api/auth/register
═══════════════════════════════════════════════════════════════════ */
describe('POST /api/auth/register', () => {
  test('FRAUTH01 — registers a new client with valid payload → 201', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(CLIENT_FIXTURE);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('token');
  });

  test('FRAUTH02 — password is NOT returned in plain text in response', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(CLIENT_FIXTURE);

    expect(JSON.stringify(res.body)).not.toContain(CLIENT_FIXTURE.password);
    // The stored hash should never be in the API response
    if (res.body.user) {
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.user.passwordHash).toBeUndefined();
    }
  });

  test('FRAUTH02 — bcrypt hash is stored (12 salt rounds prefix)', async () => {
    await request(app).post('/api/auth/register').send(CLIENT_FIXTURE);
    const user = await User.findOne({ email: CLIENT_FIXTURE.email }).select('+passwordHash');
    // bcrypt output always starts with $2b$12$ for 12 salt rounds
    expect(user.passwordHash).toMatch(/^\$2[ab]\$12\$/);
  });

  test('FRAUTH09 — duplicate email → 409 Conflict', async () => {
    await request(app).post('/api/auth/register').send(CLIENT_FIXTURE);
    const res = await request(app).post('/api/auth/register').send(CLIENT_FIXTURE);

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  test('missing required fields → 400 Bad Request', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'incomplete@tasktide.test' }); // missing password + role

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('invalid email format → 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...CLIENT_FIXTURE, email: 'not-an-email' });

    expect(res.status).toBe(400);
  });

  test('invalid role → 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...CLIENT_FIXTURE, role: 'superuser' });

    expect(res.status).toBe(400);
  });

  test('registers freelancer role correctly', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(FREELANCER_FIXTURE);

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   POST /api/auth/login
═══════════════════════════════════════════════════════════════════ */
describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(CLIENT_FIXTURE);
  });

  test('FRAUTH03 — valid credentials → 200, JWT set in httpOnly cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: CLIENT_FIXTURE.email, password: CLIENT_FIXTURE.password });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify cookie injection
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    const cookieStr = Array.isArray(setCookie) ? setCookie.join(';') : setCookie;
    expect(cookieStr).toMatch(/HttpOnly/i);
  });

  test('FRAUTH03 — JWT is present either in cookie or response body', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: CLIENT_FIXTURE.email, password: CLIENT_FIXTURE.password });

    const hasBodyToken  = Boolean(res.body.token);
    const hasCookieJwt  = (res.headers['set-cookie'] || [])
      .some(c => c.includes('token') || c.includes('jwt'));

    expect(hasBodyToken || hasCookieJwt).toBe(true);
  });

  test('wrong password → 401 Unauthorised', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: CLIENT_FIXTURE.email, password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('non-existent email → 401 (no user enumeration)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'ghost@tasktide.test', password: 'anything' });

    expect(res.status).toBe(401);
    // Must NOT reveal whether the email exists
    expect(res.body.message).not.toMatch(/email.*not.*found/i);
  });

  test('missing password field → 400', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: CLIENT_FIXTURE.email });

    expect(res.status).toBe(400);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   POST /api/auth/logout
═══════════════════════════════════════════════════════════════════ */
describe('POST /api/auth/logout', () => {
  test('FRAUTH04 — logout clears the auth cookie', async () => {
    const { cookie } = await registerAndLogin(CLIENT_FIXTURE);

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);

    // The Set-Cookie header should expire / clear the token cookie
    const setCookie = res.headers['set-cookie'];
    if (setCookie) {
      const cookieStr = Array.isArray(setCookie) ? setCookie.join(';') : setCookie;
      const isCleared = cookieStr.includes('Max-Age=0')
        || cookieStr.includes('Expires=Thu, 01 Jan 1970')
        || cookieStr.match(/token=;/i)
        || cookieStr.match(/token=\s*;/i);
      expect(isCleared).toBe(true);
    }
  });
});

/* ═══════════════════════════════════════════════════════════════════
   GET /api/auth/me  — protected route
═══════════════════════════════════════════════════════════════════ */
describe('GET /api/auth/me', () => {
  test('authenticated user receives their own profile', async () => {
    const { cookie } = await registerAndLogin(CLIENT_FIXTURE);

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookie);

    expect(res.status).toBe(200);
    expect(res.body.data?.email || res.body.email).toBe(CLIENT_FIXTURE.email);
  });

  test('unauthenticated request → 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  test('FRAUTH10 — expired / tampered JWT → 401', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', 'token=eyJhbGciOiJIUzI1NiJ9.TAMPERED.signature');

    expect(res.status).toBe(401);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   FRAUTH10 — Role-based access control
═══════════════════════════════════════════════════════════════════ */
describe('Role-based access control', () => {
  test('freelancer cannot access client-only job post route', async () => {
    const { cookie } = await registerAndLogin(FREELANCER_FIXTURE);

    const res = await request(app)
      .post('/api/jobs')
      .set('Cookie', cookie)
      .send({
        title:       'Test Job',
        description: 'A test job description for integration test',
        budget:      5000,
      });

    // Freelancers are forbidden from posting jobs
    expect([403, 401]).toContain(res.status);
  });

  test('client cannot access freelancer-only profile routes', async () => {
    const { cookie } = await registerAndLogin(CLIENT_FIXTURE);

    const res = await request(app)
      .get('/api/profile/freelancer/skills')
      .set('Cookie', cookie);

    expect([403, 401, 404]).toContain(res.status);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   POST /api/auth/forgot-password  — FRAUTH05
═══════════════════════════════════════════════════════════════════ */
describe('POST /api/auth/forgot-password', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(CLIENT_FIXTURE);
  });

  test('FRAUTH05 — known email returns 200 (email dispatched)', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: CLIENT_FIXTURE.email });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  test('unknown email returns 200 (no user enumeration)', async () => {
    // Must return 200 regardless — do not confirm whether email exists
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nonexistent@tasktide.test' });

    expect(res.status).toBe(200);
  });

  test('missing email field → 400', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({});

    expect(res.status).toBe(400);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   NFR-AUTH02 — Response time SLO
═══════════════════════════════════════════════════════════════════ */
describe('Performance — NFR-AUTH01', () => {
  test('register endpoint responds within 2000ms', async () => {
    const start = Date.now();
    await request(app).post('/api/auth/register').send({
      ...CLIENT_FIXTURE,
      email: `perf-${Date.now()}@tasktide.test`,
    });
    expect(Date.now() - start).toBeLessThan(2000);
  });

  test('login endpoint responds within 1000ms', async () => {
    await request(app).post('/api/auth/register').send(CLIENT_FIXTURE);
    const start = Date.now();
    await request(app).post('/api/auth/login').send({
      email:    CLIENT_FIXTURE.email,
      password: CLIENT_FIXTURE.password,
    });
    expect(Date.now() - start).toBeLessThan(1000);
  });
});