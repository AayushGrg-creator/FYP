/**
 * tfidf.js
 * TaskTide AI Pipeline – TF-IDF vectorisation engine
 *
 * Overview
 * ────────
 * This module implements a complete TF-IDF (Term Frequency–Inverse Document
 * Frequency) engine from scratch using only JavaScript's built-in Math object.
 * No external NLP libraries are used.
 *
 * What it does
 * ────────────
 * 1. Maintains an in-memory corpus of documents (freelancer profile token
 *    arrays) as the "background" collection for IDF calculation.
 * 2. Computes a sparse term→weight Map for any document (query or profile).
 * 3. Supports incremental document addition and full corpus rebuild.
 * 4. Provides a helper to vectorise a query document against the fitted corpus.
 *
 * TF-IDF formula used
 * ────────────────────
 * TF(t, d)  = count(t in d) / |d|             (raw term frequency, normalised)
 * IDF(t)    = ln( (N + 1) / (df(t) + 1) ) + 1  (smoothed IDF, sklearn convention)
 *               where N = corpus size, df(t) = number of docs containing t
 *             The +1 additive smoothing prevents zero-division for unseen terms
 *             and the trailing +1 keeps IDF ≥ 1 so TF-IDF is never zero for a
 *             present term.
 * TFIDF(t,d)= TF(t,d) × IDF(t)
 *
 * L2-normalisation (unit vector)
 * ──────────────────────────────
 * Each document vector is L2-normalised before storage so cosine similarity
 * reduces to a plain dot-product, which is faster to compute and numerically
 * stable.  When l2Normalise = false is passed, raw TF-IDF weights are returned.
 *
 * Sparse representation
 * ─────────────────────
 * Vectors are stored as Map<string, number> (term → weight) rather than dense
 * Float64Array because the vocabulary can exceed 10,000 terms while individual
 * documents typically contain 30–200 unique tokens.  The dot-product in
 * cosineSimilarity.js iterates over the smaller map, so sparsity is a win.
 *
 * Thread safety
 * ─────────────
 * Node.js is single-threaded; no locking is needed.  Corpus mutations
 * (addDocument, rebuildIndex) are synchronous and complete atomically.
 *
 * Data flow in TaskTide
 * ─────────────────────
 *  scripts/rebuildTfidfIndex.js
 *    → loads all FreelancerProfile docs from MongoDB
 *    → calls engine.fit(profiles)
 *    → stores each profile's tfidfVector back to MongoDB
 *
 *  match.service.js (per request)
 *    → calls engine.vectorise(jobTokens)            (query vector)
 *    → retrieves freelancer vectors from MongoDB     (pre-computed)
 *    → passes both to cosineSimilarity.computeScore()
 */

'use strict';

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * _termFrequency
 * ──────────────
 * Compute TF for all terms in a token array.
 * Returns a Map<string, number> of raw normalised frequencies.
 *
 * @param  {string[]} tokens
 * @returns {Map<string, number>}
 */
function _termFrequency(tokens) {
  const tf  = new Map();
  const len = tokens.length;

  if (len === 0) return tf;

  for (const token of tokens) {
    tf.set(token, (tf.get(token) || 0) + 1);
  }

  // Normalise by document length
  for (const [term, count] of tf) {
    tf.set(term, count / len);
  }

  return tf;
}

/**
 * _l2Norm
 * ───────
 * Compute the L2 (Euclidean) magnitude of a Map<string, number> vector.
 *
 * @param  {Map<string, number>} vec
 * @returns {number}
 */
function _l2Norm(vec) {
  let sumSq = 0;
  for (const weight of vec.values()) {
    sumSq += weight * weight;
  }
  return Math.sqrt(sumSq);
}

/**
 * _normaliseVector
 * ────────────────
 * Divide every weight in a Map vector by its L2 norm in-place.
 * Returns the same Map (mutated).
 *
 * @param  {Map<string, number>} vec
 * @returns {Map<string, number>}
 */
function _normaliseVector(vec) {
  const norm = _l2Norm(vec);
  if (norm === 0) return vec;   // zero vector – leave untouched

  for (const [term, weight] of vec) {
    vec.set(term, weight / norm);
  }
  return vec;
}

// ─── TfidfEngine class ────────────────────────────────────────────────────────

class TfidfEngine {
  /**
   * @param {object} [options]
   * @param {boolean} [options.l2Normalise=true]
   *   L2-normalise document vectors. Set to false only for debugging.
   * @param {number} [options.minDf=1]
   *   Minimum document frequency for a term to be included in the vocabulary.
   *   Terms appearing in fewer than minDf documents are excluded from IDF calc.
   *   Set to 2 to ignore singleton terms (reduces noise, smaller vocabulary).
   * @param {number} [options.maxDfRatio=0.95]
   *   Maximum document-frequency ratio.  Terms appearing in > 95% of documents
   *   are excluded (they behave like stopwords at the corpus level).
   */
  constructor(options = {}) {
    const {
      l2Normalise  = true,
      minDf        = 1,
      maxDfRatio   = 0.95,
    } = options;

    this._l2Normalise = l2Normalise;
    this._minDf       = minDf;
    this._maxDfRatio  = maxDfRatio;

    // ── Corpus state ────────────────────────────────────────────────────────
    /** @type {Map<string, string[]>}  docId → token[] */
    this._documents = new Map();

    /** @type {Map<string, number>}   term → document-frequency count */
    this._df = new Map();

    /** @type {Map<string, number>}   term → IDF weight (rebuilt on fit/rebuild) */
    this._idf = new Map();

    /** @type {Set<string>}           vocabulary after df filtering */
    this._vocabulary = new Set();

    /** @type {boolean} */
    this._fitted = false;
  }

  // ── Corpus management ──────────────────────────────────────────────────────

  /**
   * fit
   * ───
   * Build the corpus from an array of (id, tokens) pairs and compute IDF.
   * Replaces any previous corpus state entirely.
   *
   * @param {Array<{ id: string, tokens: string[] }>} documents
   * @returns {this}  (chainable)
   *
   * @example
   * engine.fit([
   *   { id: 'user_1', tokens: ['react', 'javascript', 'frontend'] },
   *   { id: 'user_2', tokens: ['nodejs', 'backend', 'mongodb'] },
   * ]);
   */
  fit(documents) {
    if (!Array.isArray(documents)) {
      throw new TypeError('fit() expects an array of { id, tokens } objects.');
    }

    // Reset state
    this._documents.clear();
    this._df.clear();
    this._idf.clear();
    this._vocabulary.clear();
    this._fitted = false;

    // Load documents and accumulate DF counts
    for (const doc of documents) {
      if (!doc.id || !Array.isArray(doc.tokens)) {
        throw new TypeError('Each document must have { id: string, tokens: string[] }.');
      }
      this._documents.set(String(doc.id), doc.tokens);
      const uniqueTerms = new Set(doc.tokens);
      for (const term of uniqueTerms) {
        this._df.set(term, (this._df.get(term) || 0) + 1);
      }
    }

    this._computeIdf();
    this._fitted = true;
    return this;
  }

  /**
   * addDocument
   * ───────────
   * Incrementally add a single document to the corpus and update IDF weights.
   * Use this for live additions (e.g., new freelancer joins the platform)
   * without a full rebuild.
   *
   * NOTE: IDF weights change whenever a new document is added, so previously
   * computed vectors become slightly stale.  Run `rebuildVectors()` or
   * schedule `scripts/rebuildTfidfIndex.js` to resync stored vectors.
   *
   * @param {string}   id
   * @param {string[]} tokens
   * @returns {this}
   */
  addDocument(id, tokens) {
    if (!id || !Array.isArray(tokens)) {
      throw new TypeError('addDocument(id: string, tokens: string[])');
    }

    const docId = String(id);
    const oldTokens = this._documents.get(docId);

    // If the document already exists, subtract its old DF contributions first
    if (oldTokens) {
      const oldUnique = new Set(oldTokens);
      for (const term of oldUnique) {
        const prev = this._df.get(term) || 0;
        if (prev <= 1) this._df.delete(term);
        else           this._df.set(term, prev - 1);
      }
    }

    // Store new token list
    this._documents.set(docId, tokens);

    // Add new DF contributions
    const newUnique = new Set(tokens);
    for (const term of newUnique) {
      this._df.set(term, (this._df.get(term) || 0) + 1);
    }

    // Recompute IDF with updated DF table
    this._computeIdf();
    this._fitted = this._documents.size > 0;
    return this;
  }

  /**
   * removeDocument
   * ──────────────
   * Remove a document from the corpus (e.g., user account deleted).
   *
   * @param {string} id
   * @returns {boolean} true if the document existed and was removed
   */
  removeDocument(id) {
    const docId = String(id);
    const tokens = this._documents.get(docId);
    if (!tokens) return false;

    const unique = new Set(tokens);
    for (const term of unique) {
      const prev = this._df.get(term) || 0;
      if (prev <= 1) this._df.delete(term);
      else           this._df.set(term, prev - 1);
    }

    this._documents.delete(docId);
    this._computeIdf();
    this._fitted = this._documents.size > 0;
    return true;
  }

  /**
   * rebuildIndex
   * ────────────
   * Recompute IDF weights from scratch using the current corpus state.
   * Call this after bulk addDocument() calls to avoid redundant per-call
   * IDF recomputation.
   *
   * @returns {this}
   */
  rebuildIndex() {
    // Recompute DF table from scratch (handles any inconsistency)
    this._df.clear();
    for (const tokens of this._documents.values()) {
      const unique = new Set(tokens);
      for (const term of unique) {
        this._df.set(term, (this._df.get(term) || 0) + 1);
      }
    }
    this._computeIdf();
    this._fitted = this._documents.size > 0;
    return this;
  }

  // ── Internal IDF computation ───────────────────────────────────────────────

  /**
   * _computeIdf
   * ───────────
   * Rebuild the IDF map and vocabulary from the current DF table.
   *
   * Formula: IDF(t) = ln( (N+1) / (df(t)+1) ) + 1
   *   where N = |documents|
   *
   * Terms are excluded from the vocabulary if:
   *   df(t) < minDf                         (too rare)
   *   df(t) / N > maxDfRatio                (too common = corpus-level stopword)
   */
  _computeIdf() {
    this._idf.clear();
    this._vocabulary.clear();

    const N         = this._documents.size;
    const minDf     = this._minDf;
    const maxDfAbs  = Math.floor(this._maxDfRatio * N);

    for (const [term, df] of this._df) {
      // Apply frequency filters
      if (df < minDf)        continue;
      if (df > maxDfAbs && N > 1) continue;

      const idfWeight = Math.log((N + 1) / (df + 1)) + 1;
      this._idf.set(term, idfWeight);
      this._vocabulary.add(term);
    }
  }

  // ── Vectorisation ──────────────────────────────────────────────────────────

  /**
   * vectorise
   * ─────────
   * Compute the TF-IDF vector for a token array, using the fitted IDF weights.
   *
   * This is the workhorse called at query time (for the job description) and
   * at index time (for each freelancer profile).
   *
   * Terms that are not in the fitted vocabulary receive weight 0 and are
   * omitted from the sparse output map.
   *
   * @param  {string[]} tokens          - Pre-processed token array
   * @param  {boolean}  [normalise=true] - L2-normalise the output vector
   *                                       (overrides constructor option when set)
   * @returns {Map<string, number>}       Sparse TF-IDF vector
   */
  vectorise(tokens, normalise) {
    this._assertFitted();

    if (!Array.isArray(tokens) || tokens.length === 0) {
      return new Map();
    }

    const shouldNorm = normalise !== undefined ? normalise : this._l2Normalise;
    const tf         = _termFrequency(tokens);
    const vec        = new Map();

    for (const [term, tfWeight] of tf) {
      const idfWeight = this._idf.get(term);
      if (idfWeight === undefined) continue;   // term not in vocabulary

      vec.set(term, tfWeight * idfWeight);
    }

    if (shouldNorm) {
      _normaliseVector(vec);
    }

    return vec;
  }

  /**
   * vectoriseQuery
   * ──────────────
   * Like vectorise() but uses a relaxed IDF lookup: if a query term is not
   * in the fitted vocabulary (e.g., very new skill), it falls back to an IDF
   * of ln((N+1)/1)+1 (as if it appeared once in the corpus) rather than
   * dropping the term entirely.
   *
   * This prevents job descriptions for emerging technologies from producing
   * zero-weight vectors.
   *
   * @param  {string[]} tokens
   * @returns {Map<string, number>}
   */
  vectoriseQuery(tokens) {
    this._assertFitted();

    if (!Array.isArray(tokens) || tokens.length === 0) {
      return new Map();
    }

    const N  = this._documents.size;
    const tf = _termFrequency(tokens);
    const vec = new Map();

    for (const [term, tfWeight] of tf) {
      let idfWeight = this._idf.get(term);

      if (idfWeight === undefined) {
        // Fallback: treat as if df = 0 (never seen in corpus)
        idfWeight = Math.log((N + 1) / 1) + 1;
      }

      vec.set(term, tfWeight * idfWeight);
    }

    _normaliseVector(vec);
    return vec;
  }

  /**
   * getDocumentVector
   * ─────────────────
   * Re-compute the TF-IDF vector for an already-indexed document.
   * Useful for reading out freshly-computed vectors after fit() or addDocument().
   *
   * @param  {string} id
   * @returns {Map<string, number> | null}  null if document not in corpus
   */
  getDocumentVector(id) {
    const tokens = this._documents.get(String(id));
    if (!tokens) return null;
    return this.vectorise(tokens);
  }

  /**
   * getAllDocumentVectors
   * ─────────────────────
   * Return an iterator of [id, vector] pairs for all corpus documents.
   * Used by the rebuild script to push updated vectors to MongoDB.
   *
   * @returns {IterableIterator<[string, Map<string, number>]>}
   */
  * getAllDocumentVectors() {
    this._assertFitted();
    for (const [id, tokens] of this._documents) {
      yield [id, this.vectorise(tokens)];
    }
  }

  // ── Serialisation helpers ──────────────────────────────────────────────────

  /**
   * vectorToObject
   * ──────────────
   * Convert a sparse Map vector to a plain object for MongoDB storage.
   * MongoDB cannot store Map instances natively.
   *
   * @param  {Map<string, number>} vec
   * @returns {Record<string, number>}
   */
  static vectorToObject(vec) {
    const obj = Object.create(null);
    for (const [term, weight] of vec) {
      obj[term] = weight;
    }
    return obj;
  }

  /**
   * objectToVector
   * ──────────────
   * Reconstruct a Map vector from a plain MongoDB object.
   *
   * @param  {Record<string, number>} obj
   * @returns {Map<string, number>}
   */
  static objectToVector(obj) {
    const vec = new Map();
    if (!obj || typeof obj !== 'object') return vec;
    for (const [term, weight] of Object.entries(obj)) {
      if (typeof weight === 'number' && isFinite(weight)) {
        vec.set(term, weight);
      }
    }
    return vec;
  }

  // ── Introspection / debugging ─────────────────────────────────────────────

  /**
   * getStats
   * ────────
   * Return a summary of the current engine state.
   *
   * @returns {{ corpusSize, vocabularySize, fitted }}
   */
  getStats() {
    return {
      corpusSize     : this._documents.size,
      vocabularySize : this._vocabulary.size,
      fitted         : this._fitted,
    };
  }

  /**
   * getTopTerms
   * ───────────
   * Return the N highest-IDF terms in the vocabulary.
   * High IDF = rare, distinctive terms (great for debugging relevance).
   *
   * @param  {number} [n=20]
   * @returns {Array<{ term: string, idf: number }>}
   */
  getTopTerms(n = 20) {
    return [...this._idf.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([term, idf]) => ({ term, idf: Math.round(idf * 10000) / 10000 }));
  }

  /**
   * getTermIdf
   * ──────────
   * Return the IDF weight for a single term (for debugging).
   *
   * @param  {string} term
   * @returns {number | null}  null if term is not in the vocabulary
   */
  getTermIdf(term) {
    const weight = this._idf.get(term.toLowerCase());
    return weight !== undefined ? weight : null;
  }

  /**
   * hasDocument
   * ───────────
   * @param  {string} id
   * @returns {boolean}
   */
  hasDocument(id) {
    return this._documents.has(String(id));
  }

  /**
   * getVocabulary
   * ─────────────
   * @returns {string[]}  Sorted vocabulary array
   */
  getVocabulary() {
    return [...this._vocabulary].sort();
  }

  // ── Private guards ────────────────────────────────────────────────────────

  _assertFitted() {
    if (!this._fitted) {
      throw new Error(
        'TfidfEngine: engine has not been fitted. Call fit() or addDocument() first.'
      );
    }
  }
}

// ─── Singleton instance used by match.service.js ─────────────────────────────
// A single shared engine is sufficient because Node.js is single-threaded
// and the corpus is rebuilt by a background script, not per-request.

const defaultEngine = new TfidfEngine({
  l2Normalise : true,
  minDf       : 1,
  maxDfRatio  : 0.95,
});

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  TfidfEngine,
  defaultEngine,
};