import { ethers } from 'ethers';
import { createRequire } from 'module';
import logger from '../utils/logger.js';

const require = createRequire(import.meta.url);
// Import BountyEscrow ABI (generated from compiled contract)
const BountyEscrowABI = require('../../abi/BountyEscrow.json');

class ContractService {
  constructor() {
    this.wallet = null;
    this.provider = null;
    this.bountyEscrow = null;
    this.initialized = false;
  }

  async initialize(wallet) {
    try {
      this.wallet = wallet;
      this.provider = wallet.provider;

      // Initialize BountyEscrow contract instance
      this.bountyEscrow = new ethers.Contract(
        process.env.BOUNTY_ESCROW_ADDRESS,
        BountyEscrowABI,
        wallet
      );

      // Verify bot is authorized
      const isAuthorized = await this.bountyEscrow.authorizedBots(wallet.address);
      if (!isAuthorized) {
        throw new Error('Bot wallet is not authorized in BountyEscrow contract');
      }

      this.initialized = true;
      logger.info('Contract service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize contract service:', error);
      throw error;
    }
  }

  async createBounty({ repository, issueId, amount, maxAmount, issueUrl }) {
    if (!this.initialized) {
      throw new Error('Contract service not initialized');
    }

    try {
      logger.info(`Creating bounty for issue ${issueId} with amount ${amount} MNEE`);

      const gasPrice = await this.provider.getFeeData();
      const maxGasPrice = ethers.parseUnits(process.env.MAX_GAS_PRICE_GWEI || '50', 'gwei');

      const tx = await this.bountyEscrow.createBounty(
        repository,
        issueId,
        amount,
        maxAmount,
        issueUrl,
        {
          gasPrice: gasPrice.gasPrice > maxGasPrice ? maxGasPrice : gasPrice.gasPrice,
          gasLimit: 200000
        }
      );

      logger.info(`Bounty creation transaction sent: ${tx.hash}`);

      // Wait for confirmation
      const receipt = await tx.wait();

      // Extract bounty ID from events
      const event = receipt.logs.find(
        log => log.topics[0] === ethers.id('BountyCreated(uint256,address,uint256,uint256,string)')
      );

      const bountyId = event ? ethers.toNumber(event.topics[1]) : null;

      logger.info(`Bounty created successfully. ID: ${bountyId}, TX: ${tx.hash}`);

      return {
        success: true,
        bountyId,
        transactionHash: tx.hash,
        contractAddress: process.env.BOUNTY_ESCROW_ADDRESS,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      logger.error('Failed to create bounty:', error);
      throw error;
    }
  }

  async escalateBounty(bountyId) {
    if (!this.initialized) {
      throw new Error('Contract service not initialized');
    }

    try {
      logger.info(`Escalating bounty ${bountyId}`);

      const tx = await this.bountyEscrow.escalateBounty(bountyId, {
        gasLimit: 150000
      });

      const receipt = await tx.wait();

      // Parse the return value to check if escalation happened
      const [escalated, newAmount] = await this.bountyEscrow.escalateBounty.staticCall(bountyId);

      if (escalated) {
        logger.info(`Bounty ${bountyId} escalated to ${newAmount} MNEE`);

        return {
          success: true,
          newAmount: ethers.formatUnits(newAmount, 0), // MNEE amounts are stored as integers
          transactionHash: tx.hash
        };
      } else {
        logger.info(`Bounty ${bountyId} not yet eligible for escalation`);
        return { success: false, reason: 'not_eligible' };
      }
    } catch (error) {
      logger.error(`Failed to escalate bounty ${bountyId}:`, error);
      throw error;
    }
  }

  async claimBounty(bountyId, solverAddress, paymentTxId) {
    if (!this.initialized) {
      throw new Error('Contract service not initialized');
    }

    try {
      logger.info(`Marking bounty ${bountyId} as claimed for solver ${solverAddress}`);

      const tx = await this.bountyEscrow.claimBounty(
        bountyId,
        solverAddress,
        paymentTxId,
        {
          gasLimit: 150000
        }
      );

      const receipt = await tx.wait();

      logger.info(`Bounty ${bountyId} marked as claimed successfully`);

      return {
        success: true,
        transactionHash: tx.hash
      };
    } catch (error) {
      logger.error(`Failed to claim bounty ${bountyId}:`, error);
      throw error;
    }
  }

  async getBountyDetails(bountyId) {
    if (!this.initialized) {
      throw new Error('Contract service not initialized');
    }

    try {
      const bounty = await this.bountyEscrow.getBounty(bountyId);

      return {
        initialAmount: parseInt(bounty.initialAmount),
        currentAmount: parseInt(bounty.currentAmount),
        maxAmount: parseInt(bounty.maxAmount),
        createdAt: new Date(Number(bounty.createdAt) * 1000),
        repository: bounty.repository,
        issueId: Number(bounty.issueId),
        solver: bounty.solver,
        claimed: bounty.claimed,
        issueUrl: bounty.issueUrl,
        paymentTxId: bounty.paymentTxId
      };
    } catch (error) {
      logger.error(`Failed to get bounty ${bountyId} details:`, error);
      throw error;
    }
  }

  async getContractStats() {
    if (!this.initialized) {
      throw new Error('Contract service not initialized');
    }

    try {
      const [totalBounties, activeBounties, claimedBounties] = await this.bountyEscrow.getStats();

      return {
        totalBounties: Number(totalBounties),
        activeBounties: Number(activeBounties),
        claimedBounties: Number(claimedBounties)
      };
    } catch (error) {
      logger.error('Failed to get contract stats:', error);
      throw error;
    }
  }
}

export default new ContractService();