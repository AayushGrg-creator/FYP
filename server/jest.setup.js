/**
 * jest.setup.js
 * TaskTide – unified test environment bootstrap
 *
 * This file serves THREE roles depending on how Jest calls it:
 *
 *  1. globalSetup    – spawns a MongoMemoryServer ONCE for the entire
 *                      test run and writes its URI to process.env so
 *                      every worker process can connect.
 *
 *  2. setupFilesAfterFramework (per-worker) – connects Mongoose,
 *                      seeds base fixtures, and wires up global mocks.
 *
 *  3. globalTeardown (jest.teardown.js, see bottom export comment) –
 *                      stops the MongoMemoryServer and cleans temp dirs.
 *
 * Because Jest's globalSetup runs in a separate Node process it cannot
 * share variables with worker processes; we use process.env as the IPC
 * channel (safe – workers inherit env from the parent process).
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════════════
   SECTION 1 — globalSetup  (exported as default function)
   Called once before any test worker starts.
   ═══════════════════════════════════════════════════════════════════════ */
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod; // module-level singleton written here, read in globalTeardown

async function globalSetup() {
  // Skip if the test run is unit-only (no DB needed)
  if (process.env.TEST_PROJECT === 'unit') return;

  // Spin up an ephemeral MongoDB instance
  mongod = await MongoMemoryServer.create({
    instance: {
      // Pin to a deterministic port so supertest base URLs stay stable
      port:    27099,
      dbName: 'tasktide_test',
    },
    binary: {
      version: '6.0.4', // must match MongoDB Atlas version in production
    },
  });

  const uri = mongod.getUri();

  // Propagate to all Jest worker processes via env
  process.env.MONGODB_URI_TEST = uri;
  process.env.NODE_ENV          = 'test';

  // Write URI to a temp file so globalTeardown (separate process) can
  // stop the server even if the module variable is unreachable.
  const os   = require('os');
  const fs   = require('fs');
  const path = require('path');
  const tmp  = path.join(os.tmpdir(), 'tasktide-mongo-test-uri.txt');
  fs.writeFileSync(tmp, uri, 'utf8');

  console.log(`\n  🧪  MongoMemoryServer started → ${uri}\n`);
}

module.exports = globalSetup;

/* ═══════════════════════════════════════════════════════════════════════
   SECTION 2 — per-worker setup  (setupFilesAfterFramework)
   Runs inside each Jest worker process before the test suite.
   ═══════════════════════════════════════════════════════════════════════ */

// Guard: only execute worker setup when running as a module file
// (globalSetup is called via the exported function above)
if (!module.parent || module.parent.id.includes('jest-runtime')) {
  bootstrapWorker();
}

async function bootstrapWorker() {
  const mongoose = require('mongoose');
  const path     = require('path');

  /* ── Environment defaults ─────────────────────────────────────────── */
  process.env.NODE_ENV       = 'test';
  process.env.JWT_SECRET     = 'tasktide_test_jwt_secret_32chars!!';
  process.env.JWT_EXPIRES_IN = '1d';
  process.env.BCRYPT_ROUNDS  = '4';            // reduce hashing cost in tests
  process.env.PLATFORM_FEE   = '0.08';
  process.env.KHALTI_SECRET  = 'test_khalti_secret';
  process.env.STRIPE_SECRET  = 'sk_test_stripe_secret';
  process.env.EMAIL_FROM     = 'no-reply@tasktide.test';

  /* ── MongoDB connection ───────────────────────────────────────────── */
  const uri = process.env.MONGODB_URI_TEST || 'mongodb://127.0.0.1:27099/tasktide_test';

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10_000,
      socketTimeoutMS:          30_000,
    });
  }

  /* ── Global Jest helpers ──────────────────────────────────────────── */

  // Wipe every collection between tests (called from beforeEach in
  // integration files, but provided globally for convenience)
  global.clearCollections = async () => {
    const collections = mongoose.connection.collections;
    await Promise.all(
      Object.values(collections).map((col) => col.deleteMany({}))
    );
  };

  // Close Mongoose connection after all tests in this worker
  afterAll(async () => {
    await mongoose.disconnect();
  });

  /* ── Global mocks ─────────────────────────────────────────────────── */

  // Mock nodemailer so no real emails are dispatched during tests
  jest.mock('nodemailer', () => ({
    createTransport: jest.fn(() => ({
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-msg-id' }),
    })),
  }));

  // Mock Khalti payment service – keeps tests hermetic
  jest.mock(
    path.resolve(__dirname, '../services/khalti.service'),
    () => ({
      initiatePayment:  jest.fn().mockResolvedValue({ pidx: 'mock-khalti-pidx', payment_url: 'https://khalti.test/pay' }),
      verifyPayment:    jest.fn().mockResolvedValue({ status: 'Completed', transaction_id: 'mock-txn-001' }),
      refundPayment:    jest.fn().mockResolvedValue({ status: 'Refunded' }),
    }),
    { virtual: true }
  );

  // Mock Stripe service
  jest.mock(
    path.resolve(__dirname, '../services/stripe.service'),
    () => ({
      createPaymentIntent: jest.fn().mockResolvedValue({ client_secret: 'pi_test_secret', id: 'pi_test_id' }),
      capturePayment:      jest.fn().mockResolvedValue({ status: 'succeeded' }),
      refundPayment:       jest.fn().mockResolvedValue({ status: 'succeeded' }),
    }),
    { virtual: true }
  );

  // Mock notification service (Socket.io emitter)
  jest.mock(
    path.resolve(__dirname, '../services/notification.service'),
    () => ({
      send:      jest.fn().mockResolvedValue(undefined),
      broadcast: jest.fn().mockResolvedValue(undefined),
    }),
    { virtual: true }
  );
}

/*
 * ── jest.teardown.js (companion file content) ────────────────────────
 * Create server/jest.teardown.js with:
 *
 *   const { MongoMemoryServer } = require('mongodb-memory-server');
 *   const fs   = require('fs');
 *   const os   = require('os');
 *   const path = require('path');
 *
 *   module.exports = async function globalTeardown() {
 *     const tmp = path.join(os.tmpdir(), 'tasktide-mongo-test-uri.txt');
 *     if (fs.existsSync(tmp)) {
 *       fs.unlinkSync(tmp);
 *     }
 *     // MongoMemoryServer stops automatically when process exits,
 *     // but explicit stop avoids "open handle" Jest warnings.
 *     if (global.__MONGOD__) await global.__MONGOD__.stop();
 *   };
 */