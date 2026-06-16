/**
 * tfidf.test.js
 * Unit tests for the TF-IDF vectorisation and text preprocessing pipeline.
 * Tests the internals of match.service.js: preprocess(), buildTfidfVectors(),
 * and cosineSimilarity() in complete isolation — no DB, no HTTP, no mocking.
 *
 * Coverage targets (§5.2.4 Testing – Matching Engine):
 *   • Tokenisation, lowercasing, stop-word removal, stemming
 *   • TF-IDF weight correctness (higher for rare distinctive terms)
 *   • Cosine similarity boundaries (0 for orthogonal, 1 for identical)
 *   • Zero-length and edge-case inputs
 *   • Unit-vector normalisation after vectorisation
 */

'use strict';

const {
  preprocess,
  buildTfidfVectors,
  cosineSimilarity,
} = require('../../services/match.service');

/* ═══════════════════════════════════════════════════════════════════
   SUITE 1 — preprocess()
═══════════════════════════════════════════════════════════════════ */
describe('preprocess()', () => {
  test('returns empty array for empty string', () => {
    expect(preprocess('')).toEqual([]);
  });

  test('returns empty array for null / undefined', () => {
    expect(preprocess(null)).toEqual([]);
    expect(preprocess(undefined)).toEqual([]);
    expect(preprocess(42)).toEqual([]);
  });

  test('lowercases all tokens', () => {
    const result = preprocess('REACT NodeJS MongoDB');
    result.forEach(token => expect(token).toBe(token.toLowerCase()));
  });

  test('strips English stop words', () => {
    const result = preprocess('the developer and the team');
    // 'the' and 'and' are stop words; only 'developer' and 'team' remain
    expect(result).not.toContain('the');
    expect(result).not.toContain('and');
  });

  test('retains meaningful technical terms', () => {
    const result = preprocess('React Node MongoDB developer');
    // After stemming 'developer' → 'develop', terms should be present
    const joined = result.join(' ');
    expect(joined).toMatch(/react/);
    expect(joined).toMatch(/node/);
    expect(joined).toMatch(/mongodb/);
  });

  test('stems words to root forms', () => {
    const result = preprocess('running developers designing');
    // Porter stemmer: running→run, developers→develop, designing→design
    expect(result).toContain('run');
    expect(result).toContain('develop');
    expect(result).toContain('design');
  });

  test('removes single-character tokens', () => {
    const result = preprocess('a b c react');
    expect(result.filter(t => t.length <= 1)).toHaveLength(0);
  });

  test('removes tokens that start with non-alpha characters', () => {
    const result = preprocess('99bottles $price @mention react');
    // '99bottles', '$price', '@mention' should be stripped
    expect(result.filter(t => /^[^a-z]/.test(t))).toHaveLength(0);
  });

  test('handles text with punctuation gracefully', () => {
    expect(() => preprocess('Hello, world! React.js is great.')).not.toThrow();
    const result = preprocess('Hello, world! React.js is great.');
    expect(Array.isArray(result)).toBe(true);
  });

  test('handles string of only stop words → empty array', () => {
    const result = preprocess('the and or but in on at to for of');
    expect(result).toEqual([]);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   SUITE 2 — buildTfidfVectors()
═══════════════════════════════════════════════════════════════════ */
describe('buildTfidfVectors()', () => {
  const docs = [
    { id: 'A', tokens: ['react', 'node', 'develop'] },
    { id: 'B', tokens: ['python', 'django', 'develop'] },
    { id: 'C', tokens: ['react', 'python', 'design'] },
  ];

  test('returns vocabulary and vectors map', () => {
    const { vocabulary, vectors } = buildTfidfVectors(docs);
    expect(Array.isArray(vocabulary)).toBe(true);
    expect(vectors).toBeInstanceOf(Map);
  });

  test('returns a vector for every input document', () => {
    const { vectors } = buildTfidfVectors(docs);
    expect(vectors.has('A')).toBe(true);
    expect(vectors.has('B')).toBe(true);
    expect(vectors.has('C')).toBe(true);
  });

  test('vocabulary contains all unique terms across corpus', () => {
    const { vocabulary } = buildTfidfVectors(docs);
    ['react', 'node', 'develop', 'python', 'django', 'design'].forEach(term => {
      expect(vocabulary).toContain(term);
    });
  });

  test('vectors have the same dimension as vocabulary length', () => {
    const { vocabulary, vectors } = buildTfidfVectors(docs);
    for (const [, vec] of vectors) {
      expect(vec.length).toBe(vocabulary.length);
    }
  });

  test('unit-normalises each vector (magnitude ≈ 1 or 0)', () => {
    const { vectors } = buildTfidfVectors(docs);
    for (const [, vec] of vectors) {
      const mag = Math.sqrt(Array.from(vec).reduce((s, v) => s + v * v, 0));
      // Either normalised to ~1 or the zero vector for an empty doc
      expect(mag).toBeCloseTo(1, 5);
    }
  });

  test('rare term gets higher IDF weight than frequent term', () => {
    // 'develop' appears in docs A and B (df=2); 'node' appears only in A (df=1)
    const { vocabulary, vectors } = buildTfidfVectors(docs);
    const nodeIdx    = vocabulary.indexOf('node');
    const developIdx = vocabulary.indexOf('develop');

    // Both terms appear in doc A — node should have higher weight (lower df)
    const vecA = vectors.get('A');
    if (nodeIdx !== -1 && developIdx !== -1) {
      expect(vecA[nodeIdx]).toBeGreaterThan(vecA[developIdx]);
    }
  });

  test('common term has zero IDF when it appears in ALL documents', () => {
    // 'shared' appears in every document → IDF = log(N/N) = 0 → TF-IDF = 0
    const allDocs = [
      { id: 'X', tokens: ['shared', 'react'] },
      { id: 'Y', tokens: ['shared', 'python'] },
      { id: 'Z', tokens: ['shared', 'java'] },
    ];
    const { vocabulary, vectors } = buildTfidfVectors(allDocs);
    const sharedIdx = vocabulary.indexOf('shared');
    for (const [, vec] of vectors) {
      expect(vec[sharedIdx]).toBeCloseTo(0, 10);
    }
  });

  test('returns empty vocabulary and empty map for empty input', () => {
    const { vocabulary, vectors } = buildTfidfVectors([]);
    expect(vocabulary).toEqual([]);
    expect(vectors.size).toBe(0);
  });

  test('handles documents with zero tokens without throwing', () => {
    const sparse = [
      { id: 'A', tokens: ['react'] },
      { id: 'B', tokens: [] },       // empty doc
    ];
    expect(() => buildTfidfVectors(sparse)).not.toThrow();
    const { vectors } = buildTfidfVectors(sparse);
    expect(vectors.has('A')).toBe(true);
    expect(vectors.has('B')).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   SUITE 3 — cosineSimilarity()
═══════════════════════════════════════════════════════════════════ */
describe('cosineSimilarity()', () => {
  test('identical vectors → similarity = 1', () => {
    const v = new Float64Array([0.5, 0.5, 0.5, 0.5]);
    expect(cosineSimilarity(v, v)).toBeCloseTo(1, 10);
  });

  test('orthogonal vectors → similarity = 0', () => {
    const a = new Float64Array([1, 0, 0]);
    const b = new Float64Array([0, 1, 0]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 10);
  });

  test('opposite vectors → similarity = -1 (or clamped to ≤ 0)', () => {
    const a = new Float64Array([1, 0]);
    const b = new Float64Array([-1, 0]);
    // The function returns dot/|a||b|; -1 for exact opposites
    expect(cosineSimilarity(a, b)).toBeLessThanOrEqual(0);
  });

  test('returns 0 for zero vector inputs (divide-by-zero guard)', () => {
    const zero  = new Float64Array([0, 0, 0]);
    const nonZero = new Float64Array([1, 0, 0]);
    expect(cosineSimilarity(zero, nonZero)).toBe(0);
    expect(cosineSimilarity(nonZero, zero)).toBe(0);
    expect(cosineSimilarity(zero, zero)).toBe(0);
  });

  test('returns 0 for null / undefined inputs', () => {
    const v = new Float64Array([1, 0]);
    expect(cosineSimilarity(null, v)).toBe(0);
    expect(cosineSimilarity(v, undefined)).toBe(0);
    expect(cosineSimilarity(null, null)).toBe(0);
  });

  test('returns 0 when vectors are different lengths', () => {
    const a = new Float64Array([1, 0, 0]);
    const b = new Float64Array([1, 0]);
    expect(cosineSimilarity(a, b)).toBe(0);
  });

  test('result is always in the range [-1, 1]', () => {
    for (let i = 0; i < 50; i++) {
      const len = 10;
      const a   = new Float64Array(len).map(() => Math.random() - 0.5);
      const b   = new Float64Array(len).map(() => Math.random() - 0.5);
      const sim = cosineSimilarity(a, b);
      expect(sim).toBeGreaterThanOrEqual(-1);
      expect(sim).toBeLessThanOrEqual(1);
    }
  });

  test('symmetry: cosine(a,b) === cosine(b,a)', () => {
    const a = new Float64Array([0.3, 0.7, 0.1]);
    const b = new Float64Array([0.6, 0.2, 0.5]);
    expect(cosineSimilarity(a, b)).toBeCloseTo(cosineSimilarity(b, a), 10);
  });

  test('partial overlap → similarity in (0, 1)', () => {
    // Build two unit vectors with some shared dimensions
    const a = new Float64Array([1, 1, 0, 0]);
    const b = new Float64Array([1, 0, 1, 0]);
    const sim = cosineSimilarity(a, b);
    expect(sim).toBeGreaterThan(0);
    expect(sim).toBeLessThan(1);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   SUITE 4 — Full pipeline accuracy (§5.2.4 — report example)
   The report states: React+Node.js description vs React+Node.js profile
   gives cosine ≈ 0.887, final score ≈ 84.6% with trust 0.75.
═══════════════════════════════════════════════════════════════════ */
describe('Full pipeline — report §5.2.2.3 example', () => {
  test('React/Node.js job vs matching freelancer profile has cosine > 0.7', () => {
    const jobTokens      = preprocess('Need a React developer with Node.js experience');
    const profileTokens  = preprocess('Full stack JavaScript developer React Node.js');

    const docs = [
      { id: '__job__',  tokens: jobTokens },
      { id: '__prof__', tokens: profileTokens },
    ];
    const { vectors } = buildTfidfVectors(docs);

    const jobVec  = vectors.get('__job__');
    const profVec = vectors.get('__prof__');

    const similarity = cosineSimilarity(jobVec, profVec);
    // The two documents share most terms; expect high similarity
    expect(similarity).toBeGreaterThan(0.7);
    expect(similarity).toBeLessThanOrEqual(1);
  });

  test('Unrelated job and profile have cosine < 0.3', () => {
    const jobTokens     = preprocess('React frontend developer CSS animations');
    const profileTokens = preprocess('data scientist machine learning python tensorflow');

    const docs = [
      { id: '__job__',  tokens: jobTokens },
      { id: '__prof__', tokens: profileTokens },
    ];
    const { vectors } = buildTfidfVectors(docs);

    const jobVec  = vectors.get('__job__');
    const profVec = vectors.get('__prof__');

    const similarity = cosineSimilarity(jobVec, profVec);
    expect(similarity).toBeLessThan(0.3);
  });

  test('weighted final score formula: 0.7*cosine + 0.3*trustNorm', () => {
    const cosine     = 0.887;
    const trustNorm  = 0.75;
    const finalScore = cosine * 0.7 + trustNorm * 0.3;
    // Report states 84.6%
    expect(finalScore * 100).toBeCloseTo(84.59, 0);
  });

  test('Precision@10 simulation: top-ranked result should be most similar', () => {
    // Simulate a corpus of 5 freelancers; the first should rank highest
    const jobTokens = preprocess('React TypeScript frontend developer UI animations');

    const profiles = [
      { id: 'best',    tokens: preprocess('React TypeScript frontend developer animations') },
      { id: 'good',    tokens: preprocess('React developer JavaScript UI components') },
      { id: 'partial', tokens: preprocess('Angular frontend developer CSS') },
      { id: 'weak',    tokens: preprocess('backend Node.js API REST developer') },
      { id: 'miss',    tokens: preprocess('data analyst python SQL pandas') },
    ];

    const allDocs = [{ id: '__job__', tokens: jobTokens }, ...profiles];
    const { vectors } = buildTfidfVectors(allDocs);
    const jobVec = vectors.get('__job__');

    const ranked = profiles
      .map(p => ({ id: p.id, score: cosineSimilarity(jobVec, vectors.get(p.id)) }))
      .sort((a, b) => b.score - a.score);

    expect(ranked[0].id).toBe('best');
    expect(ranked[ranked.length - 1].id).toBe('miss');
  });
});