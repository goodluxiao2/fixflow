import logger from '../utils/logger.js';

// Dynamic import for the MNEE SDK
let Mnee = null;
let sdkLoaded = false;

async function loadMneeSdk() {
  if (sdkLoaded) return Mnee;
  
  try {
    const module = await import('@mnee/ts-sdk');
    Mnee = module.default;
    sdkLoaded = true;
    logger.debug('MNEE SDK loaded successfully');
    return Mnee;
  } catch (error) {
    logger.error('Failed to load MNEE SDK', {
      error: error.message,
      hint: 'Run: npm install @mnee/ts-sdk'
    });
    return null;
  }
}

class MneePaymentService {
  constructor() {
    this.mnee = null;
    this.mneeConfig = null;
    this.initialized = false;
  }

  async initialize() {
    logger.debug('Initializing MNEE payment service...');
    
    // Load the SDK dynamically
    const MneeClass = await loadMneeSdk();
    if (!MneeClass) {
      throw new Error('MNEE SDK not loaded. Please run: npm install @mnee/ts-sdk');
    }
    
    const environment = process.env.MNEE_ENVIRONMENT || 'sandbox';
    const apiKey = process.env.MNEE_API_KEY;
    
    if (!apiKey) {
      throw new Error('MNEE_API_KEY not set in environment variables');
    }
    
    logger.debug('Creating MNEE client', { environment, hasApiKey: !!apiKey });
    
    try {
      const config = {
        environment,
        apiKey
      };

      this.mnee = new MneeClass(config);
      logger.debug('MNEE client created');

      // Get MNEE configuration
      logger.debug('Fetching MNEE configuration...');
      this.mneeConfig = await this.mnee.config();
      logger.info('MNEE configuration loaded', {
        decimals: this.mneeConfig?.decimals,
        tokenId: this.mneeConfig?.tokenId,
        feeAddress: this.mneeConfig?.feeAddress
      });

      this.initialized = true;
      logger.info('MNEE payment service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize MNEE payment service', {
        error: error.message,
        code: error.code,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Send MNEE payment to a developer
   * @param {string} recipientAddress - MNEE address of the recipient
   * @param {number} amount - Amount in MNEE (not atomic units)
   * @param {string} bountyId - ID of the bounty being claimed
   * @returns {Promise<Object>} Transaction result
   */
  async sendPayment(recipientAddress, amount, bountyId) {
    if (!this.initialized) {
      throw new Error('MNEE payment service not initialized');
    }

    try {
      logger.info(`Sending ${amount} MNEE to ${recipientAddress} for bounty ${bountyId}`);

      const request = [{
        address: recipientAddress,
        amount: amount
      }];

      // Get bot's private key (WIF format)
      const wif = process.env.MNEE_BOT_WIF;
      if (!wif) {
        throw new Error('MNEE bot WIF not configured');
      }

      // Send the payment
      const result = await this.mnee.transfer(request, wif);

      logger.info(`Payment sent successfully. Transaction ID: ${result.transactionId}`);

      return {
        success: true,
        transactionId: result.transactionId,
        amount: amount,
        recipient: recipientAddress,
        bountyId: bountyId
      };
    } catch (error) {
      logger.error(`Failed to send MNEE payment for bounty ${bountyId}:`, error);
      throw error;
    }
  }

  /**
   * Get current MNEE balance of the bot wallet
   * @returns {Promise<Object>} Balance information
   */
  async getBalance() {
    if (!this.initialized) {
      logger.warn('getBalance called before initialization');
      throw new Error('MNEE payment service not initialized');
    }

    try {
      const address = process.env.MNEE_BOT_ADDRESS;
      if (!address) {
        logger.error('MNEE_BOT_ADDRESS not configured');
        throw new Error('MNEE bot address not configured');
      }

      logger.debug('Fetching MNEE balance', { address });
      const balance = await this.mnee.balance(address);
      
      logger.debug('MNEE balance retrieved', {
        address,
        balance: balance.balance,
        pending: balance.pending
      });

      return {
        address: address,
        balance: balance.balance,
        pending: balance.pending || 0,
        total: balance.balance + (balance.pending || 0)
      };
    } catch (error) {
      logger.error('Failed to get MNEE balance', {
        error: error.message,
        code: error.code
      });
      throw error;
    }
  }

  /**
   * Calculate fee for a given amount
   * @param {number} amount - Amount in MNEE
   * @returns {number} Fee in MNEE
   */
  calculateFee(amount) {
    if (!this.mneeConfig) {
      throw new Error('MNEE configuration not loaded');
    }

    // Convert to atomic units
    const atomicAmount = this.mnee.toAtomicAmount(amount);

    // Find applicable fee tier
    const feeTier = this.mneeConfig.fees.find(tier =>
      atomicAmount >= tier.min && atomicAmount <= tier.max
    );

    if (!feeTier) {
      throw new Error(`No fee tier found for amount ${amount} MNEE`);
    }

    // Convert fee back to MNEE
    return this.mnee.fromAtomicAmount(feeTier.fee);
  }

  /**
   * Validate MNEE address
   * @param {string} address - MNEE address to validate
   * @returns {boolean} True if valid
   */
  async validateAddress(address) {
    try {
      // MNEE addresses should be valid Bitcoin-style addresses
      // The SDK might have a validation method, but for now we'll do basic validation
      const addressRegex = /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/;
      return addressRegex.test(address);
    } catch (error) {
      logger.error('Failed to validate MNEE address:', error);
      return false;
    }
  }

  /**
   * Request test MNEE from faucet (sandbox only)
   * @returns {Promise<Object>} Faucet result
   */
  async requestFromFaucet() {
    if (process.env.MNEE_ENVIRONMENT !== 'sandbox') {
      throw new Error('Faucet is only available in sandbox environment');
    }

    try {
      const address = process.env.MNEE_BOT_ADDRESS;
      if (!address) {
        throw new Error('MNEE bot address not configured');
      }

      logger.info('Requesting MNEE from sandbox faucet...');

      // The MNEE SDK should have a faucet method
      // This is a placeholder - check MNEE documentation for actual method
      const result = await this.mnee.faucet(address);

      logger.info('Faucet request successful:', result);
      return result;
    } catch (error) {
      logger.error('Failed to request from faucet:', error);
      throw error;
    }
  }
}

export default new MneePaymentService();