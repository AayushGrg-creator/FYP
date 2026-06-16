/**
 * TaskTide Job Controller
 * Path: server/src/controllers/job.controller.js
 * * Interfaces between the API routes and the MongoDB Job model.
 */

const Job = require('../models/Job');

// @desc    Get paginated list of jobs with optional filtering
export const getJobs = async (req, res) => {
  try {
    const { category, minBudget, maxBudget } = req.query;
    let query = {};

    if (category) query.category = category;
    if (minBudget || maxBudget) {
      query.budget = { $gte: minBudget || 0, $lte: maxBudget || 999999 };
    }

    const jobs = await Job.find(query).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: jobs.length, data: jobs });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error fetching jobs' });
  }
};

// @desc    Create a new job posting
export const createJob = async (req, res) => {
  try {
    // Inject the authenticated user ID as the clientId
    const jobData = { ...req.body, clientId: req.user.id };
    const job = await Job.create(jobData);
    
    res.status(201).json({ success: true, data: job });
  } catch (error) {
    res.status(400).json({ success: false, message: 'Invalid job data' });
  }
};

// @desc    Update an existing job
export const updateJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.status(200).json({ success: true, data: job });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Update failed' });
  }
};