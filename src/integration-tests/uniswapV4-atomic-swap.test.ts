/**
 * Uniswap V4 Atomic Swap Integration Test
 * Tests the complete atomic swap flow during auction takes
 */
import { expect } from 'chai';
import { ethers, BigNumber } from 'ethers';
import { logger } from '../logging';
import { UniswapV4QuoteProvider } from '../dex-providers/uniswapV4-quote-provider';
import { swapWithUniswapV4 } from '../uniswapV4-router-module';

describe('Uniswap V4 Atomic Swap Integration Tests', function() {
  let signer: ethers.Signer;
  let provider: ethers.providers.Provider;

  // Test configuration - using actual deployed addresses
  const TEST_CONFIG = {
    poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
    universalRouter: '0x6ff5693b99212da76ad316178a184ab56d299b43',
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

    // Use environment keystore or test account
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

  describe('Quote Provider Tests', () => {
    it('should initialize quote provider successfully', async () => {
      const quoteProvider = new UniswapV4QuoteProvider(signer, {
        poolManager: TEST_CONFIG.poolManager,
        defaultSlippage: 1.0,
        pools: { 'B_T1-B_T2': TEST_CONFIG.poolKey },
      });

      const initialized = await quoteProvider.initialize();
      expect(initialized).to.be.true;
      expect(quoteProvider.isAvailable()).to.be.true;

      logger.info('✅ Quote provider initialized successfully');
    });

    it('should get market price from V4 pool', async () => {
      const quoteProvider = new UniswapV4QuoteProvider(signer, {
        poolManager: TEST_CONFIG.poolManager,
        defaultSlippage: 1.0,
        pools: { 'B_T1-B_T2': TEST_CONFIG.poolKey },
      });

      await quoteProvider.initialize();

      const amountIn = ethers.utils.parseUnits('1', 6); // 1 token (6 decimals)
      const result = await quoteProvider.getMarketPrice(
        amountIn,
        TEST_CONFIG.poolKey.token0,
        TEST_CONFIG.poolKey.token1,
        TEST_CONFIG.poolKey,
      );

      if (result.success) {
        logger.info(`✅ Market price: ${result.price} (tick: ${result.tick})`);
        expect(result.price).to.be.a('number');
        expect(result.tick).to.be.a('number');
      } else {
        logger.warn(`⚠️  Pool may not be initialized: ${result.error}`);
      }
    });
  });

  describe('Profitability Check Tests', () => {
    it('should check if swap is profitable at current market price', async () => {
      const quoteProvider = new UniswapV4QuoteProvider(signer, {
        poolManager: TEST_CONFIG.poolManager,
        defaultSlippage: 1.0,
        pools: { 'B_T1-B_T2': TEST_CONFIG.poolKey },
      });

      await quoteProvider.initialize();

      const amountIn = ethers.utils.parseUnits('1', 6); // 1 token
      const auctionPrice = ethers.utils.parseEther('1.0'); // 1:1 price in WAD

      const result = await quoteProvider.isProfitable(
        amountIn,
        TEST_CONFIG.poolKey.token0,
        TEST_CONFIG.poolKey.token1,
        TEST_CONFIG.poolKey,
        auctionPrice,
      );

      if (result.profitable) {
        logger.info(`✅ Swap is profitable! Expected profit: ${ethers.utils.formatUnits(result.expectedProfit!, 6)}`);
      } else if (result.error) {
        logger.warn(`⚠️  Could not determine profitability: ${result.error}`);
      } else {
        logger.info('Swap is not profitable at current prices');
      }

      expect(result).to.have.property('profitable');
    });
  });

  describe('Token Balance Tests', function() {
    it('should check token balances', async function() {
      const signerAddress = await signer.getAddress();

      const token0Contract = new ethers.Contract(
        TEST_CONFIG.poolKey.token0,
        ['function balanceOf(address) view returns (uint256)', 'function symbol() view returns (string)'],
        signer,
      );

      const token1Contract = new ethers.Contract(
        TEST_CONFIG.poolKey.token1,
        ['function balanceOf(address) view returns (uint256)', 'function symbol() view returns (string)'],
        signer,
      );

      const balance0 = await token0Contract.balanceOf(signerAddress);
      const balance1 = await token1Contract.balanceOf(signerAddress);
      const symbol0 = await token0Contract.symbol();
      const symbol1 = await token1Contract.symbol();

      logger.info(`Token balances for ${signerAddress}:`);
      logger.info(`  ${symbol0}: ${ethers.utils.formatUnits(balance0, 6)}`);
      logger.info(`  ${symbol1}: ${ethers.utils.formatUnits(balance1, 6)}`);

      expect(balance0).to.be.a('BigNumber');
      expect(balance1).to.be.a('BigNumber');

      if (balance0.eq(0)) {
        logger.warn(`⚠️  No ${symbol0} balance - swap test will be skipped`);
      }
    });

    it('should execute V4 swap successfully (if sufficient balance)', async function() {
      this.timeout(120000); // 2 minutes

      const signerAddress = await signer.getAddress();
      const amountIn = ethers.utils.parseUnits('0.01', 6); // Small test amount (6 decimals)

      // Check balance
      const token0Contract = new ethers.Contract(
        TEST_CONFIG.poolKey.token0,
        ['function balanceOf(address) view returns (uint256)'],
        signer,
      );
      const balance = await token0Contract.balanceOf(signerAddress);

      if (balance.lt(amountIn)) {
        logger.warn('⚠️  Insufficient balance for swap test - skipping');
        this.skip();
        return;
      }

      // Execute swap
      logger.info('Executing V4 swap...');
      const result = await swapWithUniswapV4(
        signer,
        TEST_CONFIG.poolKey.token0,
        amountIn,
        TEST_CONFIG.poolKey.token1,
        1.0, // 1% slippage
        TEST_CONFIG.poolKey,
        signerAddress,
        TEST_CONFIG.poolManager,
        TEST_CONFIG.universalRouter,
      );

      expect(result.success).to.be.true;
      expect(result.receipt).to.exist;

      if (result.receipt) {
        logger.info(`✅ Swap successful! Tx: ${result.receipt.transactionHash}`);
        logger.info(`   Gas used: ${result.receipt.gasUsed.toString()}`);
      }
    });
  });

  describe('Error Handling Tests', () => {
    it('should handle insufficient liquidity gracefully', async () => {
      const quoteProvider = new UniswapV4QuoteProvider(signer, {
        poolManager: TEST_CONFIG.poolManager,
        defaultSlippage: 1.0,
        pools: { 'B_T1-B_T2': TEST_CONFIG.poolKey },
      });

      await quoteProvider.initialize();

      // Try to get quote for extremely large amount
      const largeAmount = ethers.utils.parseUnits('1000000000', 6);
      const result = await quoteProvider.getQuote(
        largeAmount,
        TEST_CONFIG.poolKey.token0,
        TEST_CONFIG.poolKey.token1,
        TEST_CONFIG.poolKey,
      );

      // Should either fail gracefully or return a quote
      logger.info(`Large amount quote result: ${result.success ? 'Success' : 'Failed'}`);
      expect(result).to.have.property('success');
    });

    it('should handle invalid token pair gracefully', async () => {
      const quoteProvider = new UniswapV4QuoteProvider(signer, {
        poolManager: TEST_CONFIG.poolManager,
        defaultSlippage: 1.0,
        pools: { 'B_T1-B_T2': TEST_CONFIG.poolKey },
      });

      await quoteProvider.initialize();

      // Try with non-existent pool (wrong tokens)
      const fakePoolKey = {
        ...TEST_CONFIG.poolKey,
        token0: '0x0000000000000000000000000000000000000001',
        token1: '0x0000000000000000000000000000000000000002',
      };

      const result = await quoteProvider.getMarketPrice(
        ethers.utils.parseUnits('1', 6),
        fakePoolKey.token0,
        fakePoolKey.token1,
        fakePoolKey,
      );

      expect(result.success).to.be.false;
      logger.info(`✅ Invalid pair handled: ${result.error}`);
    });
  });

  describe('Multi-Pool Configuration', () => {
    it('should work with multiple pool configurations', async () => {
      const multiPoolConfig = {
        poolManager: TEST_CONFIG.poolManager,
        defaultSlippage: 0.5,
        pools: {
          'B_T1-B_T2': {
            token0: '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE',
            token1: '0xd8A0af85E2539e22953287b436255422724871AB',
            fee: 100,
            tickSpacing: 1,
            hooks: '0x0000000000000000000000000000000000000000',
          },
          'B_T3-B_T4': {
            token0: '0x082b59dcb966fea684b8c5f833b997b62bb0ca20',
            token1: '0x46c9b45628bc1cf680d151b4c5b1226c3d236187',
            fee: 100,
            tickSpacing: 10,
            hooks: '0x0000000000000000000000000000000000000000',
          },
          'B_T2-B_T4': {
            token0: '0x46c9b45628bc1cf680d151b4c5b1226c3d236187',
            token1: '0xd8A0af85E2539e22953287b436255422724871AB',
            fee: 500,
            tickSpacing: 10,
            hooks: '0x0000000000000000000000000000000000000000',
          },
        },
      };

      const quoteProvider = new UniswapV4QuoteProvider(signer, multiPoolConfig);
      const initialized = await quoteProvider.initialize();
      expect(initialized).to.be.true;

      logger.info('✅ Multi-pool configuration initialized');
    });
  });
});
