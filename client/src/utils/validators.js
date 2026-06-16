/**
 * TaskTide Validation Utility Service
 * Path: client/src/utils/validationUtils.js
 * * Standardizes input validation logic across the marketplace.
 */

// Uses RFC 5322 compliant logic
export const validateEmail = (email) => {
  if (!email) return false;
  const re = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return re.test(String(email).toLowerCase());
};

// Enforces minimum length, digits, and special character requirements
export const validatePassword = (password) => {
  const minLength = 8;
  const hasDigit = /\d/.test(password);
  const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return password.length >= minLength && hasDigit && hasSpecial;
};

// Cleans non-numeric noise before validation
export const validatePhone = (phone) => {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-\+\(\)]/g, '');
  return /^\d{10,15}$/.test(cleaned);
};