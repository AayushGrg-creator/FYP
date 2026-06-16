/**
 * cosineSimilarity.test.js
 * Unit tests for the vector matching engine.
 * * Strategy:
 * • Validates the core geometric calculation of similarity between two vectors.
 * • Tests for edge cases: empty vectors, orthogonal vectors, and identical vectors.
 * • Ensures the result is always normalized between [-1, 1] (or [0, 1] for positive feature sets).
 */

'use strict';

const { calculateCosineSimilarity } = require('../../utils/mathUtils');

describe('calculateCosineSimilarity()', () => {
  test('returns 1.0 for identical vectors (perfect match)', () => {
    const vecA = [1, 2, 3];
    const vecB = [1, 2, 3];
    expect(calculateCosineSimilarity(vecA, vecB)).toBeCloseTo(1.0, 10);
  });

  test('returns 0 for orthogonal vectors (no similarity)', () => {
    const vecA = [1, 0];
    const vecB = [0, 1];
    expect(calculateCosineSimilarity(vecA, vecB)).toBe(0);
  });

  test('handles inverse relationship (-1 similarity)', () => {
    const vecA = [1, 2];
    const vecB = [-1, -2];
    expect(calculateCosineSimilarity(vecA, vecB)).toBeCloseTo(-1.0, 10);
  });

  test('throws error on mismatched vector dimensions', () => {
    const vecA = [1, 2, 3];
    const vecB = [1, 2];
    expect(() => calculateCosineSimilarity(vecA, vecB)).toThrow('Vector dimension mismatch');
  });

  test('handles zero-length vector gracefully', () => {
    const vecA = [0, 0];
    const vecB = [1, 2];
    // Cosine similarity is undefined for zero vectors (division by zero)
    expect(() => calculateCosineSimilarity(vecA, vecB)).toThrow();
  });
});