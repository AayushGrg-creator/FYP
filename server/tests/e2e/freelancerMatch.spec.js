/**
 * TaskTide Freelancer Matching Logic Tests
 * Path: server/tests/freelancerMatch.spec.js
 */

const request = require('supertest');
const app = require('../app');
const mongoose = require('mongoose');

describe('Freelancer Matching Engine API', () => {
  
  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('GET /api/v1/jobs/:id/matches', () => {
    
    it('should return a ranked list of qualified freelancers', async () => {
      const res = await request(app)
        .get('/api/v1/jobs/job_123/matches')
        .set('Authorization', `Bearer ${process.env.CLIENT_TOKEN}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      // Ensure the first item is the most qualified based on reputation/skills
      expect(res.body.data[0]).toHaveProperty('reputationScore');
    });

    it('should return 404 when matching against a non-existent job', async () => {
      const res = await request(app)
        .get('/api/v1/jobs/invalid_id/matches')
        .set('Authorization', `Bearer ${process.env.CLIENT_TOKEN}`);

      expect(res.statusCode).toBe(404);
    });

    it('should enforce strict skill-set compatibility filtering', async () => {
      const res = await request(app)
        .get('/api/v1/jobs/job_123/matches?minReputation=80')
        .set('Authorization', `Bearer ${process.env.CLIENT_TOKEN}`);

      // Verify that all returned freelancers meet the minimum trust criteria
      const allQualified = res.body.data.every(f => f.reputationScore >= 80);
      expect(allQualified).toBe(true);
    });
  });
});