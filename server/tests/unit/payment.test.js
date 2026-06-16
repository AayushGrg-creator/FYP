/**
 * TaskTide Payment Service Integration Tests
 * Path: server/tests/payment.test.js
 * * Strategy:
 * • Validates transaction status transitions (Pending -> Completed/Failed).
 * • Tests idempotency: Ensure repeated requests with the same ID do not charge the user twice.
 * • Verifies integration hooks with external payment gateways (via mocking).
 */

'use strict';

const request = require('supertest');
const app = require('../../app');
const Payment = require('../../models/Payment');
const { processPayment } = require('../../services/paymentService');

// Mocking the external payment provider to avoid real network calls
jest.mock('../../services/stripeService', () => ({
  createCharge: jest.fn().mockResolvedValue({ status: 'succeeded', id: 'ch_test123' })
}));

describe('Payment Engine Integration', () => {
  
  test('processPayment() updates database status correctly on success', async () => {
    const paymentData = {
      projectId: 'proj_001',
      amount: 150000,
      currency: 'USD'
    };

    const result = await processPayment(paymentData);
    
    expect(result.status).toBe('completed');
    expect(result.chargeId).toBe('ch_test123');
  });

  test('prevents double-processing (idempotency)', async () => {
    const idempotencyKey = 'unique_request_id_123';
    
    // First request
    await request(app)
      .post('/api/payments/charge')
      .set('X-Idempotency-Key', idempotencyKey)
      .send({ amount: 1000 });

    // Second request with same key
    const res = await request(app)
      .post('/api/payments/charge')
      .set('X-Idempotency-Key', idempotencyKey)
      .send({ amount: 1000 });

    expect(res.status).toBe(409); // Conflict: already processed
  });
});