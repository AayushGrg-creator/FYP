/**
 * stopwords.js
 * TaskTide AI Pipeline – English stopword list
 *
 * Purpose
 * ───────
 * Tokens that appear in almost every document contribute nothing to
 * TF-IDF discrimination (their IDF weight collapses toward zero anyway)
 * but they inflate the vocabulary size and slow down cosine-similarity
 * calculations.  Removing them in the preprocessor keeps the term index
 * lean and makes skill tokens like "react", "node", "typescript" stand out
 * with higher relative weights.
 *
 * Curation strategy
 * ─────────────────
 * Four overlapping layers are merged into one flat Set for O(1) lookup:
 *
 *  Layer 1 – Classic NLTK / Snowball English stopwords
 *             (function words, articles, prepositions, conjunctions)
 *  Layer 2 – Job-posting boilerplate
 *             ("responsibilities", "requirements", "preferred", …)
 *  Layer 3 – Generic professional-CV filler
 *             ("experience", "years", "proven", "strong", …)
 *  Layer 4 – Numeric / punctuation fragments that survive basic tokenisation
 *             ("1", "2", …, single-char tokens caught by minLength in preprocessor)
 *
 * All tokens are stored lower-case; the preprocessor lowercases input
 * before the lookup so the check is always case-insensitive.
 *
 * Deliberately NOT included
 * ─────────────────────────
 * Technology terms that happen to be short or common English words are kept
 * out of this list so the preprocessor does not accidentally strip them:
 *   "go"  (Go language), "r"  (R language), "c"  (C language),
 *   "ruby", "rust", "swift", "vue", "next", "node", "type"
 *
 * Exports
 * ───────
 * STOPWORDS_SET  – Set<string>  for O(1) membership test inside the hot loop
 * STOPWORDS      – string[]     for inspection / serialisation
 */

'use strict';

// ─── Layer 1 – Classic English function words ─────────────────────────────────

const FUNCTION_WORDS = [
  // articles
  'a', 'an', 'the',
  // personal pronouns
  'i', 'me', 'my', 'myself',
  'we', 'our', 'ours', 'ourselves',
  'you', "you're", "you've", "you'll", "you'd",
  'your', 'yours', 'yourself', 'yourselves',
  'he', 'him', 'his', 'himself',
  'she', "she's", 'her', 'hers', 'herself',
  'it', "it's", 'its', 'itself',
  'they', 'them', 'their', 'theirs', 'themselves',
  // demonstrative pronouns
  'this', 'that', "that'll", 'these', 'those',
  // relative / interrogative pronouns
  'who', 'whom', 'whose', 'which', 'what',
  'whoever', 'whatever', 'whichever',
  // prepositions
  'at', 'by', 'for', 'in', 'of', 'on', 'to', 'up',
  'about', 'above', 'across', 'after', 'against',
  'along', 'among', 'around', 'as', 'before',
  'behind', 'below', 'beneath', 'beside', 'between',
  'beyond', 'but', 'concerning', 'despite', 'down',
  'during', 'except', 'from', 'inside', 'into',
  'like', 'near', 'off', 'out', 'outside', 'over',
  'past', 'regarding', 'since', 'through', 'throughout',
  'till', 'toward', 'under', 'until', 'unto', 'upon',
  'with', 'within', 'without',
  // conjunctions
  'and', 'or', 'nor', 'so', 'yet', 'both', 'either',
  'neither', 'not', 'only', 'whether', 'while',
  'although', 'because', 'if', 'though', 'unless',
  'until', 'when', 'whenever', 'where', 'whereas',
  'wherever', 'after', 'before', 'since', 'than',
  // auxiliary / modal verbs
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'having',
  'do', 'does', 'did', 'doing',
  'will', 'would', 'shall', 'should',
  'may', 'might', 'must', 'can', 'could',
  // common adverbs
  'very', 'also', 'just', 'more', 'most', 'no', 'now',
  'only', 'other', 'same', 'so', 'such', 'than',
  'then', 'there', 'here', 'too', 'well', 'again',
  'further', 'once', 'any', 'all', 'each', 'few',
  'more', 'much', 'many', 'own', 'some', 'less',
  'least', 'both', 'either', 'every', 'however',
  'therefore', 'thus', 'hence', 'still', 'already',
  'often', 'usually', 'always', 'never', 'quite',
  'rather', 'perhaps', 'maybe', 'especially', 'even',
  'indeed', 'instead', 'meanwhile', 'moreover',
  'nevertheless', 'otherwise', 'therefore', 'thus',
  // miscellaneous function tokens
  'via', 'per', 'etc', 'e.g', 'i.e',
  'eg', 'ie', 'vs', 'vs.',
];

// ─── Layer 2 – Job-posting boilerplate ───────────────────────────────────────

const JOB_POSTING_FILLER = [
  // section headers
  'responsibilities', 'responsibility', 'requirement', 'requirements',
  'qualification', 'qualifications', 'description', 'overview', 'summary',
  'objective', 'introduction', 'background', 'position', 'role', 'title',
  'department', 'team', 'company', 'organization', 'organisation',
  'location', 'remote', 'onsite', 'hybrid', 'fulltime', 'parttime',
  'contract', 'permanent', 'temporary', 'freelance',

  // action / instruction verbs (too generic to discriminate)
  'apply', 'applying', 'applied', 'join', 'work', 'working', 'worked',
  'help', 'support', 'assist', 'collaborate', 'contribute', 'deliver',
  'ensure', 'maintain', 'manage', 'provide', 'report', 'responsible',
  'handle', 'perform', 'execute', 'implement', 'develop', 'create',
  'build', 'design', 'write', 'test', 'review', 'analyze', 'analyse',
  'communicate', 'coordinate', 'lead', 'guide', 'mentor',
  'drive', 'own', 'oversee', 'monitor', 'track', 'update', 'maintain',

  // benefit / culture filler
  'opportunity', 'opportunities', 'benefits', 'benefit', 'competitive',
  'salary', 'compensation', 'package', 'bonus', 'equity', 'stock',
  'culture', 'environment', 'passion', 'passionate', 'mission',
  'vision', 'value', 'values', 'growth', 'impact', 'innovative',
  'innovation', 'diversity', 'inclusive', 'inclusion', 'equal',

  // application process
  'candidate', 'candidates', 'applicant', 'applicants', 'hire', 'hiring',
  'interview', 'offer', 'onboard', 'onboarding', 'start', 'join',
  'submit', 'submission', 'resume', 'cv', 'portfolio', 'reference',
  'references', 'contact', 'email', 'send', 'please', 'thank',
];

// ─── Layer 3 – Generic professional-CV filler ─────────────────────────────────

const CV_FILLER = [
  // vague experience descriptors
  'experience', 'experienced', 'expertise', 'expert',
  'professional', 'proficient', 'proficiency', 'skilled', 'skill',
  'skills', 'knowledge', 'familiar', 'familiarity', 'understanding',
  'background', 'ability', 'able', 'capable', 'capacity',

  // time / duration tokens (years alone carry no skill signal)
  'year', 'years', 'month', 'months', 'week', 'weeks',
  'day', 'days', 'hour', 'hours', 'junior', 'senior', 'mid',
  'entry', 'level', 'levels',

  // degree / scale adjectives too vague to discriminate
  'strong', 'solid', 'good', 'great', 'excellent', 'outstanding',
  'extensive', 'deep', 'broad', 'wide', 'hands',
  'hands-on', 'handson', 'proven', 'demonstrated', 'demonstrated',
  'relevant', 'related', 'various', 'multiple', 'new', 'existing',
  'current', 'latest', 'modern', 'best', 'practice', 'practices',
  'industry', 'standard', 'standards', 'large', 'small', 'high',
  'fast', 'efficient', 'scalable', 'robust', 'reliable', 'clean',

  // connective phrases that survive tokenisation
  'including', 'included', 'such', 'following', 'listed',
  'based', 'focused', 'oriented', 'driven', 'related',
  'across', 'within', 'using', 'used', 'utilize', 'utilise',
  'understanding', 'following', 'preferred', 'required', 'must',
  'nice', 'have', 'nice-to-have', 'bonus', 'plus', 'advantage',
];

// ─── Layer 4 – Numeric fragments & single-char noise ─────────────────────────
// The preprocessor's minLength=2 guard catches single chars,
// but we explicitly list common numeric strings that pass minLength=2.

const NUMERIC_NOISE = [
  '00', '01', '02', '03', '04', '05', '06', '07', '08', '09',
  '10', '11', '12', '13', '14', '15', '16', '17', '18', '19',
  '20', '21', '22', '23', '24', '25', '26', '27', '28', '29',
  '30', '31',
  // common year formats that pass tokenisation
  '2019', '2020', '2021', '2022', '2023', '2024', '2025', '2026',
  // ordinals
  '1st', '2nd', '3rd', '4th', '5th',
];

// ─── Build the exported artefacts ─────────────────────────────────────────────

/**
 * Merge all layers, deduplicate, lowercase, and sort lexicographically.
 * Sorting makes the array easy to audit and diff in version control.
 */
const STOPWORDS = [
  ...new Set([
    ...FUNCTION_WORDS,
    ...JOB_POSTING_FILLER,
    ...CV_FILLER,
    ...NUMERIC_NOISE,
  ].map((w) => w.toLowerCase().trim())),
].sort();

/**
 * STOPWORDS_SET
 * ─────────────
 * O(1) Set used inside the preprocessor's hot filtering loop.
 * Exporting this avoids reconstructing a Set on every module require().
 *
 * @type {Set<string>}
 */
const STOPWORDS_SET = new Set(STOPWORDS);

module.exports = { STOPWORDS, STOPWORDS_SET };