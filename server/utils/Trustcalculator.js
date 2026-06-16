/**
 * trustCalculator.js
 * Computes the Task Tide Trust Score for a given freelancer profile.
 *
 * Formula (Section 5.5.1 of the FYP report):
 *   Trust Score =
 *     (0.35 × Completion Rate)
 *   + (0.25 × Average Rating)        — normalised to [0, 1]
 *   + (0.20 × Response Time Score)
 *   + (0.10 × Dispute-Free Score)
 *   + (0.10 × Badge Multiplier)      — capped at 1.5
 *
 * The final value is multiplied by 100 to yield a 0–100 score.
 */

'use strict';

/* ─────────────────────────────────────────────
   Constants
───────────────────────────────────────────── */
const WEIGHTS = {
  completionRate:  0.35,
  averageRating:   0.25,
  responseTime:    0.20,
  disputeFree:     0.10,
  badgeMultiplier: 0.10,
};

// Response time thresholds (hours)
const RESPONSE_THRESHOLDS = [
  { maxHours: 1,   score: 1.0 },
  { maxHours: 24,  score: 0.8 },
  { maxHours: 72,  score: 0.5 },
];
const RESPONSE_FALLBACK_SCORE = 0.2;

// Badge multiplier rules
const BADGE_BONUS_PER_BADGE  = 0.05;
const BADGE_MULTIPLIER_MAX   = 1.5;
const BADGE_MULTIPLIER_BASE  = 1.0;

// Dispute-free score: years since last dispute (capped at 3 means score = 1.0)
const DISPUTE_FREE_CAP_YEARS = 3;

/* ─────────────────────────────────────────────
   Helper: Completion Rate  →  [0, 1]
   completedProjects / totalAcceptedProjects
───────────────────────────────────────────── */
function calcCompletionRate(completedProjects = 0, totalAcceptedProjects = 0) {
  if (totalAcceptedProjects <= 0) return 0;
  const rate = completedProjects / totalAcceptedProjects;
  return Math.min(Math.max(rate, 0), 1);
}

/* ─────────────────────────────────────────────
   Helper: Average Rating  →  [0, 1]
   averageStars (0–5)  ÷  5
───────────────────────────────────────────── */
function calcNormalisedRating(averageStars = 0) {
  if (averageStars <= 0) return 0;
  const normalised = averageStars / 5;
  return Math.min(Math.max(normalised, 0), 1);
}

/* ─────────────────────────────────────────────
   Helper: Response Time Score  →  [0.2, 1.0]
   avgResponseHours: average hours to first reply
───────────────────────────────────────────── */
function calcResponseTimeScore(avgResponseHours = null) {
  // Unknown / never responded — treat as worst case
  if (avgResponseHours === null || avgResponseHours === undefined) {
    return RESPONSE_FALLBACK_SCORE;
  }
  for (const { maxHours, score } of RESPONSE_THRESHOLDS) {
    if (avgResponseHours <= maxHours) return score;
  }
  return RESPONSE_FALLBACK_SCORE;
}

/* ─────────────────────────────────────────────
   Helper: Dispute-Free Score  →  [0, 1]
   yearsSinceLastDispute / 3  (capped at 1)
   Pass Infinity (or 3+) when there have never been disputes.
───────────────────────────────────────────── */
function calcDisputeFreeScore(yearsSinceLastDispute = 0) {
  // No dispute on record → treat as the full 3-year cap
  const years = yearsSinceLastDispute === null ? DISPUTE_FREE_CAP_YEARS
              : yearsSinceLastDispute;
  const score = Math.min(years, DISPUTE_FREE_CAP_YEARS) / DISPUTE_FREE_CAP_YEARS;
  return Math.max(score, 0);
}

/* ─────────────────────────────────────────────
   Helper: Badge Multiplier  →  [1.0, 1.5]
   1 + 0.05 per badge, max 1.5
───────────────────────────────────────────── */
function calcBadgeMultiplier(badgeCount = 0) {
  const multiplier = BADGE_MULTIPLIER_BASE + badgeCount * BADGE_BONUS_PER_BADGE;
  return Math.min(multiplier, BADGE_MULTIPLIER_MAX);
}

/* ─────────────────────────────────────────────
   Main export: calculateTrustScore
   Returns a number in [0, 100], rounded to 1 dp.

   @param {object} params
   @param {number}  params.completedProjects       - projects marked complete
   @param {number}  params.totalAcceptedProjects   - all projects ever accepted
   @param {number}  params.averageRating           - mean star rating (0–5)
   @param {number|null} params.avgResponseHours    - average hours to first reply
   @param {number|null} params.yearsSinceLastDispute - null = no disputes ever
   @param {number}  params.badgeCount              - number of badges earned

   @returns {{ score: number, breakdown: object }}
───────────────────────────────────────────── */
function calculateTrustScore({
  completedProjects       = 0,
  totalAcceptedProjects   = 0,
  averageRating           = 0,
  avgResponseHours        = null,
  yearsSinceLastDispute   = null,
  badgeCount              = 0,
} = {}) {
  const completionRate     = calcCompletionRate(completedProjects, totalAcceptedProjects);
  const normalisedRating   = calcNormalisedRating(averageRating);
  const responseTimeScore  = calcResponseTimeScore(avgResponseHours);
  const disputeFreeScore   = calcDisputeFreeScore(yearsSinceLastDispute);
  const badgeMultiplier    = calcBadgeMultiplier(badgeCount);

  // The badge multiplier is applied as the weighted component value, not as a
  // global multiplier — it sits alongside the other factors (report §5.5.1).
  // Normalise it to [0, 1] before applying its weight (base 1.0 → 0, cap 1.5 → 1).
  const badgeComponent = (badgeMultiplier - BADGE_MULTIPLIER_BASE)
                       / (BADGE_MULTIPLIER_MAX - BADGE_MULTIPLIER_BASE);

  const rawScore =
      WEIGHTS.completionRate  * completionRate
    + WEIGHTS.averageRating   * normalisedRating
    + WEIGHTS.responseTime    * responseTimeScore
    + WEIGHTS.disputeFree     * disputeFreeScore
    + WEIGHTS.badgeMultiplier * badgeComponent;

  // Scale to 0–100, clamp and round
  const score = Math.round(Math.min(Math.max(rawScore * 100, 0), 100) * 10) / 10;

  return {
    score,
    breakdown: {
      completionRate:    parseFloat(completionRate.toFixed(4)),
      normalisedRating:  parseFloat(normalisedRating.toFixed(4)),
      responseTimeScore: parseFloat(responseTimeScore.toFixed(4)),
      disputeFreeScore:  parseFloat(disputeFreeScore.toFixed(4)),
      badgeMultiplier:   parseFloat(badgeMultiplier.toFixed(4)),
      badgeComponent:    parseFloat(badgeComponent.toFixed(4)),
    },
  };
}

/* ─────────────────────────────────────────────
   Convenience: normalise a raw Trust Score to [0, 1]
   Used by the matching engine (Final Score formula).
───────────────────────────────────────────── */
function normaliseTrustScore(trustScore = 0) {
  return Math.min(Math.max(trustScore / 100, 0), 1);
}

module.exports = {
  calculateTrustScore,
  normaliseTrustScore,
  // Expose helpers for unit testing
  calcCompletionRate,
  calcNormalisedRating,
  calcResponseTimeScore,
  calcDisputeFreeScore,
  calcBadgeMultiplier,
};