#!/usr/bin/env node
/**
 * rebuildTfidfIndex.js
 * Administrative script – rebuilds the TF-IDF vector store for every active
 * freelancer profile.  Run manually or via a scheduled cron job.
 *
 * Usage:
 *   node server/scripts/rebuildTfidfIndex.js [--dry-run] [--batch-size=100]
 *
 * What it does:
 *   1. Connects to MongoDB (uses DB config from server/config/db.js)
 *   2. Loads all active FreelancerProfile documents
 *   3. Pre-processes each profile's skills + bio + portfolio text
 *   4. Builds a corpus-level TF-IDF vector for each profile
 *   5. Stores the serialised vector back onto the FreelancerProfile document
 *      in the `tfidfVector` field (Object map: term → weight)
 *   6. Prints a run summary to stdout
 *
 * The vectors stored here are a "pre-indexed" snapshot.  The live matching
 * service (match.service.js) always rebuilds vectors on demand for the
 * query + candidates subset, but these stored vectors let the admin monitor
 * profile coverage and re-use them in future FAISS / Annoy optimisations.
 *
 * Schema expectation (FreelancerProfile model):
 *   tfidfVector: { type: Object, default: {} }  — sparse map of term → weight
 *   lastIndexedAt: { type: Date }
 */

'use strict';

/* ─────────────────────────────────────────────
   Bootstrap: parse CLI flags
───────────────────────────────────────────── */
const args       = process.argv.slice(2);
const DRY_RUN    = args.includes('--dry-run');
const BATCH_SIZE = (() => {
  const flag = args.find(a => a.startsWith('--batch-size='));
  return flag ? Math.max(1, parseInt(flag.split('=')[1], 10)) : 100;
})();

/* ─────────────────────────────────────────────
   Dependencies
───────────────────────────────────────────── */
const mongoose = require('mongoose');
require('../config/env');                       // load .env into process.env
const connectDB         = require('../config/db');
const FreelancerProfile = require('../models/FreelancerProfile');
const { preprocess, buildTfidfVectors } = require('../services/match.service');

/* ─────────────────────────────────────────────
   Logging helpers
───────────────────────────────────────────── */
const ts  = () => new Date().toISOString();
const log = (...args) => console.log(`[${ts()}]`, ...args);
const err = (...args) => console.error(`[${ts()}] ERROR`, ...args);

/* ─────────────────────────────────────────────
   Batch array utility
───────────────────────────────────────────── */
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/* ─────────────────────────────────────────────
   Build a text document for a single profile
───────────────────────────────────────────── */
function profileToText(profile) {
  const parts = [
    (profile.skills || []).join(' '),
    profile.bio       || '',
    (profile.portfolio || [])
      .map(item => `${item.title || ''} ${item.description || ''} ${(item.skills || []).join(' ')}`)
      .join(' '),
  ];
  return parts.join(' ');
}

/* ─────────────────────────────────────────────
   Main routine
───────────────────────────────────────────── */
async function rebuildIndex() {
  const startTime = Date.now();
  log('═══════════════════════════════════════════════');
  log('Task Tide – TF-IDF Index Rebuild');
  if (DRY_RUN) log('⚠  DRY RUN – no writes will be performed');
  log('Batch size:', BATCH_SIZE);
  log('═══════════════════════════════════════════════');

  // ── Connect ───────────────────────────────────
  await connectDB();
  log('Database connected');

  // ── Load all active profiles ──────────────────
  const profiles = await FreelancerProfile.find({ isActive: { $ne: false } })
    .select('_id skills bio portfolio')
    .lean();

  const total = profiles.length;
  log(`Profiles loaded: ${total}`);

  if (total === 0) {
    log('No active profiles found. Nothing to index.');
    await mongoose.disconnect();
    return;
  }

  // ── Build corpus-level TF-IDF ─────────────────
  // We process ALL profiles as a single corpus so IDF values reflect the
  // full vocabulary distribution, then store each profile's vector.
  log('Building corpus documents…');

  const corpusDocs = profiles.map(p => ({
    id:     p._id.toString(),
    tokens: preprocess(profileToText(p)),
  }));

  // Report profiles with empty token sets
  const empty = corpusDocs.filter(d => d.tokens.length === 0);
  if (empty.length > 0) {
    log(`⚠  ${empty.length} profile(s) produced zero tokens (no skills / bio data).`);
  }

  log('Vectorising corpus (TF-IDF)…');
  const { vocabulary, vectors } = buildTfidfVectors(corpusDocs);
  log(`Vocabulary size: ${vocabulary.length} unique terms`);

  // ── Persist vectors in batches ────────────────
  const batches      = chunkArray(profiles, BATCH_SIZE);
  let   updated      = 0;
  let   skipped      = 0;
  let   batchIndex   = 0;

  for (const batch of batches) {
    batchIndex++;
    log(`Processing batch ${batchIndex}/${batches.length} (${batch.length} profiles)…`);

    const bulkOps = [];

    for (const profile of batch) {
      const id     = profile._id.toString();
      const vec    = vectors.get(id);

      if (!vec) {
        skipped++;
        continue;
      }

      // Convert Float64Array to a sparse plain object (term → weight)
      // Only store non-zero entries to keep the document lean.
      const sparseVector = {};
      for (let i = 0; i < vocabulary.length; i++) {
        if (vec[i] > 0) sparseVector[vocabulary[i]] = parseFloat(vec[i].toFixed(6));
      }

      bulkOps.push({
        updateOne: {
          filter: { _id: profile._id },
          update: {
            $set: {
              tfidfVector:   sparseVector,
              lastIndexedAt: new Date(),
            },
          },
        },
      });
      updated++;
    }

    if (!DRY_RUN && bulkOps.length > 0) {
      await FreelancerProfile.bulkWrite(bulkOps, { ordered: false });
    } else if (DRY_RUN) {
      log(`  [dry-run] Would write ${bulkOps.length} profile(s)`);
    }
  }

  // ── Summary ───────────────────────────────────
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  log('═══════════════════════════════════════════════');
  log('Rebuild complete');
  log(`  Total profiles  : ${total}`);
  log(`  Updated         : ${updated}`);
  log(`  Skipped (empty) : ${skipped}`);
  log(`  Vocabulary size : ${vocabulary.length}`);
  log(`  Elapsed         : ${elapsed}s`);
  if (DRY_RUN) log('  No writes performed (--dry-run)');
  log('═══════════════════════════════════════════════');

  await mongoose.disconnect();
  log('Database disconnected. Done.');
}

/* ─────────────────────────────────────────────
   Entry point
───────────────────────────────────────────── */
rebuildIndex().catch(e => {
  err('Unhandled error in rebuildTfidfIndex:', e);
  process.exit(1);
});