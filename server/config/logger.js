'use strict';

/**
 * server/src/config/logger.js
 *
 * Lightweight, zero-dependency terminal logger for Task Tide.
 *
 * Features
 * ─────────
 *  • Four severity tiers  :  DEBUG | INFO | WARN | ERROR
 *  • Full ANSI colour     :  each tier has its own foreground + label colour
 *  • ISO-8601 timestamp   :  every line is prefixed with the current time
 *  • Context tagging      :  logger.info('[DB]', 'Connected') → "[DB] Connected"
 *  • Stack trace capture  :  logger.error() accepts an optional Error object and
 *                            prints its stack in development / test environments
 *  • Env-aware level gate :  DEBUG lines are silenced in production
 *  • Singleton export     :  one shared instance across the whole codebase
 *
 * Usage
 * ─────
 *   const logger = require('./config/logger');
 *
 *   logger.debug('[Match]', 'TF-IDF index rebuilt — 432 profiles vectorised');
 *   logger.info ('[Server]', `Listening on port ${PORT}`);
 *   logger.warn ('[Auth]',   'JWT_SECRET is shorter than recommended 64 chars');
 *   logger.error('[DB]',     'Connection failed', err);   // err.stack printed in dev
 */

const config = require('./env');

// ─── ANSI colour helpers ──────────────────────────────────────────────────────
const RESET  = '\x1b[0m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';

const FG = {
  grey:    '\x1b[90m',
  cyan:    '\x1b[36m',
  green:   '\x1b[32m',
  yellow:  '\x1b[33m',
  red:     '\x1b[31m',
  magenta: '\x1b[35m',
  white:   '\x1b[37m',
};

// ─── Severity tier definitions ────────────────────────────────────────────────
const TIERS = {
  DEBUG: { rank: 0, label: 'DEBUG', labelColour: FG.magenta, msgColour: FG.grey   },
  INFO:  { rank: 1, label: 'INFO ', labelColour: FG.cyan,    msgColour: FG.white  },
  WARN:  { rank: 2, label: 'WARN ', labelColour: FG.yellow,  msgColour: FG.yellow },
  ERROR: { rank: 3, label: 'ERROR', labelColour: FG.red,     msgColour: FG.red    },
};

// In production suppress DEBUG; in test suppress DEBUG+INFO (keep WARN+ERROR)
const MIN_RANK = config.IS_PROD ? 1 : config.IS_TEST ? 2 : 0;

// ─── Core formatter ──────────────────────────────────────────────────────────

/**
 * Build one formatted log line.
 *
 * Anatomy of a line:
 *   2025-11-03T08:42:01.337Z  [INFO ]  [Server] Listening on port 5000
 *   ────────────────────────  ───────  ────────────────────────────────
 *       timestamp (dim)        tier        context + message (coloured)
 *
 * @param {string} tierKey   - 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'
 * @param {string} context   - e.g. '[DB]', '[Auth]'
 * @param {string} message   - human-readable message
 * @param {Error}  [error]   - optional Error whose .stack is appended in dev
 */
function format(tierKey, context, message, error) {
  const tier      = TIERS[tierKey];
  const timestamp = `${DIM}${new Date().toISOString()}${RESET}`;
  const label     = `${BOLD}${tier.labelColour}[${tier.label}]${RESET}`;
  const body      = `${tier.msgColour}${context ? context + ' ' : ''}${message}${RESET}`;

  let line = `${timestamp}  ${label}  ${body}`;

  // Append stack trace in non-production environments
  if (error instanceof Error && !config.IS_PROD) {
    const stack = error.stack
      .split('\n')
      .map((l) => `    ${FG.grey}${l}${RESET}`)
      .join('\n');
    line += `\n${stack}`;
  }

  return line;
}

// ─── Logger object ────────────────────────────────────────────────────────────
const logger = {

  /**
   * Log at DEBUG level.
   * Silenced in production. Use for verbose internal state during development.
   * @param {string}  context  - e.g. '[Match]'
   * @param {string}  message
   */
  debug(context, message) {
    if (TIERS.DEBUG.rank < MIN_RANK) return;
    process.stdout.write(format('DEBUG', context, message) + '\n');
  },

  /**
   * Log at INFO level.
   * Use for normal lifecycle events: server start, DB connected, request served.
   * @param {string}  context
   * @param {string}  message
   */
  info(context, message) {
    if (TIERS.INFO.rank < MIN_RANK) return;
    process.stdout.write(format('INFO', context, message) + '\n');
  },

  /**
   * Log at WARN level.
   * Use for non-fatal issues: missing optional config, slow query, retry attempt.
   * @param {string}  context
   * @param {string}  message
   * @param {Error}   [error]
   */
  warn(context, message, error) {
    if (TIERS.WARN.rank < MIN_RANK) return;
    process.stderr.write(format('WARN', context, message, error) + '\n');
  },

  /**
   * Log at ERROR level.
   * Use for failures that need immediate attention.
   * In development the full stack trace is printed.
   * In production only the message is shown (no trace leakage).
   * @param {string}  context
   * @param {string}  message
   * @param {Error}   [error]
   */
  error(context, message, error) {
    process.stderr.write(format('ERROR', context, message, error) + '\n');
  },

  // ── Convenience banner ─────────────────────────────────────────────────────

  /**
   * Print a separator banner — useful to visually mark server start in logs.
   * @param {string} text
   */
  banner(text) {
    const line = '═'.repeat(54);
    process.stdout.write(
      `\n${BOLD}${FG.cyan}╔${line}╗\n║  ${text.padEnd(52)}║\n╚${line}╝${RESET}\n\n`
    );
  },
};

module.exports = logger;