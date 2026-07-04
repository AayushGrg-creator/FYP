/**
 * utils/validate.js
 * Centralized request validation schema & helper functions.
 * * Strategy:
 * • Provides declarative validation for registration, job posting, and financial transactions.
 * • Standardizes the error response object for consistent API output.
 * • Includes basic sanitization to mitigate XSS and injection risks.
 */

'use strict';

const JOB_CATEGORIES = [
  'web_development',
  'mobile_development',
  'graphic_design',
  'content_writing',
  'digital_marketing',
  'video_editing',
  'data_science',
  'ui_ux_design',
  'seo',
  'other',
];

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
 * Validates new job postings / edits against the real Job.js schema fields
 * (title, description, category, budgetType, budgetAmount, skillsRequired).
 *
 * Calling convention matches job.controller.js's createJob/updateJob usage:
 *   const validationError = validateJobFields(req.body);
 *   if (validationError) return fail(res, validationError);
 *
 * Returns a single human-readable error string on the first failure found,
 * or null when the payload is valid.
 */
function validateJobFields(data = {}) {
  if (!data.title || data.title.trim().length < 5) {
    return 'Job title must be at least 5 characters.';
  }

  if (!data.description || data.description.trim().length < 20) {
    return 'Job description must be at least 20 characters.';
  }

  if (!data.category || !JOB_CATEGORIES.includes(data.category)) {
    return `Category must be one of: ${JOB_CATEGORIES.join(', ')}.`;
  }

  if (!['fixed', 'hourly'].includes(data.budgetType)) {
    return 'Budget type must be "fixed" or "hourly".';
  }

  if (
    data.budgetAmount === undefined ||
    data.budgetAmount === null ||
    typeof data.budgetAmount !== 'number' ||
    Number.isNaN(data.budgetAmount) ||
    data.budgetAmount <= 0
  ) {
    return 'A valid positive budget amount is required.';
  }

  if (
    !Array.isArray(data.skillsRequired) ||
    data.skillsRequired.length === 0 ||
    data.skillsRequired.length > 15
  ) {
    return 'Please specify between 1 and 15 required skills.';
  }

  if (
    data.deliveryTimeframe !== undefined &&
    data.deliveryTimeframe !== null &&
    (typeof data.deliveryTimeframe !== 'number' || data.deliveryTimeframe < 1)
  ) {
    return 'Delivery timeframe must be at least 1 day.';
  }

  return null;
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
  validateJobFields,
  validatePayment,
  sanitizeInput
};