/**
 * stripe.service.js
 *
 * Wraps the Stripe Node SDK for TaskTide's escrow payment flow.
 *
 * Architecture choices:
 *   • We use PaymentIntents (not Charges) for programmatic captures so we can
 *     place funds on hold and capture later when a milestone is approved.
 *   • connect_separate_charges_and_transfers is used rather than destination
 *     charges so the platform retains full control of timing.
 *   • Stripe Connect Express accounts handle freelancer KYC/payouts.
 */

const Stripe = require('stripe');

// ─── Config ───────────────────────────────────────────────────────────────────

const STRIPE_SECRET      = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SEC = process.env.STRIPE_WEBHOOK_SECRET;
const PLATFORM_URL       = process.env.PLATFORM_URL || 'http://localhost:5173';

if (!STRIPE_SECRET) {
  console.warn('[stripe] STRIPE_SECRET_KEY is not set – payment calls will fail');
}

// Lazy-initialise so we don't crash at import if the key is missing (tests)
let _stripe;
function getStripe() {
  if (!_stripe) {
    if (!STRIPE_SECRET) throw new Error('STRIPE_SECRET_KEY environment variable is not set');
    _stripe = new Stripe(STRIPE_SECRET, {
      apiVersion:    '2023-10-16',
      maxNetworkRetries: 3,   // automatic retries on network errors
      timeout:       15_000,
    });
  }
  return _stripe;
}

// ─── Error normalisation ──────────────────────────────────────────────────────

/**
 * Parses any Stripe error (StripeError subclasses + network errors) into our
 * consistent shape:  { code, message, detail, httpStatus, declineCode? }
 *
 * Stripe error types we handle:
 *   StripeCardError          – card was declined
 *   StripeInvalidRequestError– bad parameter
 *   StripeAPIError           – internal Stripe error
 *   StripeAuthenticationError– bad API key
 *   StripeRateLimitError     – too many requests
 *   StripeConnectionError    – network failure
 *   StripeSignatureVerificationError – webhook signature mismatch
 */
function parseStripeError(err) {
  const base = {
    code:       'STRIPE_ERROR',
    message:    'Stripe gateway error',
    detail:     null,
    httpStatus: 500,
  };

  // Raw JS Error (not a Stripe SDK error)
  if (!err.type) {
    return {
      ...base,
      code:    err.code || 'UNKNOWN_ERROR',
      message: err.message || 'Unknown error',
    };
  }

  const TYPE_TO_HTTP = {
    StripeCardError:                  402,
    StripeInvalidRequestError:        400,
    StripeAPIError:                   500,
    StripeAuthenticationError:        401,
    StripePermissionError:            403,
    StripeRateLimitError:             429,
    StripeConnectionError:            503,
    StripeSignatureVerificationError: 400,
    StripeIdempotencyError:           409,
  };

  return {
    ...base,
    code:        err.code       || err.type,
    message:     err.message    || err.type,
    detail:      err.param      ? { param: err.param, raw: err.raw } : err.raw,
    httpStatus:  TYPE_TO_HTTP[err.type] ?? 500,
    declineCode: err.decline_code || null,
    stripeType:  err.type,
  };
}

/**
 * Wraps every Stripe call; rethrows as a structured error with isGatewayError.
 */
async function stripeCall(fn) {
  try {
    return await fn(getStripe());
  } catch (err) {
    const parsed = parseStripeError(err);
    const out    = new Error(parsed.message);
    Object.assign(out, parsed, { isGatewayError: true });
    throw out;
  }
}

// ─── Service methods ──────────────────────────────────────────────────────────

/**
 * Create a Stripe Checkout Session for project escrow funding.
 *
 * We use `payment_intent_data.capture_method: 'manual'` so the funds are
 * authorised but NOT captured until the milestone is approved.
 *
 * @param {Object} params
 * @param {number}  params.amountUSD         – Amount in USD (display units)
 * @param {string}  params.purchaseOrderId   – Our unique order reference
 * @param {string}  params.description       – Line item description
 * @param {string}  params.customerEmail
 * @param {string}  [params.idempotencyKey]  – Stripe idempotency key
 * @param {Object}  [params.metadata]        – Freeform key→value stored on PI
 *
 * @returns {{ sessionId, checkoutUrl, paymentIntentId, raw }}
 */
async function createCheckoutSession({
  amountUSD,
  purchaseOrderId,
  description,
  customerEmail,
  idempotencyKey,
  metadata = {},
}) {
  if (!amountUSD || amountUSD <= 0)   throw new Error('amountUSD must be positive');
  if (!purchaseOrderId)               throw new Error('purchaseOrderId is required');

  const amountCents = Math.round(amountUSD * 100);
  if (amountCents < 50) throw new Error('Minimum Stripe charge is USD 0.50');

  return stripeCall(async (stripe) => {
    const sessionParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency:     'usd',
            unit_amount:  amountCents,
            product_data: { name: description || `TaskTide Escrow – ${purchaseOrderId}` },
          },
          quantity: 1,
        },
      ],
      payment_intent_data: {
        capture_method: 'manual',     // ← hold funds, capture on milestone approval
        metadata: {
          purchaseOrderId,
          platform: 'tasktide',
          ...metadata,
        },
      },
      customer_email: customerEmail,
      success_url: `${PLATFORM_URL}/payments/stripe/return?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${PLATFORM_URL}/payments/stripe/cancel?order=${purchaseOrderId}`,
      metadata: {
        purchaseOrderId,
        platform: 'tasktide',
        ...metadata,
      },
    };

    const options = idempotencyKey
      ? { idempotencyKey: `cs_${idempotencyKey}` }
      : {};

    const session = await stripe.checkout.sessions.create(sessionParams, options);

    return {
      sessionId:       session.id,
      checkoutUrl:     session.url,
      paymentIntentId: session.payment_intent,
      raw:             session,
    };
  });
}

/**
 * Retrieve a Checkout Session by id (used on return-URL callback).
 *
 * @param {string} sessionId  – cs_xxx
 * @returns {{ sessionId, paymentIntentId, status, amountTotal, customerEmail, raw }}
 */
async function retrieveCheckoutSession(sessionId) {
  if (!sessionId) throw new Error('sessionId is required');

  return stripeCall(async (stripe) => {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });

    const pi    = session.payment_intent;
    const piObj = typeof pi === 'object' ? pi : null;

    return {
      sessionId:       session.id,
      paymentIntentId: piObj ? piObj.id : pi,
      status:          session.payment_status,   // 'paid' | 'unpaid' | 'no_payment_required'
      piStatus:        piObj ? piObj.status : null,
      amountTotal:     session.amount_total,      // cents
      amountUSD:       session.amount_total ? session.amount_total / 100 : null,
      customerEmail:   session.customer_email,
      metadata:        session.metadata,
      raw:             session,
    };
  });
}

/**
 * Retrieve a PaymentIntent by id.
 *
 * @param {string} paymentIntentId  – pi_xxx
 */
async function retrievePaymentIntent(paymentIntentId) {
  if (!paymentIntentId) throw new Error('paymentIntentId is required');

  return stripeCall(async (stripe) => {
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
    return {
      id:      pi.id,
      status:  pi.status,
      amount:  pi.amount,
      amountUSD: pi.amount / 100,
      captureMethod: pi.capture_method,
      raw:     pi,
    };
  });
}

/**
 * Capture an authorised PaymentIntent (called when a milestone is approved).
 *
 * For partial captures (partial milestone releases) pass amountToCaptureCents.
 * Stripe will automatically refund the remainder.
 *
 * @param {string} paymentIntentId
 * @param {number} [amountToCaptureCents]  – Omit to capture full authorised amount
 * @param {string} [idempotencyKey]
 * @returns {{ chargeId, amountCaptured, raw }}
 */
async function capturePaymentIntent(paymentIntentId, amountToCaptureCents, idempotencyKey) {
  if (!paymentIntentId) throw new Error('paymentIntentId is required');

  return stripeCall(async (stripe) => {
    const params  = amountToCaptureCents ? { amount_to_capture: amountToCaptureCents } : {};
    const options = idempotencyKey ? { idempotencyKey: `cap_${idempotencyKey}` } : {};

    const pi = await stripe.paymentIntents.capture(paymentIntentId, params, options);

    const charge = pi.latest_charge;
    return {
      paymentIntentId: pi.id,
      status:          pi.status,               // 'succeeded'
      chargeId:        typeof charge === 'string' ? charge : charge?.id,
      amountCaptured:  pi.amount_received,
      amountUSD:       pi.amount_received / 100,
      raw:             pi,
    };
  });
}

/**
 * Cancel (void) an authorised PaymentIntent – used to return escrowed funds
 * when a project is cancelled before milestone approval.
 *
 * @param {string} paymentIntentId
 * @param {string} [reason]  – 'duplicate' | 'fraudulent' | 'requested_by_customer' | 'abandoned'
 */
async function cancelPaymentIntent(paymentIntentId, reason = 'requested_by_customer') {
  if (!paymentIntentId) throw new Error('paymentIntentId is required');

  const VALID_REASONS = ['duplicate', 'fraudulent', 'requested_by_customer', 'abandoned'];
  const safeReason    = VALID_REASONS.includes(reason) ? reason : 'requested_by_customer';

  return stripeCall(async (stripe) => {
    const pi = await stripe.paymentIntents.cancel(paymentIntentId, {
      cancellation_reason: safeReason,
    });
    return { status: pi.status, raw: pi };
  });
}

/**
 * Issue a full or partial refund on a captured charge.
 *
 * @param {string} chargeId           – ch_xxx  (or PaymentIntent id – Stripe accepts both)
 * @param {number} [amountCents]      – Omit for full refund
 * @param {string} [reason]           – 'duplicate' | 'fraudulent' | 'requested_by_customer'
 * @param {string} [idempotencyKey]
 */
async function refundCharge(chargeId, amountCents, reason = 'requested_by_customer', idempotencyKey) {
  if (!chargeId) throw new Error('chargeId is required');

  const VALID_REASONS = ['duplicate', 'fraudulent', 'requested_by_customer'];
  const safeReason    = VALID_REASONS.includes(reason) ? reason : 'requested_by_customer';

  return stripeCall(async (stripe) => {
    const params = {
      charge: chargeId,
      reason: safeReason,
      ...(amountCents ? { amount: amountCents } : {}),
    };
    const options = idempotencyKey ? { idempotencyKey: `ref_${idempotencyKey}` } : {};

    const refund = await stripe.refunds.create(params, options);
    return {
      refundId:    refund.id,
      status:      refund.status,
      amountCents: refund.amount,
      amountUSD:   refund.amount / 100,
      raw:         refund,
    };
  });
}

/**
 * Transfer funds to a freelancer's Stripe Connect Express account.
 * Called after a milestone is approved and the platform fee is retained.
 *
 * @param {string} destinationAccountId  – acct_xxx (freelancer's Connect id)
 * @param {number} amountCents
 * @param {string} currency              – 'usd'
 * @param {string} [sourceTransaction]   – ch_xxx to link to original charge
 * @param {string} [idempotencyKey]
 */
async function transferToFreelancer({
  destinationAccountId,
  amountCents,
  currency = 'usd',
  sourceTransaction,
  idempotencyKey,
}) {
  if (!destinationAccountId) throw new Error('destinationAccountId is required');
  if (!amountCents || amountCents <= 0) throw new Error('amountCents must be positive');

  return stripeCall(async (stripe) => {
    const params = {
      amount:      amountCents,
      currency,
      destination: destinationAccountId,
      ...(sourceTransaction ? { source_transaction: sourceTransaction } : {}),
    };
    const options = idempotencyKey ? { idempotencyKey: `tr_${idempotencyKey}` } : {};

    const transfer = await stripe.transfers.create(params, options);
    return {
      transferId:   transfer.id,
      amountCents:  transfer.amount,
      amountUSD:    transfer.amount / 100,
      raw:          transfer,
    };
  });
}

/**
 * Construct and verify a Stripe webhook event from the raw request body
 * and Stripe-Signature header.
 *
 * @param {Buffer|string} rawBody      – Must be the raw (unparsed) request body
 * @param {string}        signature    – Value of the 'stripe-signature' header
 * @returns {Stripe.Event}
 */
function constructWebhookEvent(rawBody, signature) {
  if (!STRIPE_WEBHOOK_SEC) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
  }
  try {
    return getStripe().webhooks.constructEvent(rawBody, signature, STRIPE_WEBHOOK_SEC);
  } catch (err) {
    const out = new Error(`Webhook signature verification failed: ${err.message}`);
    Object.assign(out, { code: 'WEBHOOK_SIGNATURE_FAILED', httpStatus: 400, isGatewayError: true });
    throw out;
  }
}

module.exports = {
  createCheckoutSession,
  retrieveCheckoutSession,
  retrievePaymentIntent,
  capturePaymentIntent,
  cancelPaymentIntent,
  refundCharge,
  transferToFreelancer,
  constructWebhookEvent,
  parseStripeError,
};