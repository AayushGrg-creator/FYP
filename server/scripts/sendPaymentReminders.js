/**
 * TaskTide Payment Reminder Service
 * Path: server/scripts/sendReminders.js
 * * Batch processes pending transactions and notifies relevant clients.
 */

const Transaction = require('../models/Transaction');
const { sendEmail } = require('../services/emailService'); // Assuming you have an email utility
const emailTemplates = require('../utils/emailTemplates');

async function sendPaymentReminders() {
  try {
    console.log(' Starting payment reminder cycle...');
    
    // 1. Find transactions older than 48 hours that are still pending
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const pendingTransactions = await Transaction.find({
      status: 'pending',
      createdAt: { $lt: twoDaysAgo },
      reminderSent: { $ne: true } // Ensure we don't spam
    }).populate('clientId');

    if (pendingTransactions.length === 0) {
      console.log(' No pending reminders to process.');
      return;
    }

    // 2. Process notifications in parallel
    const reminderPromises = pendingTransactions.map(async (tx) => {
      const { subject, html } = emailTemplates.paymentReminder(tx.amount);
      
      await sendEmail(tx.clientId.email, subject, html);
      
      // 3. Mark as reminder sent to prevent duplicate notifications
      tx.reminderSent = true;
      await tx.save();
    });

    await Promise.all(reminderPromises);
    console.log(` Successfully processed ${pendingTransactions.length} reminders.`);
  } catch (error) {
    console.error(' Error in payment reminder cycle:', error.message);
  } finally {
    process.exit();
  }
}

sendPaymentReminders();