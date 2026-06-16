/**
 * payment.service.js
 *
 * Central orchestrator for TaskTide's escrow payment lifecycle.
 *
 * Lifecycle per project:
 *   1. Client initiates escrow funding  → Transaction(status:'pending')
 *   2. Gateway confirms payment         → Transaction(status:'escrowed')
 *   3. Freelancer submits milestone     → (no transaction change)
 *   4. Client approves milestone        → Transaction(status:'released'), funds transferred
 *   5. Either party raises dispute      → Transaction(status:'disputed')
 *   6. Admin resolves → refund or release
 *
 * All monetary operations are wrapped in idempotency-key checks so retries
 * never produce duplicate charges or double-releases.
 */

const mongoose  = require('mongoose');
const Transaction = require('../models/Transaction');
const Project     = require('../models/Project');
const Milestone   = require('../models/Milestone');
const User        = require('../models/User');

const khaltiSvc = require('./khalti.service');
const stripeSvc = require('./stripe.service');
const { sendNotification } = require('./notification.service');
const { generateIdempotencyKey } = require('../utils/idempotency');

// ─── Constants ────────────────────────────────────────────────────────────────

const PLATFORM_FEE_PERCENT = 8;  // 8 % platform fee retained on release

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Tag an error with an HTTP status code for the error-handler middleware.
 */
function err(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

/**
 * Verify a project exists and belongs to the calling user (client).
 * Returns the project document.
 */
async function assertClientOwnsProject(projectId, clientId) {
  const project = await Project.findById(projectId).lean();
  if (!project)                                        throw err('Project not found', 404);
  if (String(project.clientId) !== String(clientId))  throw err('Forbidden', 403);
  return project;
}

/**
 * Retrieve the payer (client) and receiver (freelancer) User docs from a project.
 */
async function getProjectParties(project) {
  const [payer, receiver] = await Promise.all([
    User.findById(project.clientId).select('name email phone').lean(),
    User.findById(project.freelancerId).select('name email stripeAccountId').lean(),
  ]);
  if (!payer)    throw err('Client user not found', 404);
  if (!receiver) throw err('Freelancer user not found', 404);
  return { payer, receiver };
}

// ─── 1. Initiate escrow funding ───────────────────────────────────────────────

/**
 * Initiate a Khalti checkout to fund the project escrow.
 *
 * Creates a pending Transaction and returns the Khalti payment URL.
 * The transaction status moves to 'escrowed' once the webhook/return confirms.
 *
 * @param {string} projectId
 * @param {string} clientId       – authenticated user id
 * @param {string} [idempotencyKey]
 * @returns {{ transaction, paymentUrl, pidx }}
 */
async function initiateKhaltiEscrow(projectId, clientId, idempotencyKey) {
  const project = await assertClientOwnsProject(projectId, clientId);

  if (!['unfunded', 'failed'].includes(project.escrowStatus)) {
    throw err(`Cannot initiate payment – escrow is '${project.escrowStatus}'`);
  }

  const iKey = idempotencyKey
    || generateIdempotencyKey(String(clientId), String(projectId), 'khalti-escrow');

  // Idempotency: return existing pending transaction if already initiated
  const existing = await Transaction.findByIdempotencyKey(iKey);
  if (existing && existing.status === 'pending') {
    return {
      transaction: existing,
      paymentUrl:  existing.gatewayInitPayload?.paymentUrl,
      pidx:        existing.gatewayInitPayload?.pidx,
    };
  }

  const { payer } = await getProjectParties(project);

  // Kick off Khalti session
  const initResult = await khaltiSvc.initiatePayment({
    amountNPR:          project.agreedAmount,
    purchaseOrderId:    iKey,
    purchaseOrderName:  `TaskTide Escrow – ${project._id}`,
    customerName:       payer.name,
    customerEmail:      payer.email,
    customerPhone:      payer.phone,
  });

  // Create ledger entry
  const tx = await Transaction.create({
    project:            project._id,
    payer:              project.clientId,
    receiver:           project.freelancerId,
    amount:             Math.round(project.agreedAmount * 100),   // paisa
    amountDisplay:      project.agreedAmount,
    currency:           'NPR',
    gateway:            'khalti',
    gatewayTransactionId: initResult.pidx,
    idempotencyKey:     iKey,
    status:             'pending',
    description:        `Escrow funding for project ${project._id}`,
    gatewayInitPayload: initResult,
    platformFeePercent: PLATFORM_FEE_PERCENT,
  });

  return { transaction: tx, paymentUrl: initResult.paymentUrl, pidx: initResult.pidx };
}

/**
 * Initiate a Stripe Checkout Session to fund the project escrow.
 *
 * @param {string} projectId
 * @param {string} clientId
 * @param {string} [idempotencyKey]
 * @returns {{ transaction, checkoutUrl, sessionId }}
 */
async function initiateStripeEscrow(projectId, clientId, idempotencyKey) {
  const project = await assertClientOwnsProject(projectId, clientId);

  if (!['unfunded', 'failed'].includes(project.escrowStatus)) {
    throw err(`Cannot initiate payment – escrow is '${project.escrowStatus}'`);
  }

  const iKey = idempotencyKey
    || generateIdempotencyKey(String(clientId), String(projectId), 'stripe-escrow');

  const existing = await Transaction.findByIdempotencyKey(iKey);
  if (existing && existing.status === 'pending') {
    return {
      transaction: existing,
      checkoutUrl: existing.gatewayInitPayload?.checkoutUrl,
      sessionId:   existing.gatewayInitPayload?.sessionId,
    };
  }

  const { payer } = await getProjectParties(project);

  const sessionResult = await stripeSvc.createCheckoutSession({
    amountUSD:        project.agreedAmount,
    purchaseOrderId:  iKey,
    description:      `TaskTide Escrow – Project ${project._id}`,
    customerEmail:    payer.email,
    idempotencyKey:   iKey,
    metadata: {
      projectId:  String(project._id),
      clientId:   String(clientId),
    },
  });

  const tx = await Transaction.create({
    project:            project._id,
    payer:              project.clientId,
    receiver:           project.freelancerId,
    amount:             Math.round(project.agreedAmount * 100),   // cents
    amountDisplay:      project.agreedAmount,
    currency:           'USD',
    gateway:            'stripe',
    gatewayTransactionId: sessionResult.sessionId,
    idempotencyKey:     iKey,
    status:             'pending',
    description:        `Escrow funding for project ${project._id}`,
    gatewayInitPayload: sessionResult,
    platformFeePercent: PLATFORM_FEE_PERCENT,
    meta: {
      paymentIntentId: sessionResult.paymentIntentId,
    },
  });

  return { transaction: tx, checkoutUrl: sessionResult.checkoutUrl, sessionId: sessionResult.sessionId };
}

// ─── 2. Confirm escrow (webhook / return URL) ─────────────────────────────────

/**
 * Confirm a Khalti payment after the user returns from the Khalti UI.
 * Should be called with the pidx from the return URL query param.
 *
 * @param {string} pidx             – from return URL
 * @param {string} purchaseOrderId  – our idempotency key (also in return URL)
 * @returns {Transaction}
 */
async function confirmKhaltiEscrow(pidx, purchaseOrderId) {
  const tx = await Transaction.findOne({
    gateway:              'khalti',
    gatewayTransactionId: pidx,
  });
  if (!tx) throw err(`No pending transaction found for pidx ${pidx}`, 404);
  if (tx.status === 'escrowed') return tx;   // idempotent
  if (tx.status !== 'pending')  throw err(`Transaction is already ${tx.status}`);

  // Server-side verification
  const lookup = await khaltiSvc.lookupPayment(pidx);

  if (lookup.statusCode !== 'completed') {
    // Mark failed and save – do not throw; let caller decide response
    tx.recordStatusChange('failed', {
      note:           `Khalti lookup returned status '${lookup.status}'`,
      gatewayPayload: lookup.raw,
    });
    tx.gatewayVerifyPayload = lookup.raw;
    tx.gatewayError = {
      code:    'PAYMENT_NOT_COMPLETED',
      message: `Khalti status: ${lookup.status}`,
      detail:  lookup.raw,
    };
    await tx.save();
    return tx;
  }

  // Amount sanity check (tolerance for paisa rounding)
  if (lookup.amountNPR && Math.abs(lookup.amountNPR - tx.amountDisplay) > 1) {
    tx.recordStatusChange('failed', {
      note: `Amount mismatch: expected ${tx.amountDisplay} NPR, got ${lookup.amountNPR} NPR`,
      gatewayPayload: lookup.raw,
    });
    await tx.save();
    throw err('Payment amount mismatch – potential tampering detected', 400);
  }

  // All good – move to escrowed
  tx.gatewayChargeId      = lookup.transactionId;
  tx.gatewayVerifyPayload = lookup.raw;
  tx.recordStatusChange('escrowed', {
    note:           'Khalti payment confirmed',
    gatewayPayload: lookup.raw,
  });
  await tx.save();

  // Reflect on project document
  await Project.findByIdAndUpdate(tx.project, { escrowStatus: 'funded' });

  await sendNotification(tx.receiver, {
    type:    'escrow_funded',
    title:   'Escrow Funded',
    message: `NPR ${tx.amountDisplay.toLocaleString()} has been placed in escrow for your project.`,
    refId:   tx.project,
    refType: 'Project',
  }).catch(() => {});

  return tx;
}

/**
 * Confirm a Stripe payment after the user returns from Stripe Checkout.
 *
 * @param {string} sessionId   – cs_xxx from return URL
 * @returns {Transaction}
 */
async function confirmStripeEscrow(sessionId) {
  const tx = await Transaction.findOne({
    gateway:              'stripe',
    gatewayTransactionId: sessionId,
  });
  if (!tx) throw err(`No pending transaction found for session ${sessionId}`, 404);
  if (tx.status === 'escrowed') return tx;
  if (tx.status !== 'pending')  throw err(`Transaction is already ${tx.status}`);

  const session = await stripeSvc.retrieveCheckoutSession(sessionId);

  if (session.status !== 'paid') {
    tx.recordStatusChange('failed', {
      note:           `Stripe session status: ${session.status}`,
      gatewayPayload: session.raw,
    });
    tx.gatewayVerifyPayload = session.raw;
    await tx.save();
    return tx;
  }

  tx.gatewayVerifyPayload = session.raw;
  tx.meta = { ...tx.meta, paymentIntentId: session.paymentIntentId };
  tx.recordStatusChange('escrowed', {
    note:           'Stripe checkout confirmed',
    gatewayPayload: session.raw,
  });
  await tx.save();

  await Project.findByIdAndUpdate(tx.project, {
    escrowStatus: 'funded',
    'meta.stripePaymentIntentId': session.paymentIntentId,
  });

  await sendNotification(tx.receiver, {
    type:    'escrow_funded',
    title:   'Escrow Funded',
    message: `USD ${tx.amountDisplay.toFixed(2)} has been placed in escrow for your project.`,
    refId:   tx.project,
    refType: 'Project',
  }).catch(() => {});

  return tx;
}

// ─── 3. Release funds on milestone approval ───────────────────────────────────

/**
 * Release escrowed funds to the freelancer after a milestone is approved.
 *
 * Flow:
 *   a. Validate milestone belongs to the project, is submitted, client owns project
 *   b. Idempotency check
 *   c. For Stripe: capture the PaymentIntent (or partial amount)
 *   d. For Khalti: funds were already captured on initiation; just record the
 *      release and initiate transfer via Khalti API (if available) or mark manual
 *   e. Compute platform fee, compute netAmount
 *   f. Update Transaction → 'released', Milestone → 'paid', Project escrow stats
 *   g. Notify both parties
 *
 * @param {string} milestoneId
 * @param {string} clientId
 * @returns {{ transaction, milestone }}
 */
async function releaseMilestonePayment(milestoneId, clientId) {
  const milestone = await Milestone.findById(milestoneId).lean();
  if (!milestone)                    throw err('Milestone not found', 404);
  if (milestone.status !== 'submitted') throw err('Milestone must be in submitted status to release payment');

  const project = await Project.findById(milestone.projectId).lean();
  if (!project)                                        throw err('Project not found', 404);
  if (String(project.clientId) !== String(clientId))  throw err('Forbidden', 403);
  if (project.escrowStatus !== 'funded')               throw err('Escrow is not funded');

  const iKey = generateIdempotencyKey(String(milestoneId), 'release');

  // Find the escrowed transaction for this project
  const tx = await Transaction.findOne({
    project: project._id,
    status:  'escrowed',
  }).sort({ createdAt: -1 });
  if (!tx) throw err('No escrowed transaction found for this project', 404);

  // Idempotency: if release already recorded for this milestone, return it
  const existingRelease = await Transaction.findOne({
    milestone: milestone._id,
    status:    'released',
  });
  if (existingRelease) return { transaction: existingRelease, milestone };

  // ── Gateway-specific release ──────────────────────────────────────────────

  let captureResult = null;
  let releaseNote   = '';

  if (tx.gateway === 'stripe') {
    const piId = tx.meta?.paymentIntentId;
    if (!piId) throw err('PaymentIntent id missing – cannot capture Stripe payment');

    const milestoneAmountCents = Math.round(milestone.amount * 100);

    captureResult = await stripeSvc.capturePaymentIntent(piId, milestoneAmountCents, iKey);
    releaseNote   = `Stripe capture: ${captureResult.chargeId}`;

    // Transfer net amount to freelancer's Connect account (if they have one)
    const receiver = await User.findById(project.freelancerId).select('stripeAccountId').lean();
    if (receiver?.stripeAccountId) {
      const netCents = Math.round(captureResult.amountCaptured * (1 - PLATFORM_FEE_PERCENT / 100));
      await stripeSvc.transferToFreelancer({
        destinationAccountId: receiver.stripeAccountId,
        amountCents:          netCents,
        sourceTransaction:    captureResult.chargeId,
        idempotencyKey:       iKey + '_tr',
      });
    }

  } else {
    // Khalti: funds were already captured at initiation; just record the release
    releaseNote = 'Khalti escrow release recorded (manual payout scheduled)';
  }

  // ── Record release ────────────────────────────────────────────────────────

  tx.milestone = milestone._id;
  tx.recordStatusChange('released', {
    note:           releaseNote,
    gatewayPayload: captureResult?.raw || null,
  });
  if (captureResult) {
    tx.gatewayChargeId      = captureResult.chargeId || tx.gatewayChargeId;
    tx.gatewayVerifyPayload = captureResult.raw;
  }
  await tx.save();

  // Update milestone status
  await Milestone.findByIdAndUpdate(milestoneId, {
    status: 'paid',
    paidAt: new Date(),
  });

  // Update project-level escrow tracking
  await Project.findByIdAndUpdate(project._id, {
    $inc: { totalReleased: milestone.amount },
    escrowStatus: 'partially-released',
  });

  // Notifications
  await Promise.allSettled([
    sendNotification(project.freelancerId, {
      type:    'payment_released',
      title:   '💸 Payment Released',
      message: `${tx.currency} ${milestone.amount.toLocaleString()} has been released for milestone "${milestone.title}".`,
      refId:   tx._id,
      refType: 'Transaction',
    }),
    sendNotification(project.clientId, {
      type:    'payment_released',
      title:   'Payment Released',
      message: `You released ${tx.currency} ${milestone.amount.toLocaleString()} for milestone "${milestone.title}".`,
      refId:   tx._id,
      refType: 'Transaction',
    }),
  ]);

  return { transaction: tx, milestone };
}

// ─── 4. Refund ────────────────────────────────────────────────────────────────

/**
 * Refund an escrowed transaction (e.g. admin resolves dispute in client's favour,
 * or project is cancelled before any milestone is submitted).
 *
 * @param {string} transactionId
 * @param {string} initiatorId       – admin or client id
 * @param {string} [reason]          – reason for audit log
 * @returns {Transaction}
 */
async function refundEscrow(transactionId, initiatorId, reason = 'requested_by_customer') {
  const tx = await Transaction.findById(transactionId);
  if (!tx)                                 throw err('Transaction not found', 404);
  if (!['escrowed', 'disputed'].includes(tx.status)) {
    throw err(`Cannot refund a transaction in status '${tx.status}'`);
  }

  const iKey = generateIdempotencyKey(String(transactionId), 'refund');

  if (tx.gateway === 'stripe') {
    const chargeId = tx.gatewayChargeId;
    const piId     = tx.meta?.paymentIntentId;

    if (chargeId) {
      // Already captured → issue refund
      await stripeSvc.refundCharge(chargeId, null, reason, iKey);
    } else if (piId) {
      // Still authorised but not captured → cancel the PI
      await stripeSvc.cancelPaymentIntent(piId, reason);
    } else {
      throw err('Cannot refund: no Stripe charge or PaymentIntent found');
    }

  } else {
    // Khalti
    const pidx = tx.gatewayTransactionId;
    await khaltiSvc.refundPayment(pidx);
  }

  tx.recordStatusChange('refunded', { note: reason || 'Refund initiated by admin/client' });
  await tx.save();

  await Project.findByIdAndUpdate(tx.project, { escrowStatus: 'refunded' });

  await sendNotification(tx.payer, {
    type:    'payment_refunded',
    title:   'Payment Refunded',
    message: `${tx.currency} ${tx.amountDisplay.toLocaleString()} has been refunded to your account.`,
    refId:   tx._id,
    refType: 'Transaction',
  }).catch(() => {});

  return tx;
}

// ─── 5. Dispute ───────────────────────────────────────────────────────────────

/**
 * Flag a transaction as disputed.  Freezes funds pending admin review.
 *
 * @param {string} transactionId
 * @param {string} reporterId
 * @param {string} reason
 * @returns {Transaction}
 */
async function disputeTransaction(transactionId, reporterId, reason) {
  const tx = await Transaction.findById(transactionId);
  if (!tx)                    throw err('Transaction not found', 404);
  if (tx.status !== 'escrowed') throw err('Only escrowed transactions can be disputed');

  // Check reporter is one of the parties
  const isParty = [String(tx.payer), String(tx.receiver)].includes(String(reporterId));
  if (!isParty) throw err('Forbidden – you are not a party to this transaction', 403);

  tx.recordStatusChange('disputed', { note: reason });
  tx.meta = { ...tx.meta, disputeReason: reason, disputeReporterId: String(reporterId) };
  await tx.save();

  await Project.findByIdAndUpdate(tx.project, { escrowStatus: 'disputed' });

  return tx;
}

// ─── 6. Query helpers ─────────────────────────────────────────────────────────

/**
 * Fetch the full transaction ledger for a project.
 * Ordered newest-first, populated with payer/receiver names.
 */
async function getProjectTransactions(projectId, callerRole) {
  return Transaction.find({ project: projectId })
    .populate('payer',    'name avatar')
    .populate('receiver', 'name avatar')
    .populate('milestone', 'title amount')
    .sort({ createdAt: -1 })
    .lean();
}

/**
 * Fetch a single transaction by id.
 * Caller must be the payer, receiver, or an admin.
 */
async function getTransactionById(transactionId, callerId) {
  const tx = await Transaction.findById(transactionId)
    .populate('payer',     'name avatar')
    .populate('receiver',  'name avatar')
    .populate('project',   'clientId freelancerId')
    .populate('milestone', 'title amount')
    .lean();

  if (!tx) throw err('Transaction not found', 404);

  const allowed = [
    String(tx.payer?._id || tx.payer),
    String(tx.receiver?._id || tx.receiver),
    String(tx.project?.clientId),
    String(tx.project?.freelancerId),
  ];
  if (!allowed.includes(String(callerId))) throw err('Forbidden', 403);

  return tx;
}

/**
 * Get the wallet balance summary for a user.
 * Returns { totalEarned, totalPaid, pending } in display units.
 */
async function getUserWalletSummary(userId) {
  const [earned, paid, pending] = await Promise.all([
    Transaction.aggregate([
      { $match: { receiver: new mongoose.Types.ObjectId(userId), status: 'released' } },
      { $group: { _id: null, total: { $sum: '$netAmount' } } },
    ]),
    Transaction.aggregate([
      { $match: { payer: new mongoose.Types.ObjectId(userId), status: { $in: ['escrowed', 'released'] } } },
      { $group: { _id: null, total: { $sum: '$amountDisplay' } } },
    ]),
    Transaction.aggregate([
      { $match: { payer: new mongoose.Types.ObjectId(userId), status: 'pending' } },
      { $group: { _id: null, total: { $sum: '$amountDisplay' } } },
    ]),
  ]);

  return {
    totalEarned: earned[0]?.total ?? 0,
    totalPaid:   paid[0]?.total   ?? 0,
    pending:     pending[0]?.total ?? 0,
  };
}

module.exports = {
  initiateKhaltiEscrow,
  initiateStripeEscrow,
  confirmKhaltiEscrow,
  confirmStripeEscrow,
  releaseMilestonePayment,
  refundEscrow,
  disputeTransaction,
  getProjectTransactions,
  getTransactionById,
  getUserWalletSummary,
};