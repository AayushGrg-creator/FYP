/**
 * Application Constants
 * Path: client/src/utils/constants.js
 * 
 * Central system definitions tracking permission scopes, project life cycles, 
 * and production environment gateway routing protocols.
 */

// ── User Identity Access Control Authorization Matrices ──
export const ROLES = Object.freeze({
  CLIENT: 'client',
  FREELANCER: 'freelancer',
  ADMIN: 'admin',
});

// ── Bidirectional Workflow Pipeline Status Systems ──
export const JOB_STATUS = Object.freeze({
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
});

export const PROPOSAL_STATUS = Object.freeze({
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
});

// ── Transaction & Arbitration Monitoring Vectors ──
export const MILESTONE_STATUS = Object.freeze({
  PENDING: 'pending',
  FUNDED: 'funded',
  RELEASED: 'released',
  DISPUTED: 'disputed',
});

// ── Distributed Infrastructure Network Interface Channels ──
const getEnvVariable = (key, fallback) => {
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return fallback;
};

// Global network gateways with explicit sanitization structures
export const API_BASE_URL = getEnvVariable('REACT_APP_API_URL', 'http://localhost:5000/api');
export const SOCKET_URL = getEnvVariable('REACT_APP_SOCKET_URL', 'http://localhost:5000');