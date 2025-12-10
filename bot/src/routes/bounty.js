import express from 'express';
const router = express.Router();
import logger from '../utils/logger.js';
import bountyService from '../services/bountyService.js';
import mneeService from '../services/mnee.js';
import Bounty from '../models/Bounty.js';

// Create a new bounty
router.post('/', async (req, res) => {
  try {
    const { repository, issueId, issueUrl, amount, maxAmount, metadata } = req.body;

    // Validate input
    if (!repository || !issueId || !issueUrl || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: repository, issueId, issueUrl, amount'
      });
    }

    // Create bounty in database
    const result = await bountyService.createBounty({
      repository,
      issueId,
      amount,
      maxAmount: maxAmount || amount * 3,
      issueUrl,
      metadata
    });

    logger.info(`Bounty created: ${result.bountyId} for ${repository}#${issueId}`);

    res.status(201).json({
      success: true,
      bountyId: result.bountyId,
      transactionHash: result.transactionHash
    });
  } catch (error) {
    logger.error('Failed to create bounty:', error);
    res.status(500).json({
      error: 'Failed to create bounty',
      message: error.message
    });
  }
});

// Get bounty details
router.get('/:bountyId', async (req, res) => {
  try {
    const { bountyId } = req.params;

    // Get from database
    const bounty = await Bounty.findOne({ bountyId: parseInt(bountyId) });
    if (!bounty) {
      return res.status(404).json({ error: 'Bounty not found' });
    }

    res.json(bounty.toJSON());
  } catch (error) {
    logger.error('Failed to get bounty:', error);
    res.status(500).json({
      error: 'Failed to get bounty details',
      message: error.message
    });
  }
});

// List bounties for a repository
router.get('/repository/:owner/:repo', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const repository = `${owner}/${repo}`;
    const { status = 'active', page = 1, limit = 20 } = req.query;

    const query = { repository };
    if (status !== 'all') {
      query.status = status;
    }

    const bounties = await Bounty.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Bounty.countDocuments(query);

    res.json({
      bounties: bounties.map(b => b.toJSON()),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Failed to list bounties:', error);
    res.status(500).json({
      error: 'Failed to list bounties',
      message: error.message
    });
  }
});

// Claim a bounty (internal use)
router.post('/:bountyId/claim', async (req, res) => {
  try {
    const { bountyId } = req.params;
    const { solver, pullRequestUrl, paymentTxId } = req.body;

    if (!solver || !pullRequestUrl) {
      return res.status(400).json({
        error: 'Missing required fields: solver, pullRequestUrl'
      });
    }

    // Get bounty from database
    const bounty = await Bounty.findOne({ bountyId: parseInt(bountyId) });
    if (!bounty) {
      return res.status(404).json({ error: 'Bounty not found' });
    }

    if (bounty.status !== 'active') {
      return res.status(400).json({ error: 'Bounty is not active' });
    }

    // Mark bounty as claimed
    const result = await bountyService.claimBounty(parseInt(bountyId), solver, paymentTxId);

    // Update database
    bounty.pullRequestUrl = pullRequestUrl;
    await bounty.save();

    logger.info(`Bounty ${bountyId} claimed by ${solver}`);

    res.json({
      success: true,
      amount: result.amount,
      transactionHash: result.transactionHash,
      solver
    });
  } catch (error) {
    logger.error('Failed to claim bounty:', error);
    res.status(500).json({
      error: 'Failed to claim bounty',
      message: error.message
    });
  }
});

// Escalate a bounty
router.post('/:bountyId/escalate', async (req, res) => {
  try {
    const { bountyId } = req.params;

    // Check if bounty exists and is active
    const bounty = await Bounty.findOne({ bountyId: parseInt(bountyId) });
    if (!bounty) {
      return res.status(404).json({ error: 'Bounty not found' });
    }

    if (bounty.status !== 'active') {
      return res.status(400).json({ error: 'Bounty is not active' });
    }

    // Escalate bounty
    const result = await bountyService.escalateBounty(parseInt(bountyId));

    if (result.success) {
      logger.info(`Bounty ${bountyId} escalated from ${result.oldAmount} to ${result.newAmount} MNEE`);

      res.json({
        success: true,
        oldAmount: result.oldAmount,
        newAmount: result.newAmount,
        transactionHash: result.transactionHash
      });
    } else {
      res.json({
        success: false,
        reason: result.reason
      });
    }
  } catch (error) {
    logger.error('Failed to escalate bounty:', error);
    res.status(500).json({
      error: 'Failed to escalate bounty',
      message: error.message
    });
  }
});

// Get wallet balance
router.get('/wallet/balance', async (req, res) => {
  try {
    const balance = await mneeService.getBalance();
    res.json({
      balance: balance.balance,
      address: balance.address,
      currency: 'MNEE'
    });
  } catch (error) {
    logger.error('Failed to get wallet balance:', error);
    res.status(500).json({
      error: 'Failed to get wallet balance',
      message: error.message
    });
  }
});

export default router;