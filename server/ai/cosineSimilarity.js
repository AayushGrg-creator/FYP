'use strict';

/**
 * ─────────────────────────────────────────────────────────────────
 *  COSINE SIMILARITY ENGINE  — Task Tide Smart-Matching
 *  Pure JavaScript math; zero external dependencies.
 *
 *  Exposed API
 *  ───────────
 *  cosineSimilarity(vecA, vecB)          → raw score  0..1
 *  cosineSimilarityPct(vecA, vecB)       → percentage 0..100
 *  dotProduct(vecA, vecB)                → scalar
 *  magnitude(vec)                        → scalar
 *  cosineSparseObjs(objA, objB)          → raw score  0..1
 *  rankFreelancers(jobVec, profiles)     → sorted array
 *  weightedFinalScore(cosine, trust)     → 0..100  (report formula)
 * ─────────────────────────────────────────────────────────────────
 */

/* ─── 1. PRIMITIVE VECTOR OPERATIONS ────────────────────────────── */

/**
 * Dot product of two equal-length numeric arrays.
 * ∑ (Aᵢ × Bᵢ)
 *
 * @param  {number[]} vecA
 * @param  {number[]} vecB
 * @returns {number}
 * @throws  {RangeError} if arrays differ in length
 */
function dotProduct(vecA, vecB) {
  if (vecA.length !== vecB.length) {
    throw new RangeError(
      `dotProduct: vector length mismatch — ${vecA.length} vs ${vecB.length}`
    );
  }

  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    sum += vecA[i] * vecB[i];
  }
  return sum;
}

/**
 * Euclidean magnitude (L2 norm) of a numeric array.
 * √∑ (Aᵢ²)
 *
 * @param  {number[]} vec
 * @returns {number}
 */
function magnitude(vec) {
  let sumOfSquares = 0;
  for (let i = 0; i < vec.length; i++) {
    sumOfSquares += vec[i] * vec[i];
  }
  return Math.sqrt(sumOfSquares);
}

/* ─── 2. CORE COSINE SIMILARITY (DENSE ARRAYS) ──────────────────── */

/**
 * Cosine similarity between two dense numeric arrays.
 *
 * cos(θ) = (A · B) / (|A| × |B|)
 *
 * Returns a value in [0, 1]:
 *   0  → completely orthogonal (no shared signal)
 *   1  → identical direction   (perfect match)
 *
 * Edge cases:
 *   • Either vector is all-zeros → returns 0 (undefined angle)
 *   • Single-element vectors     → handled correctly
 *
 * @param  {number[]} vecA  — job TF-IDF vector
 * @param  {number[]} vecB  — freelancer TF-IDF vector
 * @returns {number}  score ∈ [0, 1]
 */
function cosineSimilarity(vecA, vecB) {
  if (!Array.isArray(vecA) || !Array.isArray(vecB)) {
    throw new TypeError('cosineSimilarity: both arguments must be arrays');
  }
  if (vecA.length !== vecB.length) {
    throw new RangeError(
      `cosineSimilarity: length mismatch — ${vecA.length} vs ${vecB.length}`
    );
  }
  if (vecA.length === 0) return 0;

  const magA = magnitude(vecA);
  const magB = magnitude(vecB);

  // Guard against zero-magnitude vectors (all weights are 0)
  if (magA === 0 || magB === 0) return 0;

  const dot   = dotProduct(vecA, vecB);
  const score = dot / (magA * magB);

  // Clamp to [0, 1] to correct for floating-point rounding errors
  return Math.min(1, Math.max(0, score));
}

/**
 * Cosine similarity expressed as a percentage.
 * Rounds to two decimal places.
 *
 * @param  {number[]} vecA
 * @param  {number[]} vecB
 * @returns {number}  score ∈ [0, 100]
 */
function cosineSimilarityPct(vecA, vecB) {
  return Math.round(cosineSimilarity(vecA, vecB) * 10000) / 100;
}

/* ─── 3. SPARSE OBJECT SIMILARITY ───────────────────────────────── */

/**
 * Cosine similarity for sparse term-weight maps.
 *
 * Accepts plain objects of the form { term: weight, … }.
 * Builds the union vocabulary internally so the caller never
 * has to align vectors manually.
 *
 * @param  {Object.<string,number>} objA
 * @param  {Object.<string,number>} objB
 * @returns {number}  score ∈ [0, 1]
 *
 * @example
 *   cosineSparseObjs({ react:0.8, node:0.5 }, { react:0.9, css:0.3 })
 *   // → ~0.847
 */
function cosineSparseObjs(objA, objB) {
  if (typeof objA !== 'object' || typeof objB !== 'object') {
    throw new TypeError('cosineSparseObjs: both arguments must be plain objects');
  }

  // Build union of all keys
  const vocab = new Set([...Object.keys(objA), ...Object.keys(objB)]);

  let dot    = 0;
  let magSqA = 0;
  let magSqB = 0;

  for (const term of vocab) {
    const a = objA[term] || 0;
    const b = objB[term] || 0;
    dot    += a * b;
    magSqA += a * a;
    magSqB += b * b;
  }

  const denom = Math.sqrt(magSqA) * Math.sqrt(magSqB);
  if (denom === 0) return 0;

  return Math.min(1, Math.max(0, dot / denom));
}

/* ─── 4. WEIGHTED FINAL SCORE (REPORT FORMULA §5.2.2.3) ─────────── */

/**
 * Compute the weighted final matching score used in Task Tide.
 *
 *   Final Score = (cosine × 0.7) + (normalisedTrust × 0.3)
 *
 * where normalisedTrust = trustScore / 100  (trustScore is 0–100)
 *
 * Returns a value in [0, 100] rounded to two decimal places.
 *
 * @param  {number} cosineScore   — raw cosine value  ∈ [0, 1]
 * @param  {number} trustScore    — platform score    ∈ [0, 100]
 * @returns {number}  finalScore  ∈ [0, 100]
 *
 * @example
 *   // Report example: cosine=0.887, trust=75
 *   weightedFinalScore(0.887, 75)  // → 84.59
 */
function weightedFinalScore(cosineScore, trustScore) {
  if (typeof cosineScore !== 'number' || typeof trustScore !== 'number') {
    throw new TypeError('weightedFinalScore: both arguments must be numbers');
  }

  const normTrust = Math.min(1, Math.max(0, trustScore / 100));
  const clampedC  = Math.min(1, Math.max(0, cosineScore));
  const raw       = clampedC * 0.7 + normTrust * 0.3;

  return Math.round(raw * 10000) / 100; // percentage, 2 d.p.
}

/* ─── 5. RANK FREELANCERS ────────────────────────────────────────── */

/**
 * Rank an array of freelancer profile objects against a single
 * job vector and return the top-N matches sorted descending.
 *
 * Each profile in `profiles` must carry:
 *   profile.tfidfVector  {number[]}  — aligned to the same vocabulary as jobVector
 *   profile.trustScore   {number}    — platform trust score 0–100
 *   profile._id          {*}         — any identifier
 *   (any other fields are passed through untouched)
 *
 * @param  {number[]}  jobVector   — TF-IDF vector for the job posting
 * @param  {Object[]}  profiles    — array of freelancer profile objects
 * @param  {number}    [topN=10]   — how many results to return
 * @returns {RankedResult[]}
 *
 * @typedef  {Object} RankedResult
 * @property {*}      _id
 * @property {number} cosineScore    0..1
 * @property {number} cosinePct      0..100
 * @property {number} trustScore     0..100
 * @property {number} finalScore     0..100  (weighted formula)
 * @property {number} rank           1-based position
 * @property {Object} profile        original profile object
 */
function rankFreelancers(jobVector, profiles, topN = 10) {
  if (!Array.isArray(jobVector) || jobVector.length === 0) {
    throw new TypeError('rankFreelancers: jobVector must be a non-empty array');
  }
  if (!Array.isArray(profiles)) {
    throw new TypeError('rankFreelancers: profiles must be an array');
  }

  const scored = [];

  for (const profile of profiles) {
    // Skip profiles without an aligned TF-IDF vector
    if (
      !profile.tfidfVector ||
      !Array.isArray(profile.tfidfVector) ||
      profile.tfidfVector.length !== jobVector.length
    ) {
      continue;
    }

    const trust      = typeof profile.trustScore === 'number' ? profile.trustScore : 0;
    const cosine     = cosineSimilarity(jobVector, profile.tfidfVector);
    const final      = weightedFinalScore(cosine, trust);

    scored.push({
      _id:         profile._id,
      cosineScore: Math.round(cosine * 10000) / 10000,  // 4 d.p.
      cosinePct:   Math.round(cosine * 10000) / 100,    // 2 d.p.
      trustScore:  trust,
      finalScore:  final,
      rank:        0,          // filled below after sort
      profile,
    });
  }

  // Sort descending by finalScore; break ties by trustScore
  scored.sort((a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    return b.trustScore - a.trustScore;
  });

  // Assign 1-based rank and slice
  const top = scored.slice(0, topN);
  top.forEach((r, idx) => { r.rank = idx + 1; });

  return top;
}

/* ─── 6. BATCH COSINE MATRIX ─────────────────────────────────────── */

/**
 * Compute cosine similarity between one query vector and many
 * document vectors in a single pass.
 *
 * Useful when the TF-IDF engine exposes its raw matrix as a
 * Float64Array buffer for performance.
 *
 * @param  {number[]}   queryVec    — the job TF-IDF vector
 * @param  {number[][]} docMatrix   — rows = documents, cols = terms
 * @returns {number[]}  array of raw cosine scores, one per document
 */
function batchCosine(queryVec, docMatrix) {
  if (!Array.isArray(queryVec) || !Array.isArray(docMatrix)) {
    throw new TypeError('batchCosine: both arguments must be arrays');
  }

  const magQ = magnitude(queryVec);
  if (magQ === 0) return docMatrix.map(() => 0);

  return docMatrix.map((docVec) => {
    if (!Array.isArray(docVec) || docVec.length !== queryVec.length) return 0;

    const magD = magnitude(docVec);
    if (magD === 0) return 0;

    let dot = 0;
    for (let i = 0; i < queryVec.length; i++) {
      dot += queryVec[i] * docVec[i];
    }

    return Math.min(1, Math.max(0, dot / (magQ * magD)));
  });
}

/* ─── 7. DIAGNOSTIC / DEBUG HELPERS ─────────────────────────────── */

/**
 * Return a human-readable label for a cosine score.
 *
 * @param  {number} score   ∈ [0, 1]
 * @returns {string}
 */
function matchLabel(score) {
  if (score >= 0.85) return 'Excellent match';
  if (score >= 0.70) return 'Strong match';
  if (score >= 0.55) return 'Good match';
  if (score >= 0.40) return 'Partial match';
  if (score >= 0.20) return 'Weak match';
  return 'Poor match';
}

/**
 * Explain which shared terms drove the similarity score.
 * Returns the top-K overlapping terms sorted by combined weight.
 *
 * @param  {Object.<string,number>} sparseA  — job term weights
 * @param  {Object.<string,number>} sparseB  — freelancer term weights
 * @param  {number} [k=5]                    — how many terms to return
 * @returns {{ term: string, weightA: number, weightB: number, contribution: number }[]}
 */
function explainMatch(sparseA, sparseB, k = 5) {
  const sharedTerms = Object.keys(sparseA).filter((t) => sparseB[t] !== undefined);

  const contributions = sharedTerms.map((term) => ({
    term,
    weightA:      Math.round(sparseA[term] * 10000) / 10000,
    weightB:      Math.round(sparseB[term] * 10000) / 10000,
    contribution: Math.round(sparseA[term] * sparseB[term] * 10000) / 10000,
  }));

  contributions.sort((a, b) => b.contribution - a.contribution);
  return contributions.slice(0, k);
}

/* ─── EXPORTS ────────────────────────────────────────────────────── */

module.exports = {
  // Core math
  dotProduct,
  magnitude,

  // Similarity functions
  cosineSimilarity,
  cosineSimilarityPct,
  cosineSparseObjs,

  // Weighted score (Task Tide formula)
  weightedFinalScore,

  // Ranking
  rankFreelancers,
  batchCosine,

  // Helpers
  matchLabel,
  explainMatch,
};