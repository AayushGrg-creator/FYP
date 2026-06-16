/**
 * TaskTide Email Template Service
 * Path: server/src/utils/emailTemplates.js
 * * * Production-ready templates using dynamic injection.
 */

const emailTemplates = {
  welcome: (firstName) => ({
    subject: 'Welcome to TaskTide!',
    html: `<h1>Welcome, ${firstName}!</h1><p>We're thrilled to have you join our marketplace.</p>`
  }),

  jobPosted: (jobTitle, link) => ({
    subject: 'Job Posted Successfully',
    html: `<p>Your job <strong>"${jobTitle}"</strong> is now live.</p><a href="${link}">View Job</a>`
  }),

  newProposal: (jobTitle, freelancerName) => ({
    subject: `New Proposal for ${jobTitle}`,
    html: `<p>Great news! ${freelancerName} has submitted a proposal for <strong>"${jobTitle}"</strong>.</p>`
  }),

  paymentConfirmed: (amount, transactionId) => ({
    subject: 'Payment Confirmation',
    html: `<p>Your payment of <strong>${amount}</strong> has been successfully processed (ID: ${transactionId}).</p>`
  }),
};

module.exports = emailTemplates;