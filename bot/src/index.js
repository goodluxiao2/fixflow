import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import { ethers } from 'ethers';
import cron from 'node-cron';

import logger from './utils/logger.js';
import authMiddleware from './middleware/auth.js';
import bountyRoutes from './routes/bounty.js';
import webhookRoutes from './routes/webhook.js';
import adminRoutes from './routes/admin.js';
import escalationService from './services/escalation.js';
import contractService from './services/contract.js';
import mneeService from './services/mnee.js';
import db from './db.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/bounties', authMiddleware, bountyRoutes);
app.use('/api/admin', authMiddleware, adminRoutes);
app.use('/webhook', webhookRoutes); // GitHub webhooks don't use our auth

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Database connection
async function connectDatabase() {
  try {
    await db.initDb();
  } catch (error) {
    logger.error('Database initialization error:', error);
    process.exit(1);
  }
}

// Initialize blockchain connection
async function initializeBlockchain() {
  try {
    const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    // Test connection
    const blockNumber = await provider.getBlockNumber();
    logger.info(`Connected to Sepolia at block ${blockNumber}`);

    // Initialize contract service
    await contractService.initialize(wallet);

    logger.info('Blockchain connection initialized');
  } catch (error) {
    logger.error('Blockchain initialization error:', error);
    process.exit(1);
  }
}

// Initialize MNEE payment service
async function initializeMneeService() {
  try {
    await mneeService.initialize();

    // Get initial balance
    const balance = await mneeService.getBalance();
    logger.info(`MNEE wallet balance: ${balance.balance} MNEE`);

    // Request from faucet if in sandbox mode and balance is low
    if (process.env.MNEE_ENVIRONMENT === 'sandbox' && balance.balance < 10) {
      logger.info('Low MNEE balance in sandbox, requesting from faucet...');
      try {
        await mneeService.requestFromFaucet();
      } catch (error) {
        logger.warn('Faucet request failed:', error.message);
      }
    }

    logger.info('MNEE payment service initialized');
  } catch (error) {
    logger.error('MNEE service initialization error:', error);
    process.exit(1);
  }
}

// Start escalation scheduler
function startEscalationScheduler() {
  const interval = process.env.ESCALATION_CHECK_INTERVAL || 3600000; // 1 hour default

  // Run every hour to check for bounties that need escalation
  cron.schedule('0 * * * *', async () => {
    logger.info('Running bounty escalation check...');
    try {
      await escalationService.checkAndEscalateBounties();
    } catch (error) {
      logger.error('Escalation check error:', error);
    }
  });

  logger.info('Escalation scheduler started');
}

// Graceful shutdown
async function gracefulShutdown() {
  logger.info('Shutting down gracefully...');

  // Close server
  global.server.close(() => {
    logger.info('HTTP server closed');
  });

  // Close database connection
  // await db.close(); // If we implemented close. Pool closes when process exits usually, but explicit is good.
  // pg pool.end() is what we'd want but we exported query and getClient.
  // We didn't export pool logic for shutdown, which is okay for now.

  process.exit(0);
}

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
async function startServer() {
  try {
    // Connect to database
    await connectDatabase();

    // Initialize blockchain
    await initializeBlockchain();

    // Initialize MNEE service
    await initializeMneeService();

    // Start escalation scheduler
    startEscalationScheduler();

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`Bounty Hunter Bot running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
    });

    // Store server reference for graceful shutdown
    global.server = server;

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Start the application
startServer();

export default app;