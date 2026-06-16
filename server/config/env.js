'use strict';

require('dotenv').config();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function str(key, fallback) {
  const val = process.env[key];
  if (val !== undefined && val.trim() !== '') return val.trim();
  if (fallback !== undefined) return fallback;
  missing.push(key);
  return '';
}

function int(key, fallback) {
  const val = process.env[key];
  const parsed = parseInt(val, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

const missing = [];

const config = {

  // ── Server ──────────────────────────────────────────────────────────────────
  PORT:     int('PORT', 5000),
  NODE_ENV: str('NODE_ENV', 'development'),

  get IS_PROD()  { return this.NODE_ENV === 'production'; },
  get IS_DEV()   { return this.NODE_ENV === 'development'; },
  get IS_TEST()  { return this.NODE_ENV === 'test'; },

  // ── MongoDB ─────────────────────────────────────────────────────────────────
  MONGODB_URI: str('MONGODB_URI'),           // ← fixed from MONGO_URI

  // ── JWT ─────────────────────────────────────────────────────────────────────
  JWT_SECRET:     str('JWT_SECRET'),
  JWT_EXPIRES_IN: str('JWT_EXPIRES_IN', '24h'),

  // ── Google OAuth ────────────────────────────────────────────────────────────
  GOOGLE_CLIENT_ID: str('GOOGLE_CLIENT_ID'),

  // ── Gmail / Nodemailer ──────────────────────────────────────────────────────
  GMAIL_USER:         str('GMAIL_USER', ''),
  GMAIL_APP_PASSWORD: str('GMAIL_APP_PASSWORD', ''),

  // ── Khalti ──────────────────────────────────────────────────────────────────
  KHALTI_SECRET_KEY:     str('KHALTI_SECRET_KEY', ''),
  KHALTI_WEBHOOK_SECRET: str('KHALTI_WEBHOOK_SECRET', ''),
  KHALTI_BASE_URL:       str('KHALTI_BASE_URL', 'https://a.khalti.com/api/v2'),

  // ── Stripe ──────────────────────────────────────────────────────────────────
  STRIPE_SECRET_KEY:     str('STRIPE_SECRET_KEY', ''),
  STRIPE_WEBHOOK_SECRET: str('STRIPE_WEBHOOK_SECRET', ''),

  // ── Frontend ─────────────────────────────────────────────────────────────────
  CLIENT_URL: str('CLIENT_URL', 'http://localhost:3000'),

  // ── Rate limiting ────────────────────────────────────────────────────────────
  RATE_LIMIT_WINDOW_MS:    int('RATE_LIMIT_WINDOW_MS',    15 * 60 * 1000),
  RATE_LIMIT_MAX_REQUESTS: int('RATE_LIMIT_MAX_REQUESTS', 100),
  RATE_LIMIT_AUTH_MAX:     int('RATE_LIMIT_AUTH_MAX',     10),
};

// ─── Fatal exit if required vars are absent ───────────────────────────────────
if (missing.length > 0) {
  console.error('\n╔══════════════════════════════════════════════════════╗');
  console.error('║   FATAL — Missing required environment variables      ║');
  console.error('╚══════════════════════════════════════════════════════╝');
  missing.forEach((key) => console.error(`  ✖  ${key}`));
  console.error('\n  Copy server/.env.example → server/.env and fill in the values.\n');
  process.exit(1);
}

// ─── Warn about optional but important vars ───────────────────────────────────
const optional = ['GMAIL_USER', 'GMAIL_APP_PASSWORD', 'KHALTI_SECRET_KEY', 'STRIPE_SECRET_KEY'];
const emptyOptional = optional.filter((k) => !config[k]);
if (emptyOptional.length > 0) {
  console.warn(
    `[Config] WARN — Optional vars not set (some features will be disabled): ${emptyOptional.join(', ')}`
  );
}

module.exports = config;