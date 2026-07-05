'use strict';

const VALID_ROLES = Object.freeze(['client', 'freelancer']);
const VALID_ROLES_SET = Object.freeze(new Set(VALID_ROLES));
const DEFAULT_HTTP_STATUS = 500;

const ERROR_STATUS_MAP = Object.freeze({
  GOOGLE_TOKEN_MISSING   : 400,
  GOOGLE_TOKEN_INVALID   : 401,
  GOOGLE_PAYLOAD_INVALID : 400,
  INVALID_ROLE           : 400,
  EMAIL_TAKEN            : 409,
  USER_NOT_FOUND         : 404,
  ACCOUNT_SUSPENDED      : 403,
  FORBIDDEN              : 403,
  TOKEN_MISSING          : 401,
  TOKEN_EXPIRED          : 401,
  TOKEN_INVALID          : 401,
  REFRESH_TOKEN_MISSING  : 401,
  REFRESH_TOKEN_EXPIRED  : 401,
  REFRESH_TOKEN_INVALID  : 401,
  REFRESH_TOKEN_REUSED   : 401,
  INVALID_CREDENTIALS    : 401,
  GOOGLE_ONLY_ACCOUNT    : 400,
  RATE_LIMITED           : 429,
  INTERNAL_ERROR         : 500,
});

// ─── Gamification ─────────────────────────────────────────────────────────────
const LEVEL_THRESHOLDS = Object.freeze([0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 11000, 15000]);

const POINT_VALUES = Object.freeze({
  PROJECT_COMPLETED  : 100,
  MILESTONE_APPROVED : 25,
  FIVE_STAR_REVIEW    : 30,
  REVIEW_LEFT         : 10,
  PROFILE_COMPLETED   : 20,
});

module.exports = {
  VALID_ROLES,
  VALID_ROLES_SET,
  ERROR_STATUS_MAP,
  DEFAULT_HTTP_STATUS,
  LEVEL_THRESHOLDS,
  POINT_VALUES,
};