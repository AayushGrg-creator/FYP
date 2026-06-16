/**
 * TaskTide Registration Security Tests
 * Path: server/tests/register.spec.js
 */

const request = require('supertest');
const app = require('../app');
const User = require('../models/User');
const mongoose = require('mongoose');

describe('Registration API Integration Tests', () => {

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('POST /api/v1/auth/register', () => {
    
    it('should successfully register a new user and hash the password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@tasktide.com',
          password: 'Password123!',
          role: 'freelancer'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.token).toBeDefined();
      
      // Verify password is NOT stored in plain text
      const user = await User.findOne({ email: 'test@tasktide.com' });
      expect(user.password).not.toBe('Password123!');
    });

    it('should prevent registration with a duplicate email', async () => {
      await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'dup@tasktide.com', password: 'password', role: 'client' });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'dup@tasktide.com', password: 'password', role: 'client' });

      expect(res.statusCode).toBe(400); // Bad Request: Email taken
    });

    it('should reject registration with weak passwords', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({ email: 'weak@tasktide.com', password: '123', role: 'client' });

      expect(res.statusCode).toBe(400);
    });
  });
});