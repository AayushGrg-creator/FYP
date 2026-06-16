/**
 * khalti.service.js
 *
 * Wraps the Khalti ePay v2 REST API.
 * Docs: https://docs.khalti.com/khalti-epayment/
 *
 * All monetary values sent to Khalti must be in PAISA (NPR × 100).
 * This service always converts display amounts before sending.
 */

const axios = require('axios');

// ─── Config ───────────────────────────────────────────────────────────────────

const KHALTI_BASE_URL = process.env.KHALTI_BASE_URL || 'https://a.khalti.com/api/v2';
const KHALTI_SECRET   = process.env.KHALTI_SECRET_KEY;
const PLATFORM_URL    = process.env.PLATFORM_URL    || 'http://localhost:5173';

if (!KHALTI_SECRET) {
  console.warn('[khalti] KHALTI_SECRET_KEY is not set – payment calls will fail');
}

// ─── Axios instance ───────────────────────────────────────────────────────────

const khaltiClient = axios.create({
  baseURL: KHALTI_BASE_URL,
  timeout: 15_000,
  headers: {
    Authorization: `Key ${KHALTI_SECRET}`,
    'Content-Type': 'application/json',
  },
});

// ─── Error normalisation ──────────────────────────────────────────────────────

/**
 * Parses any kind of Khalti / Axios error into a consistent shape:
 *   { code, message, detail, httpStatus }
 *
 * Khalti v2 error body shapes we handle:
 *   { detail: "..." }
 *   { error: "...", detail: "..." }
 *   { key: ["...", ...], ... }   (field-level validation)
 *   plain HTML (gateway down)
 */
function parseKhaltiError(err) {
  const base = {
    code:       'KHALTI_ERROR',
    message:    'Khalti gateway error',
    detail:     null,
    httpStatus: 500,
  };

  if (!err.response) {
    // Network-level error (timeout, ECONNREFUSED, etc.)
    return {
      ...base,
      code:    err.code || 'NETWORK_ERROR',
      message: err.message || 'Network error communicating with Khalti',
    };
  }

  const { status, data } = err.response;
  base.httpStatus = status;

  if (typeof data === 'string') {
    // HTML error page from a proxy / CDN
    return {
      ...base,
      code:    `HTTP_${status}`,
      message: `Khalti returned HTTP ${status}`,
      detail:  data.slice(0, 200),
    };
  }

  if (data && typeof data === 'object') {
    // Field-validation errors: { field: ["msg"] }
    const fieldErrors = Object.entries(data)
      .filter(([, v]) => Array.isArray(v))
      .map(([k, v]) => `${k}: ${v.join(', ')}`)
      .join('; ');

    return {
      ...base,
      code:    data.error || data.error_key || `HTTP_${status}`,
      message: data.detail || data.message || fieldErrors || `HTTP ${status}`,
      detail:  data,
    };
  }

  return base;
}

/**
 * Wraps every Khalti call so errors are always rethrown as a structured object
 * carrying { message, code, detail, httpStatus, isGatewayError: true }.
 */
async function khaltiCall(fn) {
  try {
    return await fn();
  } catch (err) {
    const parsed = parseKhaltiError(err);
    const out    = new Error(parsed.message);
    Object.assign(out, parsed, { isGatewayError: true });
    throw out;
  }
}

// ─── Service methods ──────────────────────────────────────────────────────────

/**
 * Initiate a Khalti ePay checkout session.
 *
 * @param {Object} params
 * @param {number}  params.amountNPR        – Amount in NPR (display units)
 * @param {string}  params.purchaseOrderId  – Our internal unique order id (idempotency key)
 * @param {string}  params.purchaseOrderName – Human-readable description shown in Khalti UI
 * @param {string}  params.customerName
 * @param {string}  params.customerEmail
 * @param {string}  params.customerPhone    – Optional
 * @param {string}  params.returnUrl        – Where Khalti redirects after payment
 * @param {string}  params.websiteUrl       – Merchant website
 *
 * @returns {Object} Khalti initiation response:
 *   { pidx, payment_url, expires_at, expires_in }
 */
async function initiatePayment({
  amountNPR,
  purchaseOrderId,
  purchaseOrderName,
  customerName,
  customerEmail,
  customerPhone,
  returnUrl,
  websiteUrl,
}) {
  // Validate required fields before hitting the network
  if (!amountNPR || amountNPR <= 0)     throw new Error('amountNPR must be a positive number');
  if (!purchaseOrderId)                  throw new Error('purchaseOrderId is required');
  if (!purchaseOrderName)                throw new Error('purchaseOrderName is required');
  if (!customerName || !customerEmail)   throw new Error('customerName and customerEmail are required');

  const amountPaisa = Math.round(amountNPR * 100);
  if (amountPaisa < 100) throw new Error('Minimum Khalti payment is NPR 1 (100 paisa)');

  const payload = {
    return_url:            returnUrl  || `${PLATFORM_URL}/payments/khalti/return`,
    website_url:           websiteUrl || PLATFORM_URL,
    amount:                amountPaisa,
    purchase_order_id:     purchaseOrderId,
    purchase_order_name:   purchaseOrderName,
    customer_info: {
      name:  customerName,
      email: customerEmail,
      ...(customerPhone ? { phone: customerPhone } : {}),
    },
  };

  return khaltiCall(async () => {
    const { data } = await khaltiClient.post('/epayment/initiate/', payload);

    // Validate the shape we depend on
    if (!data.pidx || !data.payment_url) {
      throw Object.assign(new Error('Unexpected Khalti initiation response shape'), {
        response: { status: 200, data },
      });
    }

    return {
      pidx:        data.pidx,
      paymentUrl:  data.payment_url,
      expiresAt:   data.expires_at,
      expiresIn:   data.expires_in,
      raw:         data,
    };
  });
}

/**
 * Look up the status of a Khalti payment by pidx.
 *
 * Khalti status strings:
 *   'Completed'  – payment captured, funds held
 *   'Pending'    – still waiting for user action
 *   'Initiated'  – checkout opened but not paid
 *   'Refunded'   – refunded by merchant
 *   'Expired'    – checkout window closed without payment
 *   'User canceled' – user cancelled in app
 *
 * @param {string} pidx  – Payment index from initiatePayment
 * @returns {Object}  Normalised lookup result with our own statusCode
 */
async function lookupPayment(pidx) {
  if (!pidx) throw new Error('pidx is required');

  return khaltiCall(async () => {
    const { data } = await khaltiClient.post('/epayment/lookup/', { pidx });

    if (!data.pidx) {
      throw Object.assign(new Error('Unexpected Khalti lookup response shape'), {
        response: { status: 200, data },
      });
    }

    /**
     * Normalise Khalti's free-text status into our internal statusCode.
     * 'completed' → escrow / capture succeeded
     * 'failed'    → we should mark the transaction failed
     * 'pending'   → still in flight
     */
    const RAW_STATUS = (data.status || '').toLowerCase();
    let statusCode;
    if (RAW_STATUS === 'completed')                        statusCode = 'completed';
    else if (['expired', 'user canceled'].includes(RAW_STATUS)) statusCode = 'cancelled';
    else if (RAW_STATUS === 'refunded')                    statusCode = 'refunded';
    else if (RAW_STATUS === 'initiated' || RAW_STATUS === 'pending') statusCode = 'pending';
    else                                                   statusCode = 'unknown';

    return {
      pidx:              data.pidx,
      transactionId:     data.transaction_id || null,   // real bank reference
      status:            data.status,
      statusCode,
      amountPaisa:       data.total_amount,
      amountNPR:         data.total_amount ? data.total_amount / 100 : null,
      feePaisa:          data.fee || 0,
      feeNPR:            data.fee ? data.fee / 100 : 0,
      refundedAmount:    data.refunded_amount || 0,
      purchaseOrderId:   data.purchase_order_id,
      raw:               data,
    };
  });
}

/**
 * Verify that a return-URL callback from Khalti is genuine by performing a
 * server-side lookup and comparing the amount.
 *
 * @param {string} pidx           – From the return URL ?pidx=
 * @param {number} expectedNPR    – Amount we originally charged
 * @returns {{ valid, lookup }}
 */
async function verifyReturn(pidx, expectedNPR) {
  const lookup = await lookupPayment(pidx);

  const valid =
    lookup.statusCode === 'completed' &&
    lookup.amountNPR  !== null        &&
    Math.abs(lookup.amountNPR - expectedNPR) < 0.01; // float tolerance

  return { valid, lookup };
}

/**
 * Initiate a full or partial refund for a previously completed Khalti payment.
 *
 * NOTE: Khalti's sandbox does not support refund API calls; this will only
 * succeed in production mode with a real pidx.
 *
 * @param {string} pidx
 * @param {number} [refundAmountNPR]   – Omit for full refund
 * @returns {Object}  Khalti refund response
 */
async function refundPayment(pidx, refundAmountNPR = null) {
  if (!pidx) throw new Error('pidx is required for refund');

  const payload = { pidx };
  if (refundAmountNPR !== null) {
    const paisa = Math.round(refundAmountNPR * 100);
    if (paisa < 100) throw new Error('Minimum refund amount is NPR 1');
    payload.amount = paisa;
  }

  return khaltiCall(async () => {
    const { data } = await khaltiClient.post('/epayment/refund/', payload);
    return { success: true, raw: data };
  });
}

/**
 * Verify a Khalti webhook signature.
 *
 * Khalti currently sends the secret key in the Authorization header of the
 * incoming webhook request.  Compare it against our stored secret.
 *
 * @param {string} authHeader  – Value of the Authorization header on the webhook
 * @returns {boolean}
 */
function verifyWebhookSignature(authHeader) {
  if (!authHeader) return false;
  // Khalti webhook auth: "Key <secret>"
  const incoming = authHeader.replace(/^Key\s+/i, '').trim();
  return incoming === KHALTI_SECRET;
}

module.exports = {
  initiatePayment,
  lookupPayment,
  verifyReturn,
  refundPayment,
  verifyWebhookSignature,
  parseKhaltiError,
};