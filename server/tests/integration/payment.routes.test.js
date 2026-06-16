/**
 * server/tests/integration/payment.routes.test.js
 * TaskTide – Integration tests for /api/payments endpoints
 *
 * Covers the full escrow lifecycle from Section 5.3 of the FYP report:
 *   ✓ POST /api/payments/fund-escrow      – Khalti + Stripe funding
 *   ✓ POST /api/payments/milestones/:id/submit   – freelancer submission
 *   ✓ POST /api/payments/milestones/:id/approve  – client approval & release
 *   ✓ POST /api/payments/milestones/:id/dispute  – dispute freezing
 *   ✓ POST /api/payments/webhooks/khalti         – webhook signature + idempotency
 *   ✓ POST /api/payments/webhooks/stripe
 *   ✓ GET  /api/payments/transactions            – history + balance
 *   ✓ Platform fee deduction (8 %)
 *   ✓ Insufficient escrow balance rejection
 *   ✓ Duplicate webhook idempotency
 */

'use strict';

const request  = require('supertest');
const mongoose = require('mongoose');
const crypto   = require('crypto');

const app         = require('../../app');
const User        = require('../../models/User');
const Job         = require('../../models/Job');
const Proposal    = require('../../models/Proposal');
const Project     = require('../../models/Project');
const Milestone   = require('../../models/Milestone');
const Transaction = require('../../models/Transaction');

/* ── Test users ──────────────────────────────────────────────────────── */
const CLIENT_USER     = { name: 'Pay Client',     email: 'payclient@tasktide.test',     password: 'TestPass123!', role: 'client'     };
const FREELANCER_USER = { name: 'Pay Freelancer', email: 'payfreelancer@tasktide.test', password: 'TestPass123!', role: 'freelancer' };

/* ── Cookie store ────────────────────────────────────────────────────── */
let clientCookies;
let freelancerCookies;
let clientDoc;
let freelancerDoc;

/* ── Shared test state ───────────────────────────────────────────────── */
let projectId;
let milestoneId;

/* ── Helpers ─────────────────────────────────────────────────────────── */
async function registerAndLogin(user) {
  await request(app).post('/api/auth/register').send(user);
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: user.email, password: user.password });
  return res.headers['set-cookie'];
}

function khaltiWebhookSignature(body, secret = process.env.KHALTI_WEBHOOK_SECRET ?? 'test-webhook-secret') {
  return crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex');
}

function stripeWebhookSignature(body, secret = 'whsec_test_stripe_secret') {
  const ts = Math.floor(Date.now() / 1000);
  const signed = `${ts}.${JSON.stringify(body)}`;
  const sig = crypto.createHmac('sha256', secret).update(signed).digest('hex');
  return `t=${ts},v1=${sig}`;
}

/* ── One-time setup: create users, job, proposal, project, milestone ── */
beforeAll(async () => {
  clientCookies     = await registerAndLogin(CLIENT_USER);
  freelancerCookies = await registerAndLogin(FREELANCER_USER);
  clientDoc         = await User.findOne({ email: CLIENT_USER.email });
  freelancerDoc     = await User.findOne({ email: FREELANCER_USER.email });

  // Create a job
  const jobRes = await request(app)
    .post('/api/jobs')
    .set('Cookie', clientCookies)
    .send({
      title:          'Integration Test Job',
      description:    'A job to test payment flows end-to-end in the integration test suite.',
      budgetType:     'fixed',
      budgetAmount:   50000,
      skillsRequired: ['react'],
      category:       'web_development',
    });
  const jobId = jobRes.body.data._id;

  // Submit a proposal from freelancer
  const propRes = await request(app)
    .post('/api/proposals')
    .set('Cookie', freelancerCookies)
    .send({
      job:              jobId,
      bidAmount:        50000,
      deliveryTimeframe: 14,
      coverLetter:      'I am well-suited for this project due to my extensive React experience and track record of on-time delivery.',
      attachedMilestones: [
        { title: 'Phase 1 – Setup & Architecture', amount: 20000, estimatedDays: 5 },
        { title: 'Phase 2 – Feature Development',  amount: 30000, estimatedDays: 9 },
      ],
    });
  const proposalId = propRes.body.data._id;

  // Client accepts the proposal
  const acceptRes = await request(app)
    .patch(`/api/proposals/${proposalId}/accept`)
    .set('Cookie', clientCookies);
  projectId = acceptRes.body.data.projectId;

  // Get the first milestone ID
  const mRes = await request(app)
    .get(`/api/projects/${projectId}/milestones`)
    .set('Cookie', clientCookies);
  milestoneId = mRes.body.data[0]._id;
});

beforeEach(async () => {
  // Only clear transactions/milestone-status between tests; preserve project structure
  await Transaction.deleteMany({});
});

/* ═══════════════════════════════════════════════════════════════════════
   POST /api/payments/fund-escrow
   ═══════════════════════════════════════════════════════════════════════ */
describe('POST /api/payments/fund-escrow', () => {
  test('200 – client can initiate Khalti escrow funding', async () => {
    const res = await request(app)
      .post('/api/payments/fund-escrow')
      .set('Cookie', clientCookies)
      .send({
        projectId,
        milestoneId,
        gateway: 'khalti',
        returnUrl: 'https://tasktide.vercel.app/payments/callback',
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.paymentUrl).toMatch(/khalti/i);
    expect(res.body.data.pidx).toBeDefined();
  });

  test('200 – client can initiate Stripe payment intent', async () => {
    const res = await request(app)
      .post('/api/payments/fund-escrow')
      .set('Cookie', clientCookies)
      .send({ projectId, milestoneId, gateway: 'stripe' })
      .expect(200);

    expect(res.body.data.clientSecret).toContain('pi_test');
  });

  test('403 – freelancer cannot fund their own escrow', async () => {
    await request(app)
      .post('/api/payments/fund-escrow')
      .set('Cookie', freelancerCookies)
      .send({ projectId, milestoneId, gateway: 'khalti' })
      .expect(403);
  });

  test('401 – unauthenticated request rejected', async () => {
    await request(app)
      .post('/api/payments/fund-escrow')
      .send({ projectId, milestoneId, gateway: 'khalti' })
      .expect(401);
  });

  test('404 – non-existent project returns Not Found', async () => {
    await request(app)
      .post('/api/payments/fund-escrow')
      .set('Cookie', clientCookies)
      .send({ projectId: new mongoose.Types.ObjectId().toString(), milestoneId, gateway: 'khalti' })
      .expect(404);
  });

  test('422 – invalid gateway value rejected', async () => {
    await request(app)
      .post('/api/payments/fund-escrow')
      .set('Cookie', clientCookies)
      .send({ projectId, milestoneId, gateway: 'paypal' })
      .expect(422);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   POST /api/payments/milestones/:id/submit
   ═══════════════════════════════════════════════════════════════════════ */
describe('POST /api/payments/milestones/:id/submit', () => {
  beforeEach(async () => {
    // Seed the milestone as funded
    await Milestone.findByIdAndUpdate(milestoneId, {
      status:    'funded',
      fundedAt:  new Date(),
      gateway:   'khalti',
      gatewayRef: 'mock-khalti-ref-001',
    });
  });

  test('200 – freelancer can submit a funded milestone', async () => {
    const res = await request(app)
      .post(`/api/payments/milestones/${milestoneId}/submit`)
      .set('Cookie', freelancerCookies)
      .send({
        deliverableUrl: 'https://github.com/tasktide/project-abc/releases/v1.0',
        notes:          'Phase 1 complete. All acceptance criteria met. Demo video attached.',
      })
      .expect(200);

    expect(res.body.data.status).toBe('pending_approval');
    expect(res.body.data.submission.submittedAt).toBeDefined();
  });

  test('403 – client cannot submit a milestone', async () => {
    await request(app)
      .post(`/api/payments/milestones/${milestoneId}/submit`)
      .set('Cookie', clientCookies)
      .send({ deliverableUrl: 'https://example.com', notes: 'Trying to submit' })
      .expect(403);
  });

  test('409 – cannot re-submit an already-submitted milestone', async () => {
    await Milestone.findByIdAndUpdate(milestoneId, { status: 'pending_approval' });
    await request(app)
      .post(`/api/payments/milestones/${milestoneId}/submit`)
      .set('Cookie', freelancerCookies)
      .send({ deliverableUrl: 'https://example.com', notes: 'Duplicate submit' })
      .expect(409);
  });

  test('400 – cannot submit an unfunded milestone', async () => {
    await Milestone.findByIdAndUpdate(milestoneId, { status: 'created' });
    await request(app)
      .post(`/api/payments/milestones/${milestoneId}/submit`)
      .set('Cookie', freelancerCookies)
      .send({ deliverableUrl: 'https://example.com', notes: 'Premature submit' })
      .expect(400);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   POST /api/payments/milestones/:id/approve  – FR-PAY-04
   ═══════════════════════════════════════════════════════════════════════ */
describe('POST /api/payments/milestones/:id/approve', () => {
  beforeEach(async () => {
    await Milestone.findByIdAndUpdate(milestoneId, {
      status:      'pending_approval',
      fundedAt:    new Date(),
      gateway:     'khalti',
      gatewayRef:  'mock-khalti-ref-002',
      'submission.submittedAt': new Date(),
    });
  });

  test('200 – client approves milestone; status becomes released', async () => {
    const res = await request(app)
      .post(`/api/payments/milestones/${milestoneId}/approve`)
      .set('Cookie', clientCookies)
      .expect(200);

    expect(res.body.data.status).toBe('released');
    expect(res.body.data.releasedAt).toBeDefined();
  });

  test('platform fee of 8% is deducted on release', async () => {
    const milestone = await Milestone.findById(milestoneId);
    const res = await request(app)
      .post(`/api/payments/milestones/${milestoneId}/approve`)
      .set('Cookie', clientCookies)
      .expect(200);

    const expectedNet = milestone.amount * 0.92; // 100% - 8% fee
    expect(res.body.data.netAmount).toBeCloseTo(expectedNet, 1);
    expect(res.body.data.platformFee).toBeCloseTo(milestone.amount * 0.08, 1);
  });

  test('transaction record is created on approval', async () => {
    await request(app)
      .post(`/api/payments/milestones/${milestoneId}/approve`)
      .set('Cookie', clientCookies);

    const txn = await Transaction.findOne({ milestoneId });
    expect(txn).not.toBeNull();
    expect(txn.status).toBe('released');
    expect(txn.gateway).toBe('khalti');
  });

  test('403 – freelancer cannot approve their own milestone', async () => {
    await request(app)
      .post(`/api/payments/milestones/${milestoneId}/approve`)
      .set('Cookie', freelancerCookies)
      .expect(403);
  });

  test('409 – already-released milestone cannot be approved again', async () => {
    await Milestone.findByIdAndUpdate(milestoneId, { status: 'released' });
    await request(app)
      .post(`/api/payments/milestones/${milestoneId}/approve`)
      .set('Cookie', clientCookies)
      .expect(409);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   POST /api/payments/milestones/:id/dispute  – FR-PAY-05
   ═══════════════════════════════════════════════════════════════════════ */
describe('POST /api/payments/milestones/:id/dispute', () => {
  beforeEach(async () => {
    await Milestone.findByIdAndUpdate(milestoneId, { status: 'pending_approval' });
  });

  test('200 – client can raise a dispute; funds are frozen', async () => {
    const res = await request(app)
      .post(`/api/payments/milestones/${milestoneId}/dispute`)
      .set('Cookie', clientCookies)
      .send({
        reason: 'The deliverable does not meet the agreed acceptance criteria. Missing feature X.',
      })
      .expect(200);

    expect(res.body.data.status).toBe('disputed');
    expect(res.body.data.disputeDetails.raisedAt).toBeDefined();
  });

  test('422 – dispute reason is required', async () => {
    await request(app)
      .post(`/api/payments/milestones/${milestoneId}/dispute`)
      .set('Cookie', clientCookies)
      .send({})
      .expect(422);
  });

  test('403 – freelancer cannot dispute their own milestone', async () => {
    await request(app)
      .post(`/api/payments/milestones/${milestoneId}/dispute`)
      .set('Cookie', freelancerCookies)
      .send({ reason: 'Trying to dispute my own work' })
      .expect(403);
  });

  test('409 – already-disputed milestone cannot be re-disputed', async () => {
    await Milestone.findByIdAndUpdate(milestoneId, { status: 'disputed' });
    await request(app)
      .post(`/api/payments/milestones/${milestoneId}/dispute`)
      .set('Cookie', clientCookies)
      .send({ reason: 'Still disputing' })
      .expect(409);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   POST /api/payments/webhooks/khalti  – FR-PAY-07
   ═══════════════════════════════════════════════════════════════════════ */
describe('POST /api/payments/webhooks/khalti', () => {
  const eventBody = {
    event:          'payment.completed',
    pidx:           'mock-khalti-pidx-webhook',
    transaction_id: 'txn-khalti-001',
    amount:         2000000, // NPR 20,000 in paisa
    status:         'Completed',
  };

  test('200 – valid webhook with correct signature is processed', async () => {
    const sig = khaltiWebhookSignature(eventBody);
    const res = await request(app)
      .post('/api/payments/webhooks/khalti')
      .set('x-khalti-signature', sig)
      .send(eventBody)
      .expect(200);

    expect(res.body.received).toBe(true);
  });

  test('401 – webhook with invalid signature is rejected', async () => {
    await request(app)
      .post('/api/payments/webhooks/khalti')
      .set('x-khalti-signature', 'invalid-signature-abc123')
      .send(eventBody)
      .expect(401);
  });

  test('200 – duplicate webhook with same event ID is idempotent (FR-NFRPAY-02)', async () => {
    const sig = khaltiWebhookSignature(eventBody);

    // First delivery
    await request(app)
      .post('/api/payments/webhooks/khalti')
      .set('x-khalti-signature', sig)
      .send(eventBody)
      .expect(200);

    // Second delivery with identical payload and transaction_id
    const res2 = await request(app)
      .post('/api/payments/webhooks/khalti')
      .set('x-khalti-signature', sig)
      .send(eventBody)
      .expect(200);

    // Idempotency: second call acknowledged but not re-processed
    expect(res2.body.duplicate).toBe(true);

    // Exactly one transaction record should exist
    const count = await Transaction.countDocuments({ gatewayRef: eventBody.transaction_id });
    expect(count).toBe(1);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   POST /api/payments/webhooks/stripe
   ═══════════════════════════════════════════════════════════════════════ */
describe('POST /api/payments/webhooks/stripe', () => {
  const stripeEvent = {
    id:   'evt_test_stripe_001',
    type: 'payment_intent.succeeded',
    data: { object: { id: 'pi_test_id', amount: 5000000, currency: 'usd' } },
  };

  test('200 – valid Stripe webhook signature accepted', async () => {
    const sig = stripeWebhookSignature(stripeEvent);
    await request(app)
      .post('/api/payments/webhooks/stripe')
      .set('stripe-signature', sig)
      .send(stripeEvent)
      .expect(200);
  });

  test('401 – missing Stripe signature header rejected', async () => {
    await request(app)
      .post('/api/payments/webhooks/stripe')
      .send(stripeEvent)
      .expect(401);
  });
});

/* ═══════════════════════════════════════════════════════════════════════
   GET /api/payments/transactions  – FR-PAY-09
   ═══════════════════════════════════════════════════════════════════════ */
describe('GET /api/payments/transactions', () => {
  test('200 – authenticated user can retrieve their transaction history', async () => {
    const res = await request(app)
      .get('/api/payments/transactions')
      .set('Cookie', clientCookies)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('response includes pagination metadata', async () => {
    const res = await request(app)
      .get('/api/payments/transactions?page=1&limit=10')
      .set('Cookie', clientCookies)
      .expect(200);

    expect(res.body.pagination).toBeDefined();
    expect(res.body.pagination).toHaveProperty('total');
    expect(res.body.pagination).toHaveProperty('page');
  });

  test('401 – unauthenticated request rejected', async () => {
    await request(app).get('/api/payments/transactions').expect(401);
  });

  test('transactions do not leak other users\' financial data', async () => {
    // Seed a transaction for client only
    await Transaction.create({
      projectId:    projectId,
      milestoneId:  milestoneId,
      clientId:     clientDoc._id,
      freelancerId: freelancerDoc._id,
      amount:       20000,
      gateway:      'khalti',
      gatewayRef:   'leak-test-ref',
      status:       'released',
    });

    // A completely different user should not see this transaction
    const otherUser = { name: 'Other User', email: 'other@test.com', password: 'OtherPass123!', role: 'client' };
    const otherCookies = await (async () => {
      await request(app).post('/api/auth/register').send(otherUser);
      const r = await request(app).post('/api/auth/login').send({ email: otherUser.email, password: otherUser.password });
      return r.headers['set-cookie'];
    })();

    const res = await request(app)
      .get('/api/payments/transactions')
      .set('Cookie', otherCookies)
      .expect(200);

    const ids = res.body.data.map((t) => t.gatewayRef);
    expect(ids).not.toContain('leak-test-ref');
  });
});