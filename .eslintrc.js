/**
 * .eslintrc.js
 * ESLint configuration for Task Tide.
 * * Strategy:
 * • Enforces consistent coding styles across the backend.
 * • Disables 'no-console' for development, but flags it for potential production linting.
 * • Integrates with Prettier for automated formatting.
 */

module.exports = {
  env: {
    node: true,
    commonjs: true,
    es2021: true,
    jest: true,
  },
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  parserOptions: {
    ecmaVersion: 12,
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'warn' : 'off',
    'no-unused-vars': ['error', { argsIgnorePattern: 'next' }],
    'prefer-const': 'error',
    'eqeqeq': 'error',
    'curly': 'error',
  },
};