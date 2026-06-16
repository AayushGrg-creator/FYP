/**
 * preprocessor.js
 * TaskTide AI Pipeline – Text normalisation and tokenisation
 *
 * Pipeline stages (in order)
 * ──────────────────────────
 *  1. Normalise  – lowercase, strip HTML/markdown, expand contractions
 *  2. Tokenise   – split on whitespace and punctuation boundaries
 *  3. Clean      – remove noise tokens (too short, purely numeric, punctuation)
 *  4. Stop-filter– discard tokens that appear in STOPWORDS_SET
 *  5. Stem       – collapse inflected forms to approximate root
 *                  (Porter-lite: suffix stripping with no external library)
 *  6. Expand     – add taxonomy alias tokens via skillTaxonomy.expandTokens()
 *  7. Deduplicate– remove repeated tokens while preserving insertion order
 *
 * Output is a plain string[] of normalised tokens ready to be consumed by
 * tfidf.js for vectorisation.
 *
 * Design decisions
 * ────────────────
 * • No external NLP library – raw JS only, as required by the spec.
 * • Porter stemmer is intentionally kept at the "lite" level: it handles the
 *   most common English suffixes without over-stemming tech keywords.
 *   ("developer" → "develop", "testing" → "test", "running" → "run")
 * • Taxonomy expansion runs AFTER stemming so alias keys can be written in
 *   their stemmed forms where necessary.
 * • The module exports both a full `preprocess()` pipeline AND individual
 *   stage functions so unit tests can target each stage in isolation.
 */

'use strict';

const { STOPWORDS_SET }           = require('./stopwords');
const { expandTokens }            = require('./skillTaxonomy');

// ─── Stage 1: Normalise ───────────────────────────────────────────────────────

/**
 * Contraction expansion table.
 * Applied as a regex replace pass before tokenisation so contractions do not
 * generate tokens like "don" or "t" that survive the stop-filter.
 */
const CONTRACTIONS = {
  "can't"    : 'cannot',
  "won't"    : 'will not',
  "don't"    : 'do not',
  "doesn't"  : 'does not',
  "didn't"   : 'did not',
  "isn't"    : 'is not',
  "aren't"   : 'are not',
  "wasn't"   : 'was not',
  "weren't"  : 'were not',
  "haven't"  : 'have not',
  "hasn't"   : 'has not',
  "hadn't"   : 'had not',
  "wouldn't" : 'would not',
  "shouldn't": 'should not',
  "couldn't" : 'could not',
  "i'm"      : 'i am',
  "i've"     : 'i have',
  "i'll"     : 'i will',
  "i'd"      : 'i would',
  "it's"     : 'it is',
  "that's"   : 'that is',
  "there's"  : 'there is',
  "they're"  : 'they are',
  "they've"  : 'they have',
  "they'll"  : 'they will',
  "we're"    : 'we are',
  "we've"    : 'we have',
  "we'll"    : 'we will',
  "you're"   : 'you are',
  "you've"   : 'you have',
  "you'll"   : 'you will',
  "let's"    : 'let us',
};

// Pre-compile a single regex that matches any contraction (word-boundary aware)
const CONTRACTION_REGEX = new RegExp(
  Object.keys(CONTRACTIONS)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|'),
  'gi'
);

/**
 * normalise
 * ─────────
 * Lower-case and clean an input string before tokenisation.
 *
 * Steps:
 *  a) Guard against non-string input
 *  b) Lowercase
 *  c) Strip HTML tags
 *  d) Strip markdown syntax characters (*, #, >, `, ~, _)
 *  e) Expand contractions
 *  f) Normalise known compound tech names to their canonical single token
 *     (e.g., "Node.js" → "nodejs", "React.js" → "reactjs")
 *  g) Replace punctuation clusters with a single space, except hyphens
 *     inside tech names (handled in tokenise)
 *
 * @param  {string} input
 * @returns {string}
 */
function normalise(input) {
  if (typeof input !== 'string') {
    return '';
  }

  let text = input.toLowerCase();

  // (c) Strip HTML tags
  text = text.replace(/<[^>]+>/g, ' ');

  // (d) Strip markdown syntax characters
  text = text.replace(/[#*>`~_=|]/g, ' ');

  // (e) Expand contractions
  text = text.replace(CONTRACTION_REGEX, (match) => {
    return CONTRACTIONS[match.toLowerCase()] || match;
  });

  // (f) Normalise well-known compound tech names before punctuation stripping
  //     so "Node.js" → "nodejs" and "React.js" → "reactjs" survive as single tokens
  text = text
    .replace(/\bnode\.js\b/g,        'nodejs')
    .replace(/\breact\.js\b/g,       'reactjs')
    .replace(/\bvue\.js\b/g,         'vuejs')
    .replace(/\bexpress\.js\b/g,     'expressjs')
    .replace(/\bangular\.js\b/g,     'angularjs')
    .replace(/\bnext\.js\b/g,        'nextjs')
    .replace(/\bnuxt\.js\b/g,        'nuxtjs')
    .replace(/\bsocket\.io\b/g,      'socketio')
    .replace(/\btailwind\s*css\b/g,  'tailwindcss')
    .replace(/\bscikit[-\s]learn\b/g,'scikitlearn')
    .replace(/\breact[-\s]native\b/g,'reactnative')
    .replace(/\btype[-\s]script\b/g, 'typescript')
    .replace(/\basp\.net\b/g,        'aspnet')
    .replace(/\b\.net\b/g,           'dotnet')
    .replace(/\bc\+\+/g,             'cpp')
    .replace(/\bc#/g,                'csharp')
    .replace(/\bobj[-\s]c\b/g,       'objectivec')
    .replace(/\bci\/cd\b/g,          'cicd')
    .replace(/\bno[-\s]sql\b/g,      'nosql');

  // (g) Replace punctuation and special chars with space (keep hyphens for step below)
  text = text.replace(/[^\w\s-]/g, ' ');

  // Collapse whitespace
  text = text.replace(/\s+/g, ' ').trim();

  return text;
}

// ─── Stage 2: Tokenise ────────────────────────────────────────────────────────

/**
 * tokenise
 * ────────
 * Split a normalised string into individual tokens.
 *
 * Splitting rules:
 *  • Split on whitespace
 *  • Split on hyphens (but keep both parts: "full-stack" → ["full", "stack"])
 *  • Split on underscores ("my_project" → ["my", "project"])
 *  • Split on camelCase boundaries ("fireStore" → ["fire", "store"])
 *    – intentionally conservative: only splits on lower→upper transitions
 *      to avoid breaking "AWS" or "SQL"
 *
 * @param  {string} normalisedText
 * @returns {string[]}
 */
function tokenise(normalisedText) {
  if (!normalisedText) return [];

  // Insert a space before camelCase boundaries then split
  const withSpaces = normalisedText
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase();

  const rawTokens = withSpaces
    .split(/[\s\-_]+/)
    .filter(Boolean);

  return rawTokens;
}

// ─── Stage 3: Clean ───────────────────────────────────────────────────────────

/**
 * Configuration for token cleaning.
 * Exposed so tests can override without patching the module.
 */
const CLEAN_CONFIG = {
  minLength   : 2,    // discard single-char tokens (except kept short codes below)
  maxLength   : 50,   // discard absurdly long tokens (likely URLs or base64 blobs)
};

/**
 * Short codes that are legitimate tech identifiers and must not be discarded
 * by the minLength guard.  All lowercase.
 */
const SHORT_CODE_WHITELIST = new Set([
  'go',   // Go language
  'r',    // R language (length 1 – only kept if minLength is 1)
  'c',    // C language  (same)
  'ai',   // Artificial Intelligence
  'ml',   // Machine Learning
  'dl',   // Deep Learning
  'ci',   // Continuous Integration
  'cd',   // Continuous Delivery
  'ui',   // User Interface
  'ux',   // User Experience
  'qa',   // Quality Assurance
  'pm',   // Product Manager / project management
  'ts',   // TypeScript
  'js',   // JavaScript
  'py',   // Python
  'db',   // Database
  'os',   // Operating System
  'vm',   // Virtual Machine
  'k8s',  // Kubernetes (3 chars, but keep explicit)
  'aws',  // Amazon Web Services
  'gcp',  // Google Cloud Platform
  'iac',  // Infrastructure as Code
  'api',  // Application Programming Interface
  'sdk',  // Software Development Kit
  'ide',  // Integrated Development Environment
  'orm',  // Object-Relational Mapping
  'mvc',  // Model-View-Controller
  'spa',  // Single Page Application
  'pwa',  // Progressive Web App
  'dom',  // Document Object Model
  'oop',  // Object-Oriented Programming
  'fp',   // Functional Programming
  'tdd',  // Test-Driven Development
  'bdd',  // Behaviour-Driven Development
  'e2e',  // End-to-End (testing)
  'nlp',  // Natural Language Processing
  'cv',   // Computer Vision (in technical context)
  'rn',   // React Native
  'jwt',  // JSON Web Token
  'tls',  // Transport Layer Security
  'ssl',  // Secure Sockets Layer
  'xss',  // Cross-Site Scripting
  'sql',  // Structured Query Language
  'xml',  // Extensible Markup Language
  'css',  // Cascading Style Sheets
  'html', // HyperText Markup Language
  'git',  // Git VCS (3 chars)
  'ssh',  // Secure Shell
  'tcp',  // Transmission Control Protocol
  'http', // HyperText Transfer Protocol
  'rest', // REpresentational State Transfer
  'grpc', // gRPC
  'yaml', // Yet Another Markup Language
  'json', // JavaScript Object Notation
  'csv',  // Comma-Separated Values
  'pdf',  // Portable Document Format
  'cdn',  // Content Delivery Network
  'dns',  // Domain Name System
  'ssr',  // Server-Side Rendering
  'ssg',  // Static Site Generation
  'isr',  // Incremental Static Regeneration
]);

/**
 * cleanTokens
 * ───────────
 * Remove noise tokens from a raw token array.
 *
 * Removes:
 *  • Tokens shorter than minLength (unless in SHORT_CODE_WHITELIST)
 *  • Tokens longer than maxLength
 *  • Purely numeric tokens (e.g., "2023", "100")
 *  • Tokens containing only punctuation or symbol characters
 *
 * @param  {string[]} tokens
 * @returns {string[]}
 */
function cleanTokens(tokens) {
  const { minLength, maxLength } = CLEAN_CONFIG;

  return tokens.filter((token) => {
    // Whitelist short but meaningful codes
    if (SHORT_CODE_WHITELIST.has(token)) return true;

    // Length guards
    if (token.length < minLength) return false;
    if (token.length > maxLength) return false;

    // Purely numeric (single integers, years, etc.)
    if (/^\d+$/.test(token)) return false;

    // Version strings like "3.8", "v2", "1.0.0" – strip but keep the base name
    // (they are filtered here; the parent token like "python" is kept separately)
    if (/^v?\d+(\.\d+)*$/.test(token)) return false;

    // Must contain at least one letter
    if (!/[a-z]/.test(token)) return false;

    return true;
  });
}

// ─── Stage 4: Stop-filter ─────────────────────────────────────────────────────

/**
 * filterStopwords
 * ───────────────
 * Remove tokens that appear in the stopwords Set.
 *
 * @param  {string[]} tokens
 * @returns {string[]}
 */
function filterStopwords(tokens) {
  return tokens.filter((t) => !STOPWORDS_SET.has(t));
}

// ─── Stage 5: Stem ───────────────────────────────────────────────────────────

/**
 * Porter-lite stemmer
 * ───────────────────
 * A conservative suffix-stripping function designed for tech job text.
 *
 * The full Porter algorithm is not used because it over-stems technical
 * terms:  "nodejs" → "nodej",  "angular" → "angular" (ok),
 * "testing" → "test" (ok),  "express" → "express" (ok).
 *
 * Rules applied in priority order (first match wins):
 *
 *  1. Guard: tokens ≤ 3 chars are returned unchanged (avoid over-stemming)
 *  2. Long suffix strip:
 *     -ational → -ate   ("relational" → "relate")
 *     -tional  → -tion  ("functional" → "function")  -- kept intentionally
 *     -ization → -ize   ("optimization" → "optimize")
 *     -isation → -ise
 *     -iveness → -ive
 *     -fulness → -ful
 *     -ousness → -ous
 *  3. Medium suffix strip:
 *     -nesses  → -ness
 *     -ments   → -ment ("requirements" → "requirement")
 *     -ations  → -ation
 *     -ities   → -ity  ("abilities" → "ability")
 *     -ments   → -ment
 *  4. Common suffix strip:
 *     -ing     → stem  ("running" → "run", but keep "ring" → "ring")
 *     -ings    → stem
 *     -tion    → stem
 *     -tions   → stem
 *     -ed      → stem  ("implemented" → "implement")
 *     -er      → stem  ("developer" → "develop")
 *     -ers     → stem
 *     -ment    → stem
 *     -ments   → stem
 *     -ness    → stem
 *     -ible    → stem
 *     -able    → stem
 *     -ity     → stem
 *     -ies     → -y   ("abilities" → "abilit" via above, "copies" → "cop")
 *     -s       → stem  (only if stem ≥ 3 chars and doesn't end in ss)
 *
 * IMPORTANT: Technical tokens in SHORT_CODE_WHITELIST and known tech terms
 * are exempted from stemming to prevent corruption.
 */
/**
 * Tokens that should never be stemmed because their surface form IS the
 * canonical form used in the taxonomy and vector index.
 */
const STEM_EXEMPT = new Set([
  // Short codes already in whitelist – exempt by length guard anyway
  // Explicit tech names that look like English words but must stay intact
  'express', 'expressjs',
  'rails', 'rubyonrails',
  'kubernetes',
  'serverless',
  'jenkins',
  'figma',
  'notion',
  'stripe', 'khalti', 'esewa',
  'tailwind', 'tailwindcss',
  'bootstrap',
  'svelte', 'sveltekit',
  'flutter',
  'kotlin',
  'solidity',
  'elasticsearch',
  'prometheus',
  'terraform',
  'ansible',
  'grafana',
  'postman',
  'prettier',
  'eslint',
  'webpack', 'vite',
  'prisma', 'mongoose', 'sequelize',
  'celery', 'airflow',
  'prefect', 'dagster',
  'snowflake',
  'dbt',
]);

/**
 * stemToken
 * ─────────
 * Apply Porter-lite stemming to a single lowercase token.
 *
 * @param  {string} token
 * @returns {string}
 */
function stemToken(token) {
  // (1) Guard: skip short tokens and exemptions
  if (token.length <= 3) return token;
  if (STEM_EXEMPT.has(token)) return token;
  if (SHORT_CODE_WHITELIST.has(token)) return token;

  let t = token;

  // (2) Long suffix strip
  if (t.endsWith('ational') && t.length > 9) { t = t.slice(0, -7) + 'ate';  }
  else if (t.endsWith('ization') && t.length > 9) { t = t.slice(0, -7) + 'ize'; }
  else if (t.endsWith('isation') && t.length > 9) { t = t.slice(0, -7) + 'ise'; }
  else if (t.endsWith('iveness') && t.length > 9) { t = t.slice(0, -7) + 'ive'; }
  else if (t.endsWith('fulness') && t.length > 9) { t = t.slice(0, -7) + 'ful'; }
  else if (t.endsWith('ousness') && t.length > 9) { t = t.slice(0, -7) + 'ous'; }

  // (3) Medium suffix strip
  else if (t.endsWith('ations') && t.length > 8) { t = t.slice(0, -6) + 'ate'; }
  else if (t.endsWith('nesses') && t.length > 8) { t = t.slice(0, -6) + 'ness'; }
  else if (t.endsWith('ities')  && t.length > 7) { t = t.slice(0, -5) + 'ity'; }
  else if (t.endsWith('ments')  && t.length > 7) { t = t.slice(0, -5) + 'ment'; }

  // (4a) -ings / -ing
  else if (t.endsWith('ings') && t.length > 6) {
    const stem = t.slice(0, -4);
    if (stem.length >= 3) t = stem;
  }
  else if (t.endsWith('ing') && t.length > 5) {
    const stem = t.slice(0, -3);
    // Double consonant: running → run
    if (stem.length >= 3 && /([^aeiou])\1$/.test(stem)) {
      t = stem.slice(0, -1);
    } else if (stem.length >= 3) {
      t = stem;
    }
  }

  // (4b) -tions / -tion
  else if (t.endsWith('tions') && t.length > 7) { t = t.slice(0, -5); }
  else if (t.endsWith('tion')  && t.length > 6) { t = t.slice(0, -4); }

  // (4c) -ers / -er (developer → develop)
  else if (t.endsWith('ers') && t.length > 5) {
    const stem = t.slice(0, -3);
    if (stem.length >= 3) t = stem;
  }
  else if (t.endsWith('er') && t.length > 4) {
    const stem = t.slice(0, -2);
    if (stem.length >= 3) t = stem;
  }

  // (4d) -ed
  else if (t.endsWith('ed') && t.length > 4) {
    const stem = t.slice(0, -2);
    if (stem.length >= 3) t = stem;
  }

  // (4e) -ment / -ments
  else if (t.endsWith('ment') && t.length > 6) { t = t.slice(0, -4); }

  // (4f) -ness
  else if (t.endsWith('ness') && t.length > 6) { t = t.slice(0, -4); }

  // (4g) -able / -ible
  else if ((t.endsWith('able') || t.endsWith('ible')) && t.length > 6) {
    t = t.slice(0, -4);
  }

  // (4h) -ity
  else if (t.endsWith('ity') && t.length > 5) { t = t.slice(0, -3); }

  // (4i) -ies → -y (copies → copy)
  else if (t.endsWith('ies') && t.length > 5) { t = t.slice(0, -3) + 'y'; }

  // (4j) Trailing -s (only plain plural, not -ss, -us, -is endings)
  else if (
    t.endsWith('s') &&
    t.length > 4 &&
    !t.endsWith('ss') &&
    !t.endsWith('us') &&
    !t.endsWith('is') &&
    !t.endsWith('as')
  ) {
    t = t.slice(0, -1);
  }

  return t;
}

/**
 * stemTokens
 * ──────────
 * Apply stemToken to every element of a token array.
 *
 * @param  {string[]} tokens
 * @returns {string[]}
 */
function stemTokens(tokens) {
  return tokens.map(stemToken);
}

// ─── Stage 6 + 7: Expand and Deduplicate ─────────────────────────────────────

/**
 * deduplicateTokens
 * ─────────────────
 * Remove duplicate tokens while preserving first-occurrence order.
 *
 * @param  {string[]} tokens
 * @returns {string[]}
 */
function deduplicateTokens(tokens) {
  const seen = new Set();
  return tokens.filter((t) => {
    if (seen.has(t)) return false;
    seen.add(t);
    return true;
  });
}

// ─── Full pipeline ────────────────────────────────────────────────────────────

/**
 * preprocess
 * ──────────
 * Run the full NLP pipeline on a single text string.
 *
 * Pipeline:  normalise → tokenise → clean → stopFilter → stem → expand → dedup
 *
 * @param  {string}  input
 * @param  {object}  [options]
 * @param  {boolean} [options.expand=true]   Run taxonomy expansion
 * @param  {boolean} [options.stem=true]     Run stemming
 * @returns {string[]}  Normalised token array
 *
 * @example
 * preprocess('Need a React developer with Node.js experience')
 * // → ['react', 'develop', 'nodejs', 'frontend', 'javascript', 'backend', ...]
 */
function preprocess(input, options = {}) {
  const { expand = true, stem = true } = options;

  if (!input || typeof input !== 'string') return [];

  // Stage 1
  const normed   = normalise(input);
  // Stage 2
  const rawToks  = tokenise(normed);
  // Stage 3
  const cleaned  = cleanTokens(rawToks);
  // Stage 4
  const filtered = filterStopwords(cleaned);
  // Stage 5
  const stemmed  = stem ? stemTokens(filtered) : filtered;
  // Stage 6
  const expanded = expand ? expandTokens(stemmed) : stemmed;
  // Stage 7
  const final    = deduplicateTokens(expanded);

  return final;
}

/**
 * preprocessBatch
 * ───────────────
 * Preprocess an array of strings and return a corresponding array of token
 * arrays.  Useful for bulk-vectorising all freelancer profiles at index time.
 *
 * @param  {string[]} inputs
 * @param  {object}   [options]  - Same as preprocess()
 * @returns {string[][]}
 */
function preprocessBatch(inputs, options = {}) {
  if (!Array.isArray(inputs)) {
    throw new TypeError('preprocessBatch expects an array of strings.');
  }
  return inputs.map((input) => preprocess(input, options));
}

/**
 * buildDocumentText
 * ─────────────────
 * Convenience helper: concatenate the text fields of a FreelancerProfile
 * or a Job document into a single string for preprocessing.
 *
 * For FreelancerProfile:
 *   skills (array) + bio + portfolio[].description
 *
 * For Job:
 *   title + description + requiredSkills (array)
 *
 * @param  {object} doc - Mongoose document or plain object
 * @param  {'freelancer'|'job'} type
 * @returns {string}
 */
function buildDocumentText(doc, type) {
  if (!doc || typeof doc !== 'object') return '';

  if (type === 'freelancer') {
    const parts = [];
    // Skills array → join with spaces so each skill is a separate token
    if (Array.isArray(doc.skills)) parts.push(doc.skills.join(' '));
    if (doc.bio)   parts.push(doc.bio);
    if (doc.title) parts.push(doc.title);  // some profiles have a headline
    // Portfolio items
    if (Array.isArray(doc.portfolio)) {
      doc.portfolio.forEach((item) => {
        if (item.title)       parts.push(item.title);
        if (item.description) parts.push(item.description);
        if (Array.isArray(item.skills)) parts.push(item.skills.join(' '));
      });
    }
    return parts.join(' ');
  }

  if (type === 'job') {
    const parts = [];
    if (doc.title)       parts.push(doc.title);
    if (doc.description) parts.push(doc.description);
    if (Array.isArray(doc.requiredSkills)) parts.push(doc.requiredSkills.join(' '));
    if (doc.category)    parts.push(doc.category);
    return parts.join(' ');
  }

  // Fallback: stringify whatever we receive
  return String(doc);
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  // Full pipeline
  preprocess,
  preprocessBatch,
  buildDocumentText,

  // Individual stages (for unit testing and custom pipelines)
  normalise,
  tokenise,
  cleanTokens,
  filterStopwords,
  stemToken,
  stemTokens,
  deduplicateTokens,

  // Exposed config (tests can mutate CLEAN_CONFIG.minLength etc.)
  CLEAN_CONFIG,
  STEM_EXEMPT,
  SHORT_CODE_WHITELIST,
};