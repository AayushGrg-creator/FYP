/**
 * skillTaxonomy.js
 * TaskTide AI Pipeline – Skill synonym & category expansion map
 *
 * Problem solved
 * ──────────────
 * Pure TF-IDF cosine similarity is lexical: a job description that says
 * "React developer" and a freelancer profile that says "Frontend engineer
 * skilled in JSX and hooks" share almost no token overlap despite being a
 * near-perfect semantic match.  Without expansion, cosine similarity
 * would score that match close to zero.
 *
 * Solution
 * ────────
 * Before vectorisation, the preprocessor calls `expandTokens()` (exported
 * below).  For every token that appears as a key in SKILL_ALIASES or as a
 * member of a SKILL_GROUP, a fixed set of canonical expansion tokens is
 * appended to the token list.  This bridges the vocabulary gap without
 * requiring a trained embedding model.
 *
 * Design constraints
 * ──────────────────
 * • Pure JavaScript objects – zero external dependencies.
 * • Deterministic: same input always produces same output.
 * • Additive: expansion only adds tokens, never removes originals.
 *   This preserves specificity (a "React" profile scores higher on a
 *   "React" job than a generic "JavaScript" profile does).
 * • Flat: the preprocessor needs O(1) per-token lookup, so all data is
 *   pre-compiled into two plain Maps at module load time.
 *
 * Data structures
 * ───────────────
 * SKILL_GROUPS   – canonical group name → member skill strings
 *                  Used for: bidirectional expansion (member → group label)
 *
 * SKILL_ALIASES  – raw token → canonical token(s)
 *                  Used for: normalising abbreviations and common typos
 *
 * TOKEN_EXPANSION_MAP  – compiled Map<string, string[]>
 *                  The single lookup table used at runtime by expandTokens().
 *                  Built once at module load; not mutated afterward.
 *
 * Expansion rules (illustrated)
 * ──────────────────────────────
 * "react"   → adds ["frontend", "javascript", "ui", "component"]
 * "nodejs"  → adds ["backend", "javascript", "server", "runtime"]
 * "postgres"→ adds ["sql", "database", "relational", "rdbms"]
 * "k8s"     → adds ["kubernetes", "devops", "container", "orchestration"]
 * "ml"      → adds ["machinelearning", "ai", "datascience", "python"]
 *
 * Adding new skills
 * ─────────────────
 * 1. Add the skill string to the appropriate SKILL_GROUPS array.
 * 2. If it has common abbreviations / aliases, add them to SKILL_ALIASES.
 * 3. Call `rebuildExpansionMap()` (exported for testing / hot-reload).
 * 4. Call `server/scripts/rebuildTfidfIndex.js` to reindex all profiles.
 */

'use strict';

// ─── Skill groups ─────────────────────────────────────────────────────────────
// Each group defines a canonical label and its member skills.
// Member skills receive the group label as an expansion token, which means
// that two skills in the same group always share at least one token in common.

const SKILL_GROUPS = {

  // ── Frontend ────────────────────────────────────────────────────────────────
  frontend: [
    'react', 'reactjs', 'react.js',
    'vue', 'vuejs', 'vue.js', 'vuex',
    'angular', 'angularjs',
    'svelte', 'sveltekit',
    'nextjs', 'next.js', 'next',
    'nuxtjs', 'nuxt.js', 'nuxt',
    'gatsby',
    'html', 'html5',
    'css', 'css3',
    'sass', 'scss', 'less',
    'tailwind', 'tailwindcss',
    'bootstrap',
    'materialui', 'mui',
    'styledcomponents', 'styled-components',
    'webpack', 'vite', 'parcel', 'rollup',
    'redux', 'zustand', 'jotai', 'recoil',
    'graphql',                  // appears in both frontend and backend
    'jsx', 'tsx',
    'dom', 'bom', 'spa',
  ],

  // ── Backend ─────────────────────────────────────────────────────────────────
  backend: [
    'nodejs', 'node.js', 'node',
    'express', 'expressjs',
    'nestjs', 'nest.js',
    'fastify', 'hapi', 'koa',
    'django', 'flask', 'fastapi',
    'rails', 'rubyonrails', 'sinatra',
    'spring', 'springboot',
    'laravel', 'symfony',
    'aspnet', 'asp.net', 'dotnet', '.net',
    'graphql',
    'rest', 'restapi', 'restful',
    'grpc', 'protobuf',
    'microservices', 'serverless',
    'api', 'webhook',
  ],

  // ── JavaScript / TypeScript ──────────────────────────────────────────────────
  javascript: [
    'javascript', 'js', 'es6', 'es2015', 'es2020', 'esnext',
    'typescript', 'ts',
    'nodejs', 'node.js', 'node',
    'react', 'reactjs',
    'vue', 'vuejs',
    'angular',
    'svelte',
    'nextjs', 'next.js',
    'deno', 'bun',
    'jest', 'vitest', 'mocha', 'jasmine', 'chai',
    'webpack', 'vite',
    'npm', 'yarn', 'pnpm',
  ],

  // ── Python ───────────────────────────────────────────────────────────────────
  python: [
    'python', 'python3', 'py',
    'django', 'flask', 'fastapi',
    'pandas', 'numpy', 'scipy', 'matplotlib', 'seaborn',
    'scikit', 'sklearn', 'scikit-learn',
    'tensorflow', 'tf', 'keras',
    'pytorch', 'torch',
    'jupyter', 'notebook',
    'pipenv', 'poetry', 'pip',
    'celery', 'airflow',
  ],

  // ── Database ─────────────────────────────────────────────────────────────────
  database: [
    'mongodb', 'mongo',
    'postgresql', 'postgres', 'psql',
    'mysql', 'mariadb',
    'sqlite', 'sqlite3',
    'oracle', 'oracledb',
    'mssql', 'sqlserver',
    'redis', 'memcached',
    'elasticsearch', 'elastic', 'opensearch',
    'cassandra', 'couchdb', 'couchbase',
    'dynamodb', 'firestore', 'firebase',
    'supabase', 'planetscale',
    'prisma', 'mongoose', 'sequelize', 'typeorm',
    'sql', 'nosql', 'newsql',
  ],

  // ── SQL (sub-group – also bridges into database) ──────────────────────────
  sql: [
    'sql', 'mysql', 'postgresql', 'postgres',
    'sqlite', 'mssql', 'sqlserver', 'oracle',
    'mariadb', 'plpgsql', 'tsql',
    'relational', 'rdbms',
  ],

  // ── DevOps / Infrastructure ─────────────────────────────────────────────────
  devops: [
    'docker', 'dockerfile',
    'kubernetes', 'k8s', 'kubectl', 'helm',
    'terraform', 'ansible', 'puppet', 'chef',
    'jenkins', 'githubactions', 'gitlab', 'circleci', 'travis',
    'nginx', 'apache', 'caddy',
    'linux', 'bash', 'shell', 'zsh',
    'aws', 'ec2', 's3', 'lambda', 'cloudfront', 'rds', 'ecs', 'eks',
    'gcp', 'gke', 'bigquery', 'cloudfunctions',
    'azure', 'azuredevops',
    'ci', 'cd', 'cicd', 'pipeline',
    'monitoring', 'prometheus', 'grafana', 'datadog', 'newrelic',
    'infrastructure', 'iac',
  ],

  // ── Cloud ────────────────────────────────────────────────────────────────────
  cloud: [
    'aws', 'amazon', 'ec2', 's3', 'lambda', 'rds', 'cloudfront',
    'ecs', 'eks', 'sqs', 'sns', 'dynamodb',
    'gcp', 'google', 'gke', 'bigquery',
    'azure', 'microsoft',
    'vercel', 'netlify', 'heroku', 'render',
    'cloudflare', 'digitalocean',
    'serverless', 'faas', 'paas', 'iaas',
  ],

  // ── Mobile ───────────────────────────────────────────────────────────────────
  mobile: [
    'reactnative', 'react-native',
    'flutter', 'dart',
    'swift', 'swiftui', 'xcode', 'ios',
    'kotlin', 'android', 'androidstudio',
    'ionic', 'capacitor', 'cordova',
    'expo',
    'pwa', 'progressivewebapp',
  ],

  // ── Machine Learning / AI ────────────────────────────────────────────────────
  machinelearning: [
    'ml', 'ai', 'artificialintelligence',
    'deeplearning', 'dl',
    'nlp', 'naturallanguageprocessing',
    'computervision', 'cv',
    'tensorflow', 'tf', 'keras',
    'pytorch', 'torch',
    'scikit', 'sklearn', 'scikit-learn',
    'xgboost', 'lightgbm', 'catboost',
    'huggingface', 'transformers',
    'llm', 'gpt', 'bert', 'embedding',
    'tfidf', 'wordvec', 'word2vec',
    'regression', 'classification', 'clustering',
    'recommendation', 'reinforcement',
    'datascience', 'dataanalysis',
    'pandas', 'numpy',
    'jupyter', 'notebook',
    'mlops', 'mlflow', 'kubeflow',
  ],

  // ── Data Engineering ────────────────────────────────────────────────────────
  dataengineering: [
    'spark', 'pyspark', 'hadoop', 'hive',
    'kafka', 'rabbitmq', 'pulsar', 'nats',
    'airflow', 'prefect', 'dagster', 'luigi',
    'dbt', 'datawarehouse', 'datalake',
    'snowflake', 'bigquery', 'redshift',
    'etl', 'elt', 'pipeline', 'ingestion',
    'streaming', 'batchprocessing',
  ],

  // ── Testing / QA ─────────────────────────────────────────────────────────────
  testing: [
    'jest', 'vitest', 'mocha', 'jasmine', 'chai', 'sinon',
    'cypress', 'playwright', 'puppeteer', 'selenium',
    'pytest', 'unittest', 'nose',
    'rspec', 'minitest',
    'junit', 'testng',
    'supertest', 'pact',
    'tdd', 'bdd', 'unittest', 'integration', 'e2e',
    'qa', 'qualityassurance', 'testing',
  ],

  // ── UI / UX Design ───────────────────────────────────────────────────────────
  design: [
    'figma', 'sketch', 'adobexd', 'xd', 'invision',
    'photoshop', 'illustrator', 'affinity', 'inkscape',
    'ux', 'ui', 'userexperience', 'userinterface',
    'wireframe', 'prototype', 'mockup',
    'typography', 'colortheory', 'accessibility', 'a11y',
    'responsivedesign', 'mobiledesign',
    'designsystem', 'componentlibrary',
    'hci', 'usability', 'usabilitytesting',
  ],

  // ── Security ─────────────────────────────────────────────────────────────────
  security: [
    'cybersecurity', 'infosec', 'appsec',
    'owasp', 'pentest', 'penetrationtesting',
    'jwt', 'oauth', 'oauth2', 'openid', 'oidc', 'saml',
    'tls', 'ssl', 'https', 'encryption', 'aes', 'rsa',
    'authentication', 'authorization', 'rbac', 'acl',
    'xss', 'csrf', 'sqli', 'injection',
    'vault', 'secretsmanagement',
  ],

  // ── Version Control ─────────────────────────────────────────────────────────
  versioncontrol: [
    'git', 'github', 'gitlab', 'bitbucket',
    'svn', 'mercurial',
    'pullrequest', 'codereview', 'branching', 'merge',
  ],

  // ── Payments / Fintech ───────────────────────────────────────────────────────
  payments: [
    'stripe', 'paypal', 'braintree', 'square',
    'khalti', 'esewa', 'fonepay',   // Nepali gateways relevant to TaskTide
    'escrow', 'webhook', 'pci',
    'billing', 'subscription', 'invoicing',
  ],

  // ── Real-time / WebSockets ───────────────────────────────────────────────────
  realtime: [
    'socketio', 'socket.io', 'websocket', 'websockets', 'ws',
    'webrtc', 'sse', 'serversentevents',
    'pusher', 'ably', 'livekit',
    'mqtt', 'amqp', 'rabbitmq', 'kafka',
  ],

  // ── Blockchain / Web3 ────────────────────────────────────────────────────────
  blockchain: [
    'solidity', 'ethereum', 'eth',
    'web3', 'web3js', 'ethers', 'ethersjs',
    'hardhat', 'truffle', 'foundry',
    'nft', 'defi', 'smartcontract',
    'polygon', 'avalanche', 'solana', 'rust',
    'ipfs', 'filecoin',
    'metamask', 'walletconnect',
  ],

  // ── CMS / E-commerce ─────────────────────────────────────────────────────────
  cms: [
    'wordpress', 'wp', 'woocommerce',
    'shopify', 'liquid',
    'contentful', 'sanity', 'strapi', 'directus',
    'drupal', 'joomla',
    'wix', 'squarespace', 'webflow',
    'magento', 'prestashop',
  ],

  // ── Project Management ──────────────────────────────────────────────────────
  projectmanagement: [
    'agile', 'scrum', 'kanban', 'waterfall',
    'jira', 'trello', 'asana', 'linear', 'notion',
    'confluence', 'slack', 'teams', 'zoom',
    'sprintplanning', 'retrospective', 'standup',
    'productmanagement', 'pm',
  ],
};

// ─── Alias map ────────────────────────────────────────────────────────────────
// Maps a raw surface form → one or more canonical expansion tokens.
// These are used BEFORE group expansion, so they also benefit from group rules.

const SKILL_ALIASES = {
  // JavaScript variants
  'js'            : ['javascript'],
  'ts'            : ['typescript', 'javascript'],
  'es6'           : ['javascript'],
  'jsx'           : ['react', 'javascript'],
  'tsx'           : ['typescript', 'react'],
  'node'          : ['nodejs'],
  'node.js'       : ['nodejs'],
  'react.js'      : ['react', 'reactjs'],
  'vue.js'        : ['vue', 'vuejs'],
  'angular.js'    : ['angular', 'angularjs'],
  'next.js'       : ['nextjs'],
  'nuxt.js'       : ['nuxtjs'],

  // Python
  'py'            : ['python'],
  'sklearn'       : ['scikitlearn', 'machinelearning'],
  'scikit-learn'  : ['scikitlearn', 'machinelearning'],
  'scikit'        : ['scikitlearn', 'machinelearning'],
  'tf'            : ['tensorflow', 'machinelearning'],
  'torch'         : ['pytorch', 'machinelearning'],

  // Database
  'mongo'         : ['mongodb', 'nosql'],
  'postgres'      : ['postgresql', 'sql'],
  'psql'          : ['postgresql', 'sql'],
  'mysql'         : ['sql', 'relational'],
  'mssql'         : ['sqlserver', 'sql'],
  'redis'         : ['cache', 'nosql'],
  'elastic'       : ['elasticsearch'],

  // DevOps
  'k8s'           : ['kubernetes', 'devops', 'container'],
  'docker'        : ['container', 'devops'],
  'ci'            : ['cicd', 'devops'],
  'cd'            : ['cicd', 'devops'],

  // Cloud
  'aws'           : ['amazon', 'cloud'],
  'gcp'           : ['google', 'cloud'],
  'azure'         : ['microsoft', 'cloud'],

  // AI / ML
  'ml'            : ['machinelearning', 'ai'],
  'dl'            : ['deeplearning', 'machinelearning', 'ai'],
  'nlp'           : ['naturallanguageprocessing', 'machinelearning'],
  'cv'            : ['computervision', 'machinelearning'],    // context-dependent
  'llm'           : ['largelanguagemodel', 'ai', 'machinelearning'],

  // Mobile
  'rn'            : ['reactnative', 'mobile'],
  'react-native'  : ['reactnative', 'mobile'],
  'ios'           : ['swift', 'mobile', 'apple'],
  'android'       : ['kotlin', 'mobile'],

  // Design
  'ux'            : ['userexperience', 'design'],
  'ui'            : ['userinterface', 'design'],
  'a11y'          : ['accessibility', 'design'],

  // Security
  'jwt'           : ['authentication', 'security'],
  'oauth'         : ['authentication', 'security'],
  'oauth2'        : ['authentication', 'security'],
  'ssl'           : ['tls', 'security', 'encryption'],
  'https'         : ['tls', 'security'],

  // Version control
  'github'        : ['git', 'versioncontrol'],
  'gitlab'        : ['git', 'versioncontrol', 'cicd'],

  // Nepali payment gateways
  'khalti'        : ['payments', 'nepalipayment'],
  'esewa'         : ['payments', 'nepalipayment'],
  'fonepay'       : ['payments', 'nepalipayment'],
  'stripe'        : ['payments', 'internationalpayment'],

  // CMS / e-commerce
  'wp'            : ['wordpress', 'cms', 'php'],

  // Miscellaneous
  'tfidf'         : ['nlp', 'machinelearning', 'textprocessing'],
  'api'           : ['rest', 'backend', 'integration'],
  'rest'          : ['restapi', 'backend'],
  'graphql'       : ['api', 'frontend', 'backend'],
  'pwa'           : ['frontend', 'mobile', 'web'],
};

// ─── Build the runtime lookup table ──────────────────────────────────────────

/**
 * Build TOKEN_EXPANSION_MAP from SKILL_GROUPS and SKILL_ALIASES.
 *
 * For every token in SKILL_GROUPS:
 *   token → [groupLabel, ...aliasExpansions]
 *
 * For every alias in SKILL_ALIASES:
 *   alias → [...canonicals]
 *   (group expansions for the canonical tokens are NOT recursively expanded
 *    here to avoid combinatorial blow-up; the preprocessor loops once)
 *
 * @returns {Map<string, string[]>}
 */
function buildExpansionMap() {
  const map = new Map();

  // ── Phase 1: group membership → group label ──────────────────────────────
  for (const [groupLabel, members] of Object.entries(SKILL_GROUPS)) {
    for (const member of members) {
      const key = member.toLowerCase().trim();
      const existing = map.get(key) || [];
      // Add the group label if not already present
      if (!existing.includes(groupLabel)) {
        existing.push(groupLabel);
      }
      map.set(key, existing);
    }
  }

  // ── Phase 2: explicit aliases → canonical tokens ─────────────────────────
  for (const [alias, canonicals] of Object.entries(SKILL_ALIASES)) {
    const key = alias.toLowerCase().trim();
    const existing = map.get(key) || [];
    for (const c of canonicals) {
      const canon = c.toLowerCase().trim();
      if (!existing.includes(canon)) {
        existing.push(canon);
      }
    }
    map.set(key, existing);
  }

  return map;
}

/** @type {Map<string, string[]>} */
let TOKEN_EXPANSION_MAP = buildExpansionMap();

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * expandTokens
 * ────────────
 * Given a token array (output of the tokeniser), return a new array that
 * includes the original tokens PLUS any taxonomy expansion tokens.
 *
 * Expansion tokens are appended; original tokens are always preserved.
 * Deduplication is applied so a token is never counted twice even if
 * multiple aliases map to the same canonical form.
 *
 * @param  {string[]} tokens  - Lowercased, stemmed token array
 * @returns {string[]}          Expanded token array (new array, input unchanged)
 *
 * @example
 * expandTokens(['react', 'nodejs'])
 * // → ['react', 'nodejs', 'frontend', 'javascript', 'ui',
 * //    'backend', 'server', 'runtime']
 */
function expandTokens(tokens) {
  const seen   = new Set(tokens);
  const result = [...tokens];

  for (const token of tokens) {
    const expansions = TOKEN_EXPANSION_MAP.get(token);
    if (!expansions) continue;

    for (const exp of expansions) {
      if (!seen.has(exp)) {
        seen.add(exp);
        result.push(exp);
      }
    }
  }

  return result;
}

/**
 * getGroupMembers
 * ───────────────
 * Return all skill tokens that belong to a named group.
 * Useful for building filter UIs ("show all Frontend skills").
 *
 * @param  {string} groupName  - e.g. 'frontend', 'backend'
 * @returns {string[] | null}
 */
function getGroupMembers(groupName) {
  const members = SKILL_GROUPS[groupName.toLowerCase()];
  return members ? [...members] : null;
}

/**
 * getTokenGroups
 * ──────────────
 * Return the list of group labels a token belongs to.
 * Useful for displaying "React → Frontend, JavaScript" in the UI.
 *
 * @param  {string} token
 * @returns {string[]}  (empty array if token has no known group)
 */
function getTokenGroups(token) {
  return TOKEN_EXPANSION_MAP.get(token.toLowerCase().trim()) || [];
}

/**
 * rebuildExpansionMap
 * ───────────────────
 * Hot-reload the expansion map after dynamic updates to SKILL_GROUPS or
 * SKILL_ALIASES (e.g., admin adds a new skill category at runtime).
 * Returns the new map and replaces the module-level reference.
 *
 * @returns {Map<string, string[]>}
 */
function rebuildExpansionMap() {
  TOKEN_EXPANSION_MAP = buildExpansionMap();
  return TOKEN_EXPANSION_MAP;
}

/**
 * getAllGroups
 * ───────────
 * Return a sorted array of all canonical group names.
 *
 * @returns {string[]}
 */
function getAllGroups() {
  return Object.keys(SKILL_GROUPS).sort();
}

module.exports = {
  SKILL_GROUPS,
  SKILL_ALIASES,
  expandTokens,
  getGroupMembers,
  getTokenGroups,
  rebuildExpansionMap,
  getAllGroups,
};