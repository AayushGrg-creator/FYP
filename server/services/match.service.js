/**
 * match.service.js
 * Smart-Matching Engine for Task Tide (Section 5.2 of the FYP report).
 *
 * Pipeline (§5.2.2.3):
 *   Step 1  – Text pre-processing  (tokenise → lowercase → stopword strip → stem)
 *   Step 2  – TF-IDF vectorisation
 *   Step 3  – Cosine similarity between job vector and each freelancer vector
 *   Step 4  – Weighted final score:
 *               Final Score = (cosineSimilarity × 0.7) + (normalisedTrustScore × 0.3)
 *   Step 5  – Rank, return top-N results with explanatory tags
 */

'use strict';

const natural           = require('natural');
const FreelancerProfile = require('../models/FreelancerProfile');
const { normaliseTrustScore } = require('../utils/trustCalculator');
const logger            = require('../config/logger');

/* ─────────────────────────────────────────────
   NLP tooling (npm: natural)
───────────────────────────────────────────── */
const tokenizer = new natural.WordTokenizer();
const stemmer   = natural.PorterStemmer;

// English stop-words — keep this lean; the `natural` package does not ship a
// standalone list, so we maintain a compact version here.
const STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for','of','with',
  'by','from','is','are','was','were','be','been','being','have','has',
  'had','do','does','did','will','would','could','should','may','might',
  'shall','can','need','this','that','these','those','it','its','i','we',
  'you','he','she','they','my','our','your','his','her','their','as','if',
  'not','no','so','then','than','up','out','about','into','more','also',
  'very','just','also','only','over','such','both','each','how','when',
  'where','who','which','what','all','any','some','other','new','use',
  'using','used','experience','work','working','years','year','strong',
  'knowledge','skills','skill','looking','team','able','good','well',
  'must','required','including','include','includes','projects','project',
]);

/* ─────────────────────────────────────────────
   Scoring weights (§5.2.2.3)
───────────────────────────────────────────── */
const COSINE_WEIGHT     = 0.7;
const TRUST_WEIGHT      = 0.3;
const TOP_N_DEFAULT     = 10;

/* ─────────────────────────────────────────────
   Step 1 – Pre-process a text string
   Returns an array of stemmed, cleaned tokens.
───────────────────────────────────────────── */
function preprocess(text = '') {
  if (!text || typeof text !== 'string') return [];
  const tokens = tokenizer.tokenize(text.toLowerCase()) || [];
  return tokens
    .filter(t => t.length > 1 && !STOP_WORDS.has(t) && /^[a-z]/.test(t))
    .map(t => stemmer.stem(t));
}

/* ─────────────────────────────────────────────
   Step 2 – Build TF-IDF vectors
   Returns { vocabulary: string[], vectors: Map<id, number[]> }
   where each vector is normalised (unit-length).

   @param {Array<{ id, tokens: string[] }>} documents
───────────────────────────────────────────── */
function buildTfidfVectors(documents) {
  if (!documents || documents.length === 0) {
    return { vocabulary: [], vectors: new Map() };
  }

  // Build vocabulary (unique terms across all docs)
  const vocabSet = new Set();
  for (const doc of documents) {
    for (const token of doc.tokens) vocabSet.add(token);
  }
  const vocabulary = Array.from(vocabSet);
  const N = documents.length;

  // Document frequency: how many docs contain each term
  const df = new Map();
  for (const term of vocabulary) {
    let count = 0;
    for (const doc of documents) {
      if (doc.tokens.includes(term)) count++;
    }
    df.set(term, count);
  }

  // Build TF-IDF vector for each document
  const vectors = new Map();

  for (const doc of documents) {
    const termCount = doc.tokens.length;
    const vector    = new Float64Array(vocabulary.length);

    // Term frequency map for this document
    const tfMap = new Map();
    for (const token of doc.tokens) {
      tfMap.set(token, (tfMap.get(token) || 0) + 1);
    }

    for (let i = 0; i < vocabulary.length; i++) {
      const term = vocabulary[i];
      const tf   = termCount > 0 ? (tfMap.get(term) || 0) / termCount : 0;
      const idf  = df.get(term) > 0
                 ? Math.log(N / df.get(term))
                 : 0;
      vector[i] = tf * idf;
    }

    // L2-normalise to unit length for cosine similarity
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i++) vector[i] /= magnitude;
    }

    vectors.set(doc.id, vector);
  }

  return { vocabulary, vectors };
}

/* ─────────────────────────────────────────────
   Step 3 – Cosine similarity between two vectors
   Both must be the same length.
   Returns a value in [0, 1].
───────────────────────────────────────────── */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dot  += vecA[i] * vecB[i];
    magA += vecA[i] * vecA[i];
    magB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(magA) * Math.sqrt(magB);
  // Guard against divide-by-zero
  return denominator > 0 ? Math.min(dot / denominator, 1) : 0;
}

/* ─────────────────────────────────────────────
   Build a plain-language explanation of the match
───────────────────────────────────────────── */
function buildExplanationTags(jobTokens, freelancerTokens, cosine, trustScore) {
  const jobSet  = new Set(jobTokens);
  const overlap = freelancerTokens.filter(t => jobSet.has(t));
  const tags    = [];

  if (overlap.length > 0) {
    tags.push(`Matched skills: ${[...new Set(overlap)].slice(0, 5).join(', ')}`);
  }
  if (cosine >= 0.8)       tags.push('Excellent skill alignment');
  else if (cosine >= 0.6)  tags.push('Strong skill alignment');
  else if (cosine >= 0.4)  tags.push('Moderate skill alignment');
  else                     tags.push('Partial skill alignment');

  if (trustScore >= 90)    tags.push('Highly trusted freelancer');
  else if (trustScore >= 70) tags.push('Verified trusted freelancer');

  return tags;
}

/* ─────────────────────────────────────────────
   Core service: getMatchesForJob
   Fetches all active freelancer profiles, runs the
   five-step pipeline, and returns ranked results.

   @param {string} jobDescription  – raw job description text
   @param {string[]} jobSkills     – explicit skill tags from the job form
   @param {object}  filters        – optional { minTrustScore, maxHourlyRate, location }
   @param {number}  topN           – number of results to return (default 10)

   @returns {Promise<Array>}
───────────────────────────────────────────── */
async function getMatchesForJob(
  jobDescription = '',
  jobSkills      = [],
  filters        = {},
  topN           = TOP_N_DEFAULT,
) {
  // ── Fetch freelancer profiles ────────────────
  const query = { isActive: { $ne: false } };
  if (filters.minTrustScore) query.trustScore = { $gte: filters.minTrustScore };
  if (filters.maxHourlyRate) query.hourlyRate  = { $lte: filters.maxHourlyRate };
  if (filters.location)      query.location    = new RegExp(filters.location, 'i');

  const profiles = await FreelancerProfile.find(query)
    .populate('userId', 'name email trustScore')
    .lean();

  if (!profiles || profiles.length === 0) {
    return [];
  }

  // ── Step 1: Pre-process job description ─────
  const jobText   = `${jobDescription} ${jobSkills.join(' ')}`;
  const jobTokens = preprocess(jobText);

  if (jobTokens.length === 0) {
    logger.warn('match.service: job produced zero tokens after pre-processing');
    return [];
  }

  // ── Step 1: Pre-process freelancer profiles ──
  const freelancerDocs = profiles.map(p => {
    const profileText = [
      (p.skills  || []).join(' '),
      p.bio       || '',
      (p.portfolio || []).map(item => `${item.title || ''} ${item.description || ''}`).join(' '),
    ].join(' ');

    return {
      id:     p._id.toString(),
      tokens: preprocess(profileText),
      profile: p,
    };
  });

  // ── Step 2: Build TF-IDF vectors ────────────
  // The job description is document 0; freelancer profiles follow.
  const allDocuments = [
    { id: '__job__', tokens: jobTokens },
    ...freelancerDocs.map(d => ({ id: d.id, tokens: d.tokens })),
  ];

  const { vectors } = buildTfidfVectors(allDocuments);

  const jobVector = vectors.get('__job__');
  if (!jobVector) {
    logger.error('match.service: could not build TF-IDF vector for job');
    return [];
  }

  // ── Steps 3 & 4: Score each freelancer ───────
  const scored = freelancerDocs.map(doc => {
    const freelancerVector = vectors.get(doc.id);

    // Step 3 – cosine similarity
    const cosine = freelancerVector
      ? cosineSimilarity(jobVector, freelancerVector)
      : 0;

    // Step 4 – weighted final score
    const rawTrustScore     = doc.profile.trustScore || 0;
    const normalisedTrust   = normaliseTrustScore(rawTrustScore);
    const finalScore        = cosine * COSINE_WEIGHT + normalisedTrust * TRUST_WEIGHT;

    // Explanation tags
    const tags = buildExplanationTags(
      jobTokens,
      doc.tokens,
      cosine,
      rawTrustScore,
    );

    return {
      freelancerId:  doc.profile._id,
      userId:        doc.profile.userId?._id,
      name:          doc.profile.userId?.name  || 'Unknown',
      email:         doc.profile.userId?.email || '',
      skills:        doc.profile.skills        || [],
      hourlyRate:    doc.profile.hourlyRate     || 0,
      location:      doc.profile.location      || '',
      trustScore:    rawTrustScore,
      matchPercent:  Math.round(finalScore * 100 * 10) / 10,
      cosineSimilarity: Math.round(cosine * 100 * 10) / 10,
      explanation:   tags,
    };
  });

  // ── Step 5: Rank and return top-N ────────────
  return scored
    .sort((a, b) => b.matchPercent - a.matchPercent)
    .slice(0, topN);
}

/* ─────────────────────────────────────────────
   Lightweight single-freelancer score (used when
   re-scoring after profile updates).
───────────────────────────────────────────── */
async function scoreFreelancerAgainstJob(freelancerProfileId, jobDescription, jobSkills = []) {
  const profile = await FreelancerProfile.findById(freelancerProfileId)
    .populate('userId', 'name email trustScore')
    .lean();

  if (!profile) return null;

  const jobText   = `${jobDescription} ${jobSkills.join(' ')}`;
  const jobTokens = preprocess(jobText);

  const profileText = [
    (profile.skills  || []).join(' '),
    profile.bio       || '',
  ].join(' ');
  const profileTokens = preprocess(profileText);

  const docs = [
    { id: '__job__',       tokens: jobTokens },
    { id: '__freelancer__', tokens: profileTokens },
  ];
  const { vectors } = buildTfidfVectors(docs);

  const cosine       = cosineSimilarity(vectors.get('__job__'), vectors.get('__freelancer__'));
  const trust        = normaliseTrustScore(profile.trustScore || 0);
  const finalScore   = cosine * COSINE_WEIGHT + trust * TRUST_WEIGHT;

  return {
    cosineSimilarity: Math.round(cosine * 100 * 10) / 10,
    matchPercent:     Math.round(finalScore * 100 * 10) / 10,
  };
}

module.exports = {
  getMatchesForJob,
  scoreFreelancerAgainstJob,
  // Exported for use in rebuildTfidfIndex script
  preprocess,
  buildTfidfVectors,
  cosineSimilarity,
};