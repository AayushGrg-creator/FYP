'use strict';

const mongoose = require('mongoose');
const Dispute = require('../models/Dispute');
const { Milestone, DISPUTE_RESOLUTIONS } = require('../models/Milestone');
const Project = require('../models/Project');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation'); // ASSUMPTION: Conversation.js (not Conversation.model.js) is the live one — confirm against message.service.js

/* ─────────────────────────────────────────────────────────────────
   Map Dispute.resolution values -> Milestone.disputeDetails.resolution values
   (the two schemas use different string enums for the same concept)
───────────────────────────────────────────────────────────────── */
const RESOLUTION_MAP = {
  release_to_freelancer: 'released_to_freelancer',
  refund_to_client:      'refunded_to_client',
  split:                 'partial_split',
};

/* ─────────────────────────────────────────────────────────────────
   gatherEvidence
   Pulls the raw facts the report is based on: milestone submission
   state, project file uploads, and message responsiveness.
───────────────────────────────────────────────────────────────── */
async function gatherEvidence(projectId, milestoneId) {
  const [project, milestone] = await Promise.all([
    Project.findById(projectId).lean(),
    Milestone.findById(milestoneId).lean(),
  ]);

  if (!project) throw new Error('Project not found');
  if (!milestone) throw new Error('Milestone not found');

  const conversation = await Conversation.findOne({ projectId }).lean();

  const messages = conversation
    ? await Message.find({ conversationId: conversation._id, deletedAt: null })
        .sort({ createdAt: 1 })
        .lean()
    : [];

  // Response time per sender: gap between a message from user A and the
  // next reply from a different user.
  const responseTimes = { client: [], freelancer: [] };
  for (let i = 1; i < messages.length; i++) {
    const prev = messages[i - 1];
    const curr = messages[i];
    if (String(prev.sender) === String(curr.sender)) continue;

    const gapHours = (new Date(curr.createdAt) - new Date(prev.createdAt)) / 36e5;
    const responderIsClient = String(curr.sender) === String(project.client);
    (responderIsClient ? responseTimes.client : responseTimes.freelancer).push(gapHours);
  }

  const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
  const avgClientResponseHours = avg(responseTimes.client);
  const avgFreelancerResponseHours = avg(responseTimes.freelancer);

  const freelancerFilesAfterFunding = (project.files || []).filter(
    (f) =>
      String(f.uploadedBy) === String(project.freelancer) &&
      milestone.fundedAt &&
      new Date(f.uploadedAt) > new Date(milestone.fundedAt)
  );

  const wasSubmittedLate =
    !!milestone.submission?.submittedAt &&
    !!milestone.dueDate &&
    new Date(milestone.submission.submittedAt) > new Date(milestone.dueDate);

  return {
    milestoneStatus: milestone.status,
    hasDeliverable: !!milestone.submission?.deliverableUrl,
    deliverableUrl: milestone.submission?.deliverableUrl || null,
    submittedAt: milestone.submission?.submittedAt || null,
    dueDate: milestone.dueDate,
    wasSubmittedLate,
    freelancerFileCount: freelancerFilesAfterFunding.length,
    totalMessages: messages.length,
    avgClientResponseHours,
    avgFreelancerResponseHours,
  };
}

/* ─────────────────────────────────────────────────────────────────
   computeSuggestedResolution
   Rule-based score, 0 (favors client fully) - 100 (favors freelancer
   fully). Not ML — deliberately explainable for the report.
───────────────────────────────────────────────────────────────── */
function computeSuggestedResolution(evidence, reason) {
  let score = 50;
  const notes = [];

  if (evidence.hasDeliverable) {
    score += 20;
    notes.push('Freelancer submitted a deliverable for this milestone.');
  } else {
    score -= 30;
    notes.push('No deliverable was submitted for this milestone.');
  }

  if (evidence.freelancerFileCount > 0) {
    score += 15;
    notes.push(`${evidence.freelancerFileCount} project file(s) were uploaded by the freelancer after funding.`);
  }

  if (evidence.wasSubmittedLate) {
    score -= 15;
    notes.push('Submission was made after the milestone due date.');
  } else if (evidence.hasDeliverable) {
    notes.push('Submission was made on or before the due date.');
  }

  if (evidence.avgClientResponseHours != null && evidence.avgFreelancerResponseHours != null) {
    if (evidence.avgFreelancerResponseHours < evidence.avgClientResponseHours) {
      score += 10;
      notes.push('Freelancer replied faster on average than the client.');
    } else if (evidence.avgClientResponseHours < evidence.avgFreelancerResponseHours) {
      score -= 10;
      notes.push('Client replied faster on average than the freelancer.');
    }
  }

  // Reason-specific adjustments
  if (reason === 'work_not_delivered' && !evidence.hasDeliverable) {
    score -= 20;
    notes.push('Claim of non-delivery is consistent with the absence of a submitted deliverable.');
  }
  if (reason === 'payment_not_released' && evidence.hasDeliverable && !evidence.wasSubmittedLate) {
    score += 20;
    notes.push('Claim of withheld payment is consistent with an on-time, delivered milestone.');
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  let resolution;
  if (score >= 70) resolution = 'release_to_freelancer';
  else if (score <= 30) resolution = 'refund_to_client';
  else resolution = 'split';

  return {
    resolution,
    splitPercentFreelancer: score,
    reasoning: notes.join(' '),
  };
}

/* ─────────────────────────────────────────────────────────────────
   createDispute
───────────────────────────────────────────────────────────────── */
async function createDispute({ projectId, milestoneId, initiatorId, reason, description, evidence }) {
  const project = await Project.findById(projectId);
  if (!project) throw new Error('Project not found');

  const isClient = String(project.client) === String(initiatorId);
  const isFreelancer = String(project.freelancer) === String(initiatorId);
  if (!isClient && !isFreelancer) throw new Error('You are not a party to this project');

  const respondentId = isClient ? project.freelancer : project.client;

  const dispute = await Dispute.create({
    project: projectId,
    milestone: milestoneId,
    initiator: initiatorId,
    respondent: respondentId,
    reason,
    description,
    evidence: evidence || [],
    escrowAmount: project.agreedAmount, // simplification; refine if partial escrow needed
  });

  const milestone = await Milestone.findById(milestoneId);
  if (milestone) {
    milestone.raiseDispute(reason);
    await milestone.save();
  }

  project.status = 'disputed';
  project.escrowStatus = 'disputed';
  project.dispute = dispute._id;
  await project.save();

  return dispute;
}

/* ─────────────────────────────────────────────────────────────────
   getOrGenerateReport
   Lazily computes the evidence + suggested resolution on first read,
   then persists it so repeated views are consistent.
───────────────────────────────────────────────────────────────── */
async function getOrGenerateReport(disputeId) {
  const dispute = await Dispute.findById(disputeId);
  if (!dispute) throw new Error('Dispute not found');

  if (!dispute.reportGeneratedAt) {
    const evidence = await gatherEvidence(dispute.project, dispute.milestone);
    const { resolution, splitPercentFreelancer, reasoning } = computeSuggestedResolution(
      evidence,
      dispute.reason
    );

    dispute.evidenceSnapshot = evidence;
    dispute.suggestedResolution = resolution;
    dispute.suggestedSplitPercentFreelancer = splitPercentFreelancer;
    dispute.reasoning = reasoning;
    dispute.reportGeneratedAt = new Date();
    dispute.status = 'awaiting_acceptance';
    await dispute.save();
  }

  return dispute;
}

/* ─────────────────────────────────────────────────────────────────
   acceptResolution
   Called by either party. When both have accepted, applies the
   resolution to the Milestone and recalculates the Project.
───────────────────────────────────────────────────────────────── */
async function acceptResolution(disputeId, userId) {
  const dispute = await Dispute.findById(disputeId);
  if (!dispute) throw new Error('Dispute not found');
  if (dispute.status !== 'awaiting_acceptance') {
    throw new Error(`Dispute must be awaiting_acceptance to accept (current: "${dispute.status}")`);
  }

  const project = await Project.findById(dispute.project);
  if (!project) throw new Error('Project not found');

  const isClient = String(project.client) === String(userId);
  const isFreelancer = String(project.freelancer) === String(userId);
  if (!isClient && !isFreelancer) throw new Error('You are not a party to this dispute');

  if (isClient) {
    dispute.clientAccepted = true;
    dispute.clientAcceptedAt = new Date();
  }
  if (isFreelancer) {
    dispute.freelancerAccepted = true;
    dispute.freelancerAcceptedAt = new Date();
  }

  if (dispute.clientAccepted && dispute.freelancerAccepted) {
    dispute.resolution = dispute.suggestedResolution;
    dispute.status = 'resolved';
    dispute.resolvedAt = new Date();

    const milestone = await Milestone.findById(dispute.milestone);
    if (milestone) {
      const mappedResolution = RESOLUTION_MAP[dispute.resolution];
      milestone.resolve(
        mappedResolution,
        'Resolved via automated report — accepted by both parties.',
        dispute.resolution === 'split' ? dispute.suggestedSplitPercentFreelancer : undefined
      );
      await milestone.save();
    }

    project.status = 'in_progress'; // will be recalculated below if all milestones are done
    project.escrowStatus = 'active';
    await project.save();
    await project.recalculateProgress();
  }

  await dispute.save();
  return dispute;
}

async function getDisputeByMilestone(milestoneId) {
  const dispute = await Dispute.findOne({ milestone: milestoneId }).sort({ createdAt: -1 });
  if (!dispute) return null;
  return dispute;
}

module.exports = {
  gatherEvidence,
  computeSuggestedResolution,
  createDispute,
  getOrGenerateReport,
  acceptResolution,
  getDisputeByMilestone,
};