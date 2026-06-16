/**
 * TaskTide Escrow Service Unit Tests
 * Path: server/tests/escrow.spec.js
 */

const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');
const Escrow = require('../models/Escrow');

describe('Escrow API Integration Tests', () => {
  
  // Clean up after tests
  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/v1/admin/escrow/:projectId/adjust', () => {
    
    it('should successfully adjust escrow amount by authorized admin', async () => {
      const res = await request(app)
        .post('/api/v1/admin/escrow/123/adjust')
        .set('Authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
        .send({ amount: 500, adjustmentType: 'release' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should block unauthorized users from adjusting escrow', async () => {
      const res = await request(app)
        .post('/api/v1/admin/escrow/123/adjust')
        .set('Authorization', `Bearer ${process.env.USER_TOKEN}`)
        .send({ amount: 500 });

      expect(res.statusCode).toBe(403);
    });

    it('should validate financial input ranges', async () => {
      const res = await request(app)
        .post('/api/v1/admin/escrow/123/adjust')
        .set('Authorization', `Bearer ${process.env.ADMIN_TOKEN}`)
        .send({ amount: -500 }); // Negative amounts should be blocked

      expect(res.statusCode).toBe(400);
    });
  });
});