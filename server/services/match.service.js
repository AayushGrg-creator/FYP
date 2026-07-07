'use strict';

/**
 * match.service.js
 * Smart-Matching Engine for Task Tide (Section 5.2 of the FYP report).
 *
 * ✅ REWRITTEN: previously reimplemented preprocessing/TF-IDF/cosine from
 * scratch using the `natural` npm package, completely bypassing the more
 * sophisticated pipeline already built in server/ai/ (skill taxonomy
 * expansion, proper stemming, sparse vectors). This version uses that
 * pipeline instead, so "React developer" and "Frontend engineer with JSX"
 * now correctly score as related via skillTaxonomy.js's expansion map.
 *
 * Pipeline (§5.2.2.3):
 *   Step 1  – Text pre-processing  (ai/preprocessor.js: normalise → tokenise
 *             → clean → stopword-filter → stem → taxonomy-expand → dedup)
 *   Step 2  – TF-IDF vectorisation (ai/tfidf.js TfidfEngine, fit fresh per
 *             request over the relevant corpus — job + candidate freelancers,
 *             or freelancer + candidate jobs)
 *   Step 3  – Cosine similarity (ai/cosineSimilarity.js cosineSparseObjs)
 *   Step 4  – Weighted final score:
 *               Final Score = (cosineSimilarity × 0.7) + (normalisedTrustScore × 0.3)
 *   Step 5  – Rank, return top-N results with explanatory tags
 *
 * Two directions are supported:
 *   getMatchesForJob(...)        — client view: "who should I hire for this job?"
 *   getMatchesForFreelancer(...) — freelancer view: "which open jobs fit me?"
 *     (this direction did not exist before — added for the freelancer
 *     dashboard's "Top Job Matches" section)
 */

const { TfidfEngine }       = require('../ai/tfidf');
const { cosineSparseObjs }  = require('../ai/cosineSimilarity');
const { preprocess, buildDocumentText } = require('../ai/preprocessor');
const FreelancerProfile     = require('../models/FreelancerProfile');
const Job                   = require('../models/Job');
const { normaliseTrustScore } = require('../utils/trustCalculator');
const logger                 = require('../config/logger');

/* ─────────────────────────────────────────────
   Scoring weights (§5.2.2.3)
───────────────────────────────────────────── */
const COSINE_WEIGHT = 0.7;
const TRUST_WEIGHT  = 0.3;
const TOP_N_DEFAULT = 10;

/* ─────────────────────────────────────────────
   Helper: build a fresh TfidfEngine over an ad-hoc corpus and return
   sparse vectors (plain objects) for every document, keyed by id.

   NOTE: for FYP scope this fits the engine fresh on every request rather
   than reading precomputed FreelancerProfile.tfidfVector / Job.tfidfVector
   fields. That's the simpler, always-correct option — the precomputed
   fields (and scripts/rebuildTfidfIndex.js) exist for a future optimisation
   where the corpus is large enough that per-request fitting is too slow.
───────────────────────────────────────────── */
function vectoriseCorpus(docs) {
  // docs: Array<{ id: string, tokens: string[] }>
  //
  // ✅ FIXED: maxDfRatio must be 1 (disabled) here, not the tfidf.js default
  // of 0.95. That default assumes a large corpus (hundreds of freelancer
  // profiles) where terms appearing in >95% of documents are corpus-level
  // filler words worth ignoring. This ad-hoc corpus only ever has 2
  // documents (the query + one candidate), so with maxDfRatio 0.95,
  // maxDfAbs = floor(0.95 * 2) = 1 — meaning ANY word appearing in BOTH
  // documents (df = 2) was being excluded as "too common". Those shared
  // words are exactly what should drive the match score, so the filter
  // was silently zeroing out every genuine overlap and matchPercent was
  // always 0 regardless of how well two documents actually matched.
  const engine = new TfidfEngine({ l2Normalise: true, minDf: 1, maxDfRatio: 1 });
  engine.fit(docs);

  const vectors = new Map();
  for (const [id, vecMap] of engine.getAllDocumentVectors()) {
    vectors.set(id, TfidfEngine.vectorToObject(vecMap));
  }
  return vectors;
}

/* ─────────────────────────────────────────────
   Build a plain-language explanation of the match
───────────────────────────────────────────── */
function buildExplanationTags(queryTokens, candidateTokens, cosine, trustScore) {
  const querySet = new Set(queryTokens);
  const overlap  = candidateTokens.filter((t) => querySet.has(t));
  const tags     = [];

  if (overlap.length > 0) {
    tags.push(`Matched: ${[...new Set(overlap)].slice(0, 5).join(', ')}`);
  }
  if (cosine >= 0.8)      tags.push('Excellent skill alignment');
  else if (cosine >= 0.6) tags.push('Strong skill alignment');
  else if (cosine >= 0.4) tags.push('Moderate skill alignment');
  else                    tags.push('Partial skill alignment');

  if (trustScore >= 90)      tags.push('Highly trusted freelancer');
  else if (trustScore >= 70) tags.push('Verified trusted freelancer');

  return tags;
}

/* ═══════════════════════════════════════════════════════════════════
   CLIENT VIEW — getMatchesForJob
   "Given this job, which freelancers fit best?"
═══════════════════════════════════════════════════════════════════ */

/**
 * @param {string}   jobDescription
 * @param {string[]} jobSkills        - explicit skill tags from the job form
 * @param {object}   filters          - { minTrustScore, maxHourlyRate, location }
 * @param {number}   topN
 * @returns {Promise<Array>}
 */
async function getMatchesForJob(
  jobDescription = '',
  jobSkills      = [],
  filters        = {},
  topN           = TOP_N_DEFAULT,
) {
  const query = {};
  if (filters.minTrustScore) query.trustScore = { $gte: filters.minTrustScore };
  if (filters.maxHourlyRate) query.hourlyRate  = { $lte: filters.maxHourlyRate };
  if (filters.location)      query.location    = new RegExp(filters.location, 'i');

  const profiles = await FreelancerProfile.find(query)
    .populate('userId', 'name email trustScore avatarUrl')
    .lean();

  if (!profiles || profiles.length === 0) return [];

  // ── Step 1: pre-process job text (title/description/skills combined) ──
  const jobText = [jobDescription, jobSkills.join(' ')].join(' ');
  const jobTokens = preprocess(jobText);

  if (jobTokens.length === 0) {
    logger.warn('match.service: job produced zero tokens after pre-processing');
    return [];
  }

  // ── Step 1 (cont.): pre-process each freelancer profile ──
  const freelancerDocs = profiles.map((p) => ({
    id:      p._id.toString(),
    tokens:  preprocess(buildDocumentText(p, 'freelancer')),
    profile: p,
  }));

  // ── Step 2: TF-IDF over the ad-hoc corpus (job + all candidate freelancers) ──
  const corpus = [
    { id: '__query__', tokens: jobTokens },
    ...freelancerDocs.map((d) => ({ id: d.id, tokens: d.tokens })),
  ];
  const vectors = vectoriseCorpus(corpus);
  const queryVector = vectors.get('__query__');

  // ── Steps 3 & 4: score each freelancer ──
  const scored = freelancerDocs.map((doc) => {
    const candidateVector = vectors.get(doc.id) || {};
    const cosine = cosineSparseObjs(queryVector, candidateVector);

    const rawTrustScore   = doc.profile.trustScore || 0;
    const normalisedTrust = normaliseTrustScore(rawTrustScore);
    const finalScore      = cosine * COSINE_WEIGHT + normalisedTrust * TRUST_WEIGHT;

    return {
      freelancerId: doc.profile._id,
      userId:       doc.profile.userId?._id,
      name:         doc.profile.userId?.name  || 'Unknown',
      email:        doc.profile.userId?.email || '',
      avatarUrl:    doc.profile.userId?.avatarUrl || doc.profile.avatarUrl || '',
      skills:       doc.profile.skills     || [],
      hourlyRate:   doc.profile.hourlyRate || 0,
      location:     doc.profile.location   || '',
      trustScore:   rawTrustScore,
      matchPercent:     Math.round(finalScore * 1000) / 10,
      cosineSimilarity: Math.round(cosine * 1000) / 10,
      explanation:  buildExplanationTags(jobTokens, doc.tokens, cosine, rawTrustScore),
    };
  });

  return scored
    .sort((a, b) => b.matchPercent - a.matchPercent)
    .slice(0, topN);
}

/* ═══════════════════════════════════════════════════════════════════
   FREELANCER VIEW — getMatchesForFreelancer   (✅ NEW)
   "Given this freelancer, which open jobs fit best?"
   Powers the Freelancer Dashboard's "Top Job Matches" section.
═══════════════════════════════════════════════════════════════════ */

/**
 * @param {string} freelancerProfileId
 * @param {number} topN
 * @returns {Promise<Array>}
 */
async function getMatchesForFreelancer(freelancerProfileId, topN = TOP_N_DEFAULT) {
  const profile = await FreelancerProfile.findById(freelancerProfileId).lean();
  if (!profile) return null;

  const jobs = await Job.find({ status: 'open', isArchived: false })
    .populate('client', 'name email')
    .lean();

  if (!jobs || jobs.length === 0) return [];

  // ── Step 1: pre-process the freelancer's own profile text (the "query") ──
  const profileTokens = preprocess(buildDocumentText(profile, 'freelancer'));

  if (profileTokens.length === 0) {
    logger.warn('match.service: freelancer profile produced zero tokens (bio/skills empty?)');
    return [];
  }

  // ── Step 1 (cont.): pre-process each open job ──
  // NOTE: buildDocumentText's 'job' branch reads doc.requiredSkills, but the
  // actual Job schema field is skillsRequired — fixed here by mapping it
  // across before calling buildDocumentText, rather than editing the shared
  // preprocessor (keeps the fix local and obvious).
  const jobDocs = jobs.map((j) => ({
    id:    j._id.toString(),
    tokens: preprocess(buildDocumentText({ ...j, requiredSkills: j.skillsRequired }, 'job')),
    job:   j,
  }));

  // ── Step 2: TF-IDF over the ad-hoc corpus (freelancer + all open jobs) ──
  const corpus = [
    { id: '__query__', tokens: profileTokens },
    ...jobDocs.map((d) => ({ id: d.id, tokens: d.tokens })),
  ];
  const vectors = vectoriseCorpus(corpus);
  const queryVector = vectors.get('__query__');

  // ── Steps 3 & 4: score each job ──
  // Trust component here reflects the CLIENT's trust score is not tracked
  // the same way — jobs don't carry a trust score, so for this direction the
  // final score is cosine-only (weight 1.0). This is a deliberate, documented
  // simplification: the report's weighted formula was designed for ranking
  // freelancers-for-a-job (where trust is a freelancer attribute), not the
  // reverse direction.
  const scored = jobDocs.map((doc) => {
    const jobVector = vectors.get(doc.id) || {};
    const cosine = cosineSparseObjs(queryVector, jobVector);

    return {
      jobId:        doc.job._id,
      title:        doc.job.title,
      category:     doc.job.category,
      budgetType:   doc.job.budgetType,
      budgetAmount: doc.job.budgetAmount,
      skillsRequired: doc.job.skillsRequired || [],
      clientName:   doc.job.client?.name || 'Client',
      createdAt:    doc.job.createdAt,
      matchPercent:     Math.round(cosine * 1000) / 10,
      cosineSimilarity: Math.round(cosine * 1000) / 10,
      explanation:  buildExplanationTags(profileTokens, doc.tokens, cosine, 0)
                      .filter((tag) => !tag.includes('trusted')), // trust tags don't apply here
    };
  });

  return scored
    .sort((a, b) => b.matchPercent - a.matchPercent)
    .slice(0, topN);
}

/* ═══════════════════════════════════════════════════════════════════
   Lightweight single-freelancer score (used when re-scoring after
   profile updates, or previewing a job before posting)
═══════════════════════════════════════════════════════════════════ */
async function scoreFreelancerAgainstJob(freelancerProfileId, jobDescription, jobSkills = []) {
  const profile = await FreelancerProfile.findById(freelancerProfileId)
    .populate('userId', 'name email trustScore')
    .lean();

  if (!profile) return null;

  const jobTokens     = preprocess([jobDescription, jobSkills.join(' ')].join(' '));
  const profileTokens = preprocess(buildDocumentText(profile, 'freelancer'));

  const vectors = vectoriseCorpus([
    { id: '__job__',        tokens: jobTokens },
    { id: '__freelancer__', tokens: profileTokens },
  ]);

  const cosine     = cosineSparseObjs(vectors.get('__job__') || {}, vectors.get('__freelancer__') || {});
  const trust      = normaliseTrustScore(profile.trustScore || 0);
  const finalScore = cosine * COSINE_WEIGHT + trust * TRUST_WEIGHT;

  return {
    cosineSimilarity: Math.round(cosine * 1000) / 10,
    matchPercent:     Math.round(finalScore * 1000) / 10,
  };
}

module.exports = {
  getMatchesForJob,
  getMatchesForFreelancer,
  scoreFreelancerAgainstJob,
};
