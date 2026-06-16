/**
 * auth.test.js
 * Unit tests for authentication utilities and core security logic.
 *
 * Focus:
 * • Password hashing consistency (bcrypt salt rounds)
 * • JWT token generation payload validation
 * • Role hierarchy and authorization predicates
 */

'use strict';

const { 
  hashPassword, 
  comparePassword, 
  generateToken, 
  verifyToken, 
  hasPermission 
} = require('../../utils/authUtils');

/* ═══════════════════════════════════════════════════════════════════
   SUITE 1 — Password Security (Bcrypt)
═══════════════════════════════════════════════════════════════════ */
describe('Password Security Utilities', () => {
  const plainPassword = 'Password123!';

  test('hashPassword() generates a valid bcrypt string', async () => {
    const hash = await hashPassword(plainPassword);
    expect(hash).toMatch(/^\$2[ab]\$12\$/); // Verify 12 salt rounds
    expect(hash).not.toBe(plainPassword);
  });

  test('comparePassword() matches valid credentials', async () => {
    const hash = await hashPassword(plainPassword);
    const isMatch = await comparePassword(plainPassword, hash);
    expect(isMatch).toBe(true);
  });

  test('comparePassword() rejects incorrect passwords', async () => {
    const hash = await hashPassword(plainPassword);
    const isMatch = await comparePassword('WrongPass', hash);
    expect(isMatch).toBe(false);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   SUITE 2 — Token Management (JWT)
═══════════════════════════════════════════════════════════════════ */
describe('JWT Management', () => {
  const user = { id: 'u_123', role: 'freelancer' };

  test('generateToken() creates a payload-compatible token', () => {
    const token = generateToken(user);
    expect(typeof token).toBe('string');
  });

  test('verifyToken() decodes back the correct user data', () => {
    const token = generateToken(user);
    const decoded = verifyToken(token);
    expect(decoded.id).toBe(user.id);
    expect(decoded.role).toBe(user.role);
  });

  test('verifyToken() rejects tampered tokens', () => {
    const tampered = 'eyJhbGciOiJIUzI1NiJ9.wrong.signature';
    expect(() => verifyToken(tampered)).toThrow();
  });
});

/* ═══════════════════════════════════════════════════════════════════
   SUITE 3 — Permission/Role Hierarchy
═══════════════════════════════════════════════════════════════════ */
describe('hasPermission()', () => {
  test('admin role has universal access', () => {
    expect(hasPermission('admin', 'create_job')).toBe(true);
    expect(hasPermission('admin', 'delete_user')).toBe(true);
  });

  test('client role can create jobs but cannot delete users', () => {
    expect(hasPermission('client', 'create_job')).toBe(true);
    expect(hasPermission('client', 'delete_user')).toBe(false);
  });

  test('freelancer role cannot create jobs', () => {
    expect(hasPermission('freelancer', 'create_job')).toBe(false);
  });
});