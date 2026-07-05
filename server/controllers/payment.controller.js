'use strict';

/**
 * payment.controller.js
 * HTTP handlers for wallet/balance/withdrawal endpoints.
 *
 * NOTE: milestone funding (initiate + confirm), approval/release, and
 * disputes all live in milestone.controller.js -- they operate directly
 * on a specific milestone and its escrowed Transaction, so keeping them
 * there avoids two competing implementations of the same logic.
 *
 * This file only handles account-level money concerns that aren't tied
 * to a single milestone:
 *   GET  /api/payments/transactions  - paginated history for the user
 *   GET  /api/payments/balance       - current wallet balance
 *   POST /api/payments/withdraw      - cash out wallet balance
 *
 * Khalti-only, return-URL flow (no inbound webhook is configured for
 * this project -- see khalti.service.js verifyReturn()).
 */

const mongoose    = require('mongoose');
const Transaction = require('../models/Transaction');
const User        = require('../models/User');
const logger       = require('../config/logger');

function handleError(res, err, context = '') {
  logger.error(`payment.controller [${context}]:`, err.message);
  return res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'An unexpected error occurred.',
  });
}

/* ══════════════════════════════════════════════════════════════════
   GET /api/payments/transactions
   Returns paginated transaction history for the authenticated user,
   whether they were the payer (client funding a milestone, or a
   freelancer withdrawing) or the receiver (freelancer being paid).
   Query: page, limit
══════════════════════════════════════════════════════════════════ */
async function getTransactionHistory(req, res) {
  try {
    const userId = req.user._id;
    const page   = Math.max(1, parseInt(req.query.page, 10)  || 1);
    const limit  = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip   = (page - 1) * limit;

    const filter = { $or: [{ payer: userId }, { receiver: userId }] };

    const [transactions, total] = await Promise.all([
      Transaction.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('project',   'agreedAmount')
        .populate('milestone', 'name')
        .lean(),
      Transaction.countDocuments(filter),
    ]);

    return res.status(200).json({
      success: true,
      data:    transactions,
      pagination: {
        total,
        page,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err) {
    return handleError(res, err, 'getTransactionHistory');
  }
}

/* ══════════════════════════════════════════════════════════════════
   GET /api/payments/balance
   Returns the authenticated user's current wallet balance.
══════════════════════════════════════════════════════════════════ */
async function getEscrowBalance(req, res) {
  try {
    const user = await User.findById(req.user._id).select('walletBalance').lean();
    return res.status(200).json({
      success:       true,
      walletBalance: user?.walletBalance || 0,
    });
  } catch (err) {
    return handleError(res, err, 'getEscrowBalance');
  }
}

/* ══════════════════════════════════════════════════════════════════
   POST /api/payments/withdraw
   Any authenticated user with a positive walletBalance can withdraw
   (in practice this will almost always be a freelancer, since clients
   don't accumulate earnings on this platform -- but the endpoint
   itself is role-agnostic).
   Body: { amount }
══════════════════════════════════════════════════════════════════ */
async function withdrawFunds(req, res) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount } = req.body;
    const userId = req.user._id;

    if (!amount || amount <= 0) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Invalid withdrawal amount.' });
    }

    const user = await User.findById(userId).session(session);
    if (!user || (user.walletBalance || 0) < amount) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Insufficient wallet balance.' });
    }

    // Deduct balance first to prevent double-withdrawal on concurrent requests
    await User.findByIdAndUpdate(
      userId,
      { $inc: { walletBalance: -amount } },
      { session },
    );

    // payer/receiver are both set to the same user here -- a withdrawal
    // has no second party, but both fields are required on Transaction.
    // This is a deliberate workaround, not a bug: it does not change who
    // can withdraw or how the balance math works, it's just a quirk to
    // be aware of if you inspect a withdrawal record directly.
    const [transaction] = await Transaction.create([{
      payer:         userId,
      receiver:      userId,
      amount:        Math.round(amount * 100), // paisa
      amountDisplay: amount,
      currency:      'NPR',
      gateway:       'khalti',
      status:        'withdrawn',
      description:   'Wallet withdrawal',
    }], { session });

    await session.commitTransaction();

    logger.info(`payment: withdrawal -- user=${userId} amount=${amount}`);

    return res.status(200).json({
      success:     true,
      message:     `Withdrawal of NPR ${amount} recorded.`,
      transaction,
    });
  } catch (err) {
    await session.abortTransaction();
    return handleError(res, err, 'withdrawFunds');
  } finally {
    session.endSession();
  }
}

module.exports = {
  getTransactionHistory,
  getEscrowBalance,
  withdrawFunds,
};