import express from 'express';
const router = express.Router();
import logger from '../utils/logger.js';
import contractService from '../services/contract.js';
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

    // Create bounty on blockchain
    const result = await contractService.createBounty({
      repository,
      issueId,
      amount,
      maxAmount: maxAmount || amount * 3,
      issueUrl
    });

    // Save to database
    const bounty = new Bounty({
      bountyId: result.bountyId,
      repository,
      issueId,
      issueUrl,
      initialAmount: amount,
      currentAmount: amount,
      maxAmount: maxAmount || amount * 3,
      transactionHash: result.transactionHash,
      blockNumber: result.blockNumber,
      metadata,
      status: 'active'
    });

    await bounty.save();

    logger.info(`Bounty created: ${bounty.bountyId} for ${repository}#${issueId}`);

    res.status(201).json({
      success: true,
      bountyId: result.bountyId,
      transactionHash: result.transactionHash,
      contractAddress: result.contractAddress
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
    const dbBounty = await Bounty.findOne({ bountyId });
    if (!dbBounty) {
      return res.status(404).json({ error: 'Bounty not found' });
    }

    // Get current state from blockchain
    const chainBounty = await contractService.getBountyDetails(bountyId);

    // Merge data
    const bounty = {
      ...dbBounty.toObject(),
      currentAmount: chainBounty.currentAmount,
      claimed: chainBounty.claimed,
      solver: chainBounty.solver
    };

    res.json(bounty);
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
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Bounty.countDocuments(query);

    res.json({
      bounties,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
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

// Claim a bounty
router.post('/:bountyId/claim', async (req, res) => {
  try {
    const { bountyId } = req.params;
    const { solver, pullRequestUrl } = req.body;

    if (!solver || !pullRequestUrl) {
      return res.status(400).json({
        error: 'Missing required fields: solver, pullRequestUrl'
      });
    }

    // Get bounty from database
    const bounty = await Bounty.findOne({ bountyId });
    if (!bounty) {
      return res.status(404).json({ error: 'Bounty not found' });
    }

    if (bounty.status !== 'active') {
      return res.status(400).json({ error: 'Bounty is not active' });
    }

    // Claim on blockchain
    const result = await contractService.claimBounty(bountyId, solver);

    // Update database
    bounty.status = 'claimed';
    bounty.solver = solver;
    bounty.claimedAmount = result.amount;
    bounty.claimTransactionHash = result.transactionHash;
    bounty.pullRequestUrl = pullRequestUrl;
    bounty.claimedAt = new Date();
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
    const bounty = await Bounty.findOne({ bountyId });
    if (!bounty) {
      return res.status(404).json({ error: 'Bounty not found' });
    }

    if (bounty.status !== 'active') {
      return res.status(400).json({ error: 'Bounty is not active' });
    }

    // Escalate on blockchain
    const result = await contractService.escalateBounty(bountyId);

    if (result.success) {
      // Update database
      bounty.currentAmount = parseFloat(result.newAmount);
      bounty.lastEscalation = new Date();
      bounty.escalationCount = (bounty.escalationCount || 0) + 1;
      await bounty.save();

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