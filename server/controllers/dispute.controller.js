'use strict';

const disputeService = require('../services/dispute.service');
const Dispute = require('../models/Dispute');

/* POST /api/disputes */
exports.submitDispute = async (req, res, next) => {
  try {
    const { projectId, milestoneId, reason, description, evidence } = req.body;

    if (!projectId || !milestoneId || !reason || !description) {
      return res.status(400).json({
        success: false,
        message: 'projectId, milestoneId, reason, and description are required',
      });
    }

    const dispute = await disputeService.createDispute({
      projectId,
      milestoneId,
      initiatorId: req.user._id,
      reason,
      description,
      evidence,
    });

    return res.status(201).json({ success: true, data: dispute });
  } catch (err) {
    next(err);
  }
};

/* GET /api/disputes/:id */
exports.getDisputeReport = async (req, res, next) => {
  try {
    let dispute = await disputeService.getOrGenerateReport(req.params.id);
    dispute = await dispute.populate('project', 'client freelancer');

    const isParty =
      String(dispute.initiator) === String(req.user._id) ||
      String(dispute.respondent) === String(req.user._id);

    if (!isParty) {
      return res.status(403).json({ success: false, message: 'Not authorised to view this dispute' });
    }

    return res.status(200).json({ success: true, data: dispute });
  } catch (err) {
    next(err);
  }
};

/* POST /api/disputes/:id/accept */
exports.acceptResolution = async (req, res, next) => {
  try {
    const dispute = await disputeService.acceptResolution(req.params.id, req.user._id);
    return res.status(200).json({ success: true, data: dispute });
  } catch (err) {
    next(err);
  }
};

/* GET /api/disputes/by-milestone/:milestoneId */
exports.getDisputeByMilestone = async (req, res, next) => {
  try {
    const dispute = await disputeService.getDisputeByMilestone(req.params.milestoneId);
    if (!dispute) {
      return res.status(404).json({ success: false, message: 'No dispute found for this milestone' });
    }
    return res.status(200).json({ success: true, data: dispute });
  } catch (err) {
    next(err);
  }
};

/* GET /api/disputes/mine */
exports.getMyDisputes = async (req, res, next) => {
  try {
    const disputes = await Dispute.find({
      $or: [{ initiator: req.user._id }, { respondent: req.user._id }],
    })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ success: true, data: disputes });
  } catch (err) {
    next(err);
  }
};