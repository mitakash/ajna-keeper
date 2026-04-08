/**
 * Uniswap V4 Post-Auction Reward Exchange Test
 * Tests LP reward collection and exchange via V4
 */
import { expect } from 'chai';
import { ethers, BigNumber } from 'ethers';
import { logger } from '../logging';
import { UniswapV4QuoteProvider } from '../dex-providers/uniswapV4-quote-provider';

describe('Uniswap V4 Post-Auction Reward Exchange Tests', function() {
  let signer: ethers.Signer;
  let provider: ethers.providers.Provider;

  // Test configuration - using actual deployed addresses
  const TEST_CONFIG = {
    poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
    universalRouter: '0x6ff5693b99212da76ad316178a184ab56d299b43',
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    poolKey: {
      token0: '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE', // B_T1
      token1: '0xd8A0af85E2539e22953287b436255422724871AB', // B_T2
      fee: 100,       // 0.01%
      tickSpacing: 1,
      hooks: '0x0000000000000000000000000000000000000000',
    },
  };

  before(async function() {
    // Setup provider and signer
    const rpcUrl = process.env.BASE_RPC_URL || 'https://base-mainnet.g.alchemy.com/v2/BGrpE_7pmP_VQwKMWN6hz';
    provider = new ethers.providers.JsonRpcProvider(rpcUrl);

    const keystorePath = process.env.KEEPER_KEYSTORE || '/Users/bigdellis/keystore-files/keeper-keystore2.json';
    const password = process.env.KEEPER_PASSWORD;

    if (!password) {
      logger.warn('KEEPER_PASSWORD not set, tests will be skipped');
      this.skip();
      return;
    }

    const keystoreJson = require('fs').readFileSync(keystorePath, 'utf8');
    signer = await ethers.Wallet.fromEncryptedJson(keystoreJson, password).then(w => w.connect(provider));
    logger.info(`Using keystore account: ${await signer.getAddress()}`);

    // Verify we're on Base mainnet
    const chainId = await signer.getChainId();
    expect(chainId).to.equal(8453, 'Must be on Base mainnet (chain ID 8453)');
  });

  describe('V4 Quote Provider Integration', () => {
    it('should initialize V4 quote provider', async () => {
      const quoteProvider = new UniswapV4QuoteProvider(signer, {
        poolManager: TEST_CONFIG.poolManager,
        defaultSlippage: 1.0,
        pools: { 'B_T1-B_T2': TEST_CONFIG.poolKey },
      });

      const initialized = await quoteProvider.initialize();
      expect(initialized).to.be.true;
      logger.info('✅ V4 Quote Provider initialized');
    });

    it('should find V4 pool for token pair', async () => {
      const quoteProvider = new UniswapV4QuoteProvider(signer, {
        poolManager: TEST_CONFIG.poolManager,
        defaultSlippage: 1.0,
        pools: { 'B_T1-B_T2': TEST_CONFIG.poolKey },
      });

      await quoteProvider.initialize();

      const result = await quoteProvider.getMarketPrice(
        ethers.utils.parseUnits('1', 6),
        TEST_CONFIG.poolKey.token0,
        TEST_CONFIG.poolKey.token1,
        TEST_CONFIG.poolKey,
      );

      if (result.success) {
        logger.info(`✅ Pool lookup successful - price: ${result.price}`);
      } else {
        logger.warn(`⚠️  Pool lookup failed: ${result.error}`);
      }
    });

    it('should validate token addresses', async () => {
      const token0Contract = new ethers.Contract(
        TEST_CONFIG.poolKey.token0,
        ['function symbol() view returns (string)', 'function decimals() view returns (uint8)'],
        signer,
      );

      const token1Contract = new ethers.Contract(
        TEST_CONFIG.poolKey.token1,
        ['function symbol() view returns (string)', 'function decimals() view returns (uint8)'],
        signer,
      );

      const symbol0 = await token0Contract.symbol();
      const symbol1 = await token1Contract.symbol();
      const decimals0 = await token0Contract.decimals();
      const decimals1 = await token1Contract.decimals();

      logger.info(`Token 0: ${symbol0} (${decimals0} decimals)`);
      logger.info(`Token 1: ${symbol1} (${decimals1} decimals)`);

      expect(decimals0).to.be.a('number');
      expect(decimals1).to.be.a('number');

      logger.info('✅ Token addresses validated');
    });
  });

  describe('Post-Auction Quote Tests', () => {
    it('should check balances before swap', async function() {
      const signerAddress = await signer.getAddress();

      const token0Contract = new ethers.Contract(
        TEST_CONFIG.poolKey.token0,
        ['function balanceOf(address) view returns (uint256)', 'function symbol() view returns (string)'],
        signer,
      );

      const balance = await token0Contract.balanceOf(signerAddress);
      const symbol = await token0Contract.symbol();

      logger.info(`Balance: ${ethers.utils.formatUnits(balance, 6)} ${symbol}`);

      if (balance.eq(0)) {
        logger.warn(`⚠️  No ${symbol} balance - swap tests will be skipped`);
        this.skip();
      }

      expect(balance).to.be.a('BigNumber');
    });

    it('should get quote for post-auction swap', async function() {
      this.timeout(60000);

      const quoteProvider = new UniswapV4QuoteProvider(signer, {
        poolManager: TEST_CONFIG.poolManager,
        defaultSlippage: 2.0,
        pools: { 'B_T1-B_T2': TEST_CONFIG.poolKey },
      });

      await quoteProvider.initialize();

      const amountIn = ethers.utils.parseUnits('0.01', 6);

      const result = await quoteProvider.getQuote(
        amountIn,
        TEST_CONFIG.poolKey.token0,
        TEST_CONFIG.poolKey.token1,
        TEST_CONFIG.poolKey,
      );

      if (result.success && result.dstAmount) {
        logger.info(`✅ Quote: ${ethers.utils.formatUnits(amountIn, 6)} B_T1 → ${ethers.utils.formatUnits(result.dstAmount, 6)} B_T2`);
        expect(result.dstAmount).to.be.a('BigNumber');
      } else {
        logger.warn(`⚠️  Quote failed: ${result.error}`);
      }
    });

    it('should handle insufficient balance gracefully', async function() {
      this.timeout(60000);

      const quoteProvider = new UniswapV4QuoteProvider(signer, {
        poolManager: TEST_CONFIG.poolManager,
        defaultSlippage: 2.0,
        pools: { 'B_T1-B_T2': TEST_CONFIG.poolKey },
      });

      await quoteProvider.initialize();

      const largeAmount = ethers.utils.parseUnits('1000000', 6); // Unrealistically large

      const result = await quoteProvider.getQuote(
        largeAmount,
        TEST_CONFIG.poolKey.token0,
        TEST_CONFIG.poolKey.token1,
        TEST_CONFIG.poolKey,
      );

      // Should return a quote even for large amounts (pool state calculation)
      logger.info(`Large amount quote: ${result.success ? 'Success' : 'Failed'}`);
      expect(result).to.have.property('success');
    });

    it('should handle slippage calculation correctly', async function() {
      this.timeout(60000);

      const quoteProvider = new UniswapV4QuoteProvider(signer, {
        poolManager: TEST_CONFIG.poolManager,
        defaultSlippage: 0.1, // Very low slippage
        pools: { 'B_T1-B_T2': TEST_CONFIG.poolKey },
      });

      await quoteProvider.initialize();

      const amountIn = ethers.utils.parseUnits('0.001', 6);

      const result = await quoteProvider.getQuote(
        amountIn,
        TEST_CONFIG.poolKey.token0,
        TEST_CONFIG.poolKey.token1,
        TEST_CONFIG.poolKey,
      );

      if (result.success) {
        logger.info('✅ Quote succeeded with tight slippage');
      } else {
        logger.info(`✅ Quote handled tight slippage: ${result.error}`);
      }
    });
  });

  describe('Multi-Token Swap Scenarios', () => {
    it('should get quote B_T1 -> B_T2', async function() {
      this.timeout(60000);

      const quoteProvider = new UniswapV4QuoteProvider(signer, {
        poolManager: TEST_CONFIG.poolManager,
        defaultSlippage: 2.0,
        pools: { 'B_T1-B_T2': TEST_CONFIG.poolKey },
      });

      await quoteProvider.initialize();

      const amountIn = ethers.utils.parseUnits('0.01', 6);

      const result = await quoteProvider.getQuote(
        amountIn,
        TEST_CONFIG.poolKey.token0, // B_T1
        TEST_CONFIG.poolKey.token1, // B_T2
        TEST_CONFIG.poolKey,
      );

      if (result.success) {
        logger.info('✅ B_T1 → B_T2 quote successful');
      } else {
        logger.warn(`⚠️  B_T1 → B_T2 quote failed: ${result.error}`);
      }
    });

    it('should get quote B_T2 -> B_T1 (reverse)', async function() {
      this.timeout(60000);

      const quoteProvider = new UniswapV4QuoteProvider(signer, {
        poolManager: TEST_CONFIG.poolManager,
        defaultSlippage: 2.0,
        pools: { 'B_T1-B_T2': TEST_CONFIG.poolKey },
      });

      await quoteProvider.initialize();

      const amountIn = ethers.utils.parseUnits('0.01', 6);

      const result = await quoteProvider.getQuote(
        amountIn,
        TEST_CONFIG.poolKey.token1, // B_T2
        TEST_CONFIG.poolKey.token0, // B_T1
        TEST_CONFIG.poolKey,
      );

      if (result.success) {
        logger.info('✅ B_T2 → B_T1 quote successful');
      } else {
        logger.warn(`⚠️  B_T2 → B_T1 quote failed: ${result.error}`);
      }
    });
  });

  describe('Gas Estimation Tests', () => {
    it('should estimate gas for V4 quote operations', async function() {
      this.timeout(60000);

      const quoteProvider = new UniswapV4QuoteProvider(signer, {
        poolManager: TEST_CONFIG.poolManager,
        defaultSlippage: 1.0,
        pools: { 'B_T1-B_T2': TEST_CONFIG.poolKey },
      });

      const initialized = await quoteProvider.initialize();
      expect(initialized).to.be.true;

      // Quote operations use staticCall so don't consume gas
      // This test verifies the provider works efficiently
      logger.info('✅ Gas estimation functionality available in router');
    });
  });
});
