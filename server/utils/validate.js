/**
 * utils/validate.js
 * Centralized request validation schema & helper functions.
 * * Strategy:
 * • Provides declarative validation for registration, job posting, and financial transactions.
 * • Standardizes the error response object for consistent API output.
 * • Includes basic sanitization to mitigate XSS and injection risks.
 */

'use strict';

/**
 * Validates registration payloads for both Clients and Freelancers.
 */
function validateRegistration(data) {
  const errors = {};
  
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'A valid email address is required.';
  }
  
  if (!data.password || data.password.length < 8) {
    errors.password = 'Password must be at least 8 characters long.';
  }
  
  if (!['client', 'freelancer'].includes(data.role)) {
    errors.role = 'Role must be either "client" or "freelancer".';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

/**
 * Validates new job postings.
 */
function validateJobPosting(data) {
  const errors = {};
  
  if (!data.title || data.title.length < 10) {
    errors.title = 'Job title must be at least 10 characters.';
  }
  
  if (!data.budget || typeof data.budget !== 'number' || data.budget <= 0) {
    errors.budget = 'A valid positive budget is required.';
  }
  
  if (!Array.isArray(data.skills) || data.skills.length === 0) {
    errors.skills = 'Please specify at least one required skill.';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

/**
 * Validates financial transactions (e.g., escrow deposits).
 */
function validatePayment(data) {
  const errors = {};
  
  if (!data.amount || data.amount < 5) {
    errors.amount = 'Minimum payment amount is 5.';
  }
  
  if (!data.paymentMethodId) {
    errors.paymentMethodId = 'Payment method is required.';
  }

  return { isValid: Object.keys(errors).length === 0, errors };
}

/**
 * Basic sanitization for text inputs to prevent script injection.
 */
function sanitizeInput(str) {
  if (typeof str !== 'string') return '';
  // Removes common script injection vectors
  return str.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
            .replace(/[<>]/g, "");
}

module.exports = {
  validateRegistration,
  validateJobPosting,
  validatePayment,
  sanitizeInput
};