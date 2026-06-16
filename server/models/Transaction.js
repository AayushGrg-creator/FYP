const mongoose = require('mongoose');

// ─── Sub-schemas ──────────────────────────────────────────────────────────────

/**
 * Immutable audit trail for every state change on a transaction.
 * Stored as a subdocument array so the full lifecycle is always visible.
 */
const statusEventSchema = new mongoose.Schema(
  {
    status:    { type: String, required: true },
    timestamp: { type: Date,   default: Date.now },
    note:      { type: String, maxlength: 500 },
    // Raw gateway payload snapshot at the moment of the transition
    gatewayPayload: { type: mongoose.Schema.Types.Mixed },
  },
  { _id: false }
);

/**
 * Structured Khalti / Stripe error envelope so we never lose
 * the original error body from either gateway.
 */
const gatewayErrorSchema = new mongoose.Schema(
  {
    code:    { type: String },
    message: { type: String },
    detail:  { type: mongoose.Schema.Types.Mixed },
    // HTTP status code returned by the gateway
    httpStatus: { type: Number },
    // ISO timestamp of when the error was captured
    capturedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

// ─── Main schema ──────────────────────────────────────────────────────────────

const transactionSchema = new mongoose.Schema(
  {
    // ── Relational refs ──────────────────────────────────────────────────────
    project: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Project',
      required: true,
      index:    true,
    },
    milestone: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'Milestone',
      // Optional: top-level project funding has no milestone yet
    },
    payer: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },
    receiver: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      index:    true,
    },

    // ── Money ────────────────────────────────────────────────────────────────
    /**
     * amount is always stored in the smallest currency unit (paisa for NPR,
     * cents for USD) to avoid floating-point rounding across services.
     */
    amount: {
      type:     Number,
      required: true,
      min:      [1, 'Amount must be at least 1 unit'],
    },
    /**
     * Human-readable amount in major currency units (NPR or USD).
     * Stored separately so display logic never needs to divide.
     */
    amountDisplay: {
      type:     Number,
      required: true,
      min:      [0.01, 'Display amount must be positive'],
    },
    currency: {
      type:     String,
      required: true,
      uppercase: true,
      enum:     ['NPR', 'USD'],
      default:  'NPR',
    },

    // ── Platform fee ─────────────────────────────────────────────────────────
    platformFeePercent: {
      type:    Number,
      default: 8,
      min:     0,
      max:     100,
    },
    platformFeeAmount: {
      type:    Number,
      default: 0,
    },
    netAmount: {
      // amount received by freelancer after fee deduction (display units)
      type:    Number,
      default: 0,
    },

    // ── Gateway ───────────────────────────────────────────────────────────────
    gateway: {
      type:     String,
      required: true,
      enum:     ['khalti', 'stripe'],
      index:    true,
    },
    /**
     * The stable identifier the gateway uses for this charge.
     *   - Khalti  → pidx (payment index from initiation response)
     *   - Stripe  → PaymentIntent id  (pi_xxx)  or  Checkout Session id (cs_xxx)
     */
    gatewayTransactionId: {
      type:  String,
      index: true,
      // Not required at creation time; set once the gateway confirms
    },
    /**
     * Secondary gateway reference used in verification flows.
     *   - Khalti  → transaction_id from lookup response
     *   - Stripe  → charge id (ch_xxx)
     */
    gatewayChargeId: {
      type: String,
    },
    /**
     * Full raw initiation payload from the gateway (stored for audit / replay).
     */
    gatewayInitPayload: {
      type: mongoose.Schema.Types.Mixed,
    },
    /**
     * Full raw verification/webhook payload from the gateway.
     */
    gatewayVerifyPayload: {
      type: mongoose.Schema.Types.Mixed,
    },
    /**
     * Structured error object – populated when status is 'failed'.
     */
    gatewayError: gatewayErrorSchema,

    // ── Idempotency ───────────────────────────────────────────────────────────
    /**
     * Caller-supplied idempotency key (UUID v4).
     * Prevents double-charging when network retries occur.
     */
    idempotencyKey: {
      type:   String,
      unique: true,
      sparse: true,   // allows null for older records without the field
      index:  true,
    },

    // ── Status & lifecycle ────────────────────────────────────────────────────
    status: {
      type:    String,
      required: true,
      enum:    ['pending', 'escrowed', 'released', 'refunded', 'failed', 'disputed'],
      default: 'pending',
      index:   true,
    },
    /**
     * Full ordered audit trail of every status transition.
     * The current status is always the last element's status.
     */
    statusHistory: [statusEventSchema],

    // ── Timestamps for each key lifecycle event ───────────────────────────────
    initiatedAt:  { type: Date },
    escrowedAt:   { type: Date },
    releasedAt:   { type: Date },
    refundedAt:   { type: Date },
    failedAt:     { type: Date },
    disputedAt:   { type: Date },

    // ── Webhook deduplication ─────────────────────────────────────────────────
    /**
     * Set of webhook event IDs already processed for this transaction.
     * Used to implement idempotent webhook handling.
     */
    processedWebhookIds: {
      type:    [String],
      default: [],
    },

    // ── Metadata ──────────────────────────────────────────────────────────────
    description: {
      type:      String,
      maxlength: 500,
    },
    /**
     * Free-form key/value bag for gateway-specific fields that don't map
     * cleanly to the schema above (e.g. Stripe customer id, Khalti merchant).
     */
    meta: {
      type:    mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,   // adds createdAt / updatedAt
    // Optimistic concurrency control – prevents two simultaneous saves from
    // silently clobbering each other's status updates
    optimisticConcurrency: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Fast lookup: all transactions for a project × status (dashboard queries)
transactionSchema.index({ project: 1, status: 1 });

// Fast lookup: all transactions sent/received by a user
transactionSchema.index({ payer: 1, createdAt: -1 });
transactionSchema.index({ receiver: 1, createdAt: -1 });

// Prevent duplicate gateway tx ids per gateway
transactionSchema.index(
  { gateway: 1, gatewayTransactionId: 1 },
  { unique: true, sparse: true }
);

// ─── Virtuals ─────────────────────────────────────────────────────────────────

transactionSchema.virtual('isTerminal').get(function () {
  return ['released', 'refunded', 'failed'].includes(this.status);
});

// ─── Instance methods ─────────────────────────────────────────────────────────

/**
 * Push a new event onto statusHistory and update the top-level status +
 * the corresponding lifecycle timestamp atomically.
 */
transactionSchema.methods.recordStatusChange = function (
  newStatus,
  { note = '', gatewayPayload = null } = {}
) {
  const TIMESTAMP_FIELD = {
    pending:   'initiatedAt',
    escrowed:  'escrowedAt',
    released:  'releasedAt',
    refunded:  'refundedAt',
    failed:    'failedAt',
    disputed:  'disputedAt',
  };

  this.status = newStatus;
  this.statusHistory.push({ status: newStatus, note, gatewayPayload });

  const tsField = TIMESTAMP_FIELD[newStatus];
  if (tsField && !this[tsField]) {
    this[tsField] = new Date();
  }
};

/**
 * Calculate and set platform fee + net amount based on amountDisplay.
 */
transactionSchema.methods.computeFees = function () {
  const fee = parseFloat(
    ((this.amountDisplay * this.platformFeePercent) / 100).toFixed(2)
  );
  this.platformFeeAmount = fee;
  this.netAmount         = parseFloat((this.amountDisplay - fee).toFixed(2));
};

/**
 * Mark a gateway webhook event id as processed and return false if it was
 * already seen (so callers can skip duplicate processing).
 */
transactionSchema.methods.markWebhookProcessed = function (eventId) {
  if (this.processedWebhookIds.includes(eventId)) return false;
  this.processedWebhookIds.push(eventId);
  return true;
};

// ─── Static helpers ───────────────────────────────────────────────────────────

/**
 * Find an existing transaction by idempotency key.
 * Returns null if no match.
 */
transactionSchema.statics.findByIdempotencyKey = function (key) {
  return this.findOne({ idempotencyKey: key });
};

/**
 * Find a transaction by gateway + gatewayTransactionId (safe lookup).
 */
transactionSchema.statics.findByGatewayId = function (gateway, gatewayTxId) {
  return this.findOne({ gateway, gatewayTransactionId: gatewayTxId });
};

// ─── Pre-save hook ────────────────────────────────────────────────────────────

transactionSchema.pre('save', function (next) {
  // Always keep fees in sync whenever amount changes
  if (this.isModified('amountDisplay') || this.isModified('platformFeePercent')) {
    this.computeFees();
  }
  // Seed statusHistory on first save
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({ status: this.status, note: 'Transaction created' });
    const ts = { pending: 'initiatedAt' }[this.status];
    if (ts) this[ts] = new Date();
  }
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema)