/**
 * jest.config.js
 * TaskTide – server-side Jest configuration
 *
 * Execution layers:
 *   unit        → pure logic, no I/O  (fast, parallelised)
 *   integration → HTTP + real MongoDB via MongoMemoryServer
 *   e2e         → full browser flows  (Playwright, separate script)
 *
 * Run targets:
 *   npm test               → unit + integration
 *   npm run test:unit      → unit only
 *   npm run test:int       → integration only
 *   npm run test:coverage  → full report
 */

'use strict';

const path = require('path');

/** @type {import('jest').Config} */
const config = {
  // ── Runtime ──────────────────────────────────────────────────────────
  testEnvironment: 'node',
  rootDir: path.resolve(__dirname),       // server/ directory root

  // ── Discovery ────────────────────────────────────────────────────────
  testMatch: [
    '<rootDir>/tests/unit/**/*.test.js',
    '<rootDir>/tests/integration/**/*.test.js',
  ],

  // Ignore compiled output and e2e specs (run separately)
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/tests/e2e/',
    '<rootDir>/dist/',
  ],

  // ── Transform ────────────────────────────────────────────────────────
  // Pure CJS – no transform needed. If you add ESM or TypeScript later,
  // swap in babel-jest / ts-jest here.
  transform: {},

  // ── Module aliases (mirrors tsconfig paths if you add TS later) ──────
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },

  // ── Setup files ──────────────────────────────────────────────────────
  // jest.setup.js runs ONCE per worker process after the test framework
  // is installed. Use it for DB lifecycle, global mocks, etc.
  setupFilesAfterFramework: [],          // placeholder for framework-level mocks
  globalSetup:    '<rootDir>/jest.setup.js',   // before all workers
  globalTeardown: '<rootDir>/jest.teardown.js',// after  all workers

  // Per-file setup (runs inside the worker, has access to jest globals)
  setupFilesAfterFramework: ['<rootDir>/jest.setup.js'],

  // ── Coverage ─────────────────────────────────────────────────────────
  collectCoverageFrom: [
    'controllers/**/*.js',
    'services/**/*.js',
    'models/**/*.js',
    'ai/**/*.js',
    'helpers/**/*.js',
    'middleware/**/*.js',
    'utils/**/*.js',
    '!**/node_modules/**',
    '!**/__mocks__/**',
  ],
  coverageDirectory: '<rootDir>/coverage',
  coverageReporters: ['text', 'lcov', 'html', 'json-summary'],
  coverageThresholds: {
    global: {
      branches:   70,
      functions:  75,
      lines:      78,
      statements: 78,
    },
  },

  // ── Execution ─────────────────────────────────────────────────────────
  // Unit tests are parallelised; integration tests share one MongoMemory
  // instance so we limit workers to 1 for the integration suite.
  // The CI workflow passes --runInBand for integration via npm script.
  maxWorkers: '50%',
  testTimeout: 30_000,          // 30 s – generous for cold MongoMemoryServer start

  // ── Reporters ────────────────────────────────────────────────────────
  reporters: [
    'default',
    // JUnit XML consumed by GitHub Actions test summary
    [
      'jest-junit',
      {
        outputDirectory: '<rootDir>/test-results',
        outputName:      'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate:    '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true,
      },
    ],
  ],

  // ── Miscellaneous ────────────────────────────────────────────────────
  // Restore all mocks automatically between tests
  restoreMocks:  true,
  clearMocks:    true,
  resetModules:  false,         // keep module registry across tests in a file

  // Display individual test names in CI log
  verbose: true,

  // Prevent tests leaking open handles (DB connections, timers)
  detectOpenHandles: true,
  forceExit: true,

  // ── Project split (allows `jest --project unit`) ──────────────────────
  projects: [
    {
      displayName: 'unit',
      testMatch:   ['<rootDir>/tests/unit/**/*.test.js'],
      // Unit tests must NEVER touch real I/O – enforce with automock for
      // mongoose models at the module level inside each test file.
    },
    {
      displayName:  'integration',
      testMatch:    ['<rootDir>/tests/integration/**/*.test.js'],
      // Integration tests spin up MongoMemoryServer via jest.setup.js
      // and run serially to avoid port conflicts.
      testRunner:   'jest-circus/runner',
      maxWorkers:   1,
    },
  ],
};

module.exports = config;