/**
 * TaskTide Proposal Controller
 * Path: server/src/controllers/proposalController.js
 */

const Proposal = require('../models/Proposal');
const Project = require('../models/Project');

// @desc    Submit a new proposal
// @route   POST /api/v1/proposals
export const submitProposal = async (req, res) => {
  try {
    const { projectId, bidAmount, coverLetter } = req.body;
    
    // Ensure the project exists before allowing a bid
    const project = await Project.findById(projectId);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const proposal = await Proposal.create({
      projectId,
      freelancerId: req.user.id, // Set from auth middleware
      bidAmount,
      coverLetter,
      status: 'pending'
    });

    res.status(201).json({ message: 'Proposal submitted successfully', proposal });
  } catch (error) {
    res.status(500).json({ message: 'Submission failed', error: error.message });
  }
};

// @desc    Retrieve proposals (Freelancer's sent or Client's received)
// @route   GET /api/v1/proposals
export const getProposals = async (req, res) => {
  try {
    // Filter by user role to ensure they only see relevant data
    const filter = req.user.role === 'freelancer' 
      ? { freelancerId: req.user.id } 
      : { clientId: req.user.id };

    const proposals = await Proposal.find(filter).populate('projectId', 'title');
    res.status(200).json(proposals);
  } catch (error) {
    res.status(500).json({ message: 'Retrieval failed', error: error.message });
  }
};

// @desc    Update bid amount or status
// @route   PUT /api/v1/proposals/:id
export const updateProposal = async (req, res) => {
  try {
    const { bidAmount, status } = req.body;
    
    const proposal = await Proposal.findOneAndUpdate(
      { _id: req.params.id, freelancerId: req.user.id },
      { $set: { bidAmount, status } },
      { new: true }
    );

    if (!proposal) return res.status(404).json({ message: 'Proposal not found or unauthorized' });

    res.status(200).json({ message: 'Proposal updated', proposal });
  } catch (error) {
    res.status(400).json({ message: 'Update failed', error: error.message });
  }
};