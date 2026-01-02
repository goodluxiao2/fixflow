import express from 'express';
const router = express.Router();
const publicRouter = express.Router(); // Public routes - no auth required
import logger from '../utils/logger.js';
import bountyService from '../services/bountyService.js';
import mneeService from '../services/mnee.js';
import Bounty from '../models/Bounty.js';
import db from '../db.js';

// ==========================================
// PUBLIC ROUTES (no authentication required)
// ==========================================

// List all bounties (public - no auth required)
publicRouter.get('/list', async (req, res) => {
  try {
    const { status, repository, page = 1, limit = 20 } = req.query;

    let whereClause = '';
    const values = [];
    let paramIndex = 1;

    // Build WHERE clause
    const conditions = [];
    if (status && status !== 'all') {
      conditions.push(`status = $${paramIndex++}`);
      values.push(status);
    }
    if (repository) {
      conditions.push(`repository = $${paramIndex++}`);
      values.push(repository);
    }

    if (conditions.length > 0) {
      whereClause = 'WHERE ' + conditions.join(' AND ');
    }

    // Get bounties with pagination
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const query = `
      SELECT * FROM bounties
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    values.push(parseInt(limit), offset);

    const { rows } = await db.query(query, values);
    const bounties = rows.map(row => Bounty.fromRow(row));

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM bounties ${whereClause}`;
    const countValues = values.slice(0, -2); // Remove limit and offset
    const countResult = await db.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].count);

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

// Get single bounty details (public)
publicRouter.get('/:bountyId', async (req, res) => {
  try {
    const { bountyId } = req.params;

    // Skip if it matches known route patterns
    if (bountyId === 'list' || bountyId === 'wallet' || bountyId === 'repository') {
      return res.status(404).json({ error: 'Bounty not found' });
    }

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

// ==========================================
// AUTHENTICATED ROUTES (require auth)
// ==========================================

// Get wallet balance (must come before /:bountyId)
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

// List bounties for a repository (must come before /:bountyId)
router.get('/repository/:owner/:repo', async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const repository = `${owner}/${repo}`;
    const { status = 'active', page = 1, limit = 20 } = req.query;

    let whereClause = 'WHERE repository = $1';
    const values = [repository];
    let paramIndex = 2;

    if (status !== 'all') {
      whereClause += ` AND status = $${paramIndex++}`;
      values.push(status);
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const query = `
      SELECT * FROM bounties
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++}
    `;
    values.push(parseInt(limit), offset);

    const { rows } = await db.query(query, values);
    const bounties = rows.map(row => Bounty.fromRow(row));

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM bounties ${whereClause}`;
    const countValues = values.slice(0, -2);
    const countResult = await db.query(countQuery, countValues);
    const total = parseInt(countResult.rows[0].count);

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

// Export both routers
export const publicBountyRoutes = publicRouter;
export default router;