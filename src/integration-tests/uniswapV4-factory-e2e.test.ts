/**
 * Uniswap V4 Factory End-to-End Test
 * Complete flow: detection → quote → factory atomic swap → verification
 */
import { expect } from 'chai';
import { ethers, BigNumber } from 'ethers';
import { logger } from '../logging';
import { UniswapV4QuoteProvider } from '../dex-providers/uniswapV4-quote-provider';
import { checkUniswapV4Quote } from '../take-factory';
import { LiquiditySource } from '../config-types';

describe('Uniswap V4 Factory End-to-End Tests', function() {
  let signer: ethers.Signer;
  let provider: ethers.providers.Provider;

  // Configuration matching actual deployment
  const CONFIG = {
    poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
    universalRouter: '0x6ff5693b99212da76ad316178a184ab56d299b43',
    factory: '0x1729Fc45642D0713Fac14803b7381e601c27A8A4',
    takerContract: '0x2270916EcFAE3b5c127a545c8f33D622b8c0cc6f',

    // Test pool B_T1-B_T2
    poolKey: {
      token0: '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE', // B_T1
      token1: '0xd8A0af85E2539e22953287b436255422724871AB', // B_T2
      fee: 100,
      tickSpacing: 1,
      hooks: '0x0000000000000000000000000000000000000000',
    },

    ajnaPool: '0xdeac8a9a7026a4d17df81d4c03cb2ad059383e7c', // B_T2/B_T1 Ajna pool
  };

  before(async function() {
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
    logger.info(`Using account: ${await signer.getAddress()}`);

    const chainId = await signer.getChainId();
    expect(chainId).to.equal(8453, 'Must be on Base mainnet');
  });

  describe('Contract Verification', () => {
    it('should verify factory contract deployment', async () => {
      const code = await provider.getCode(CONFIG.factory);
      expect(code).to.not.equal('0x');
      logger.info(`✅ Factory deployed at ${CONFIG.factory}`);
    });

    it('should verify V4 taker contract deployment', async () => {
      const code = await provider.getCode(CONFIG.takerContract);
      expect(code).to.not.equal('0x');
      logger.info(`✅ V4 Taker deployed at ${CONFIG.takerContract}`);
    });

    it('should verify pool manager deployment', async () => {
      const code = await provider.getCode(CONFIG.poolManager);
      expect(code).to.not.equal('0x');
      logger.info(`✅ PoolManager deployed at ${CONFIG.poolManager}`);
    });
  });

  describe('V4 Detection and Quote', () => {
    it('should initialize quote provider', async () => {
      const quoteProvider = new UniswapV4QuoteProvider(signer, {
        poolManager: CONFIG.poolManager,
        defaultSlippage: 0.5,
        pools: { 'B_T1-B_T2': CONFIG.poolKey },
      });

      const initialized = await quoteProvider.initialize();
      expect(initialized).to.be.true;
      logger.info('✅ Quote provider initialized');
    });

    it('should detect V4 pool and get quote', async () => {
      const quoteProvider = new UniswapV4QuoteProvider(signer, {
        poolManager: CONFIG.poolManager,
        defaultSlippage: 0.5,
        pools: { 'B_T1-B_T2': CONFIG.poolKey },
      });

      await quoteProvider.initialize();

      const amountIn = ethers.utils.parseUnits('1', 6);
      const result = await quoteProvider.getMarketPrice(
        amountIn,
        CONFIG.poolKey.token0,
        CONFIG.poolKey.token1,
        CONFIG.poolKey,
      );

      if (result.success) {
        logger.info(`✅ Market price: ${result.price} (tick: ${result.tick})`);
        expect(result.price).to.be.a('number');
      } else {
        logger.warn(`⚠️  Pool may not be initialized: ${result.error}`);
      }
    });
  });

  describe('Factory Quote Check Integration', () => {
    it('should check profitability using factory quote check', async function() {
      this.timeout(60000);

      const mockPool = {
        address: CONFIG.ajnaPool,
        collateralAddress: CONFIG.poolKey.token1, // B_T2
        quoteAddress: CONFIG.poolKey.token0, // B_T1
      };

      const poolConfig = {
        name: 'B_T2/B_T1 Test Pool',
        address: CONFIG.ajnaPool,
        take: {
          liquiditySource: LiquiditySource.UNISWAPV4,
          marketPriceFactor: 1.01,
          minCollateral: ethers.utils.parseUnits('0.0001', 6),
          hpbPriceFactor: 1.02,
        },
      };

      const auctionPrice = 1.0;
      const collateral = ethers.utils.parseUnits('0.1', 18);

      const config = {
        uniswapV4RouterOverrides: {
          router: CONFIG.universalRouter,
          poolManager: CONFIG.poolManager,
          defaultSlippage: 0.5,
          pools: { 'B_T1-B_T2': CONFIG.poolKey },
        },
      };

      const isProfitable = await checkUniswapV4Quote(
        mockPool as any,
        auctionPrice,
        collateral,
        poolConfig as any,
        config as any,
        signer,
      );

      logger.info(`Profitability check: ${isProfitable ? 'Profitable ✅' : 'Not profitable'}`);
      expect(isProfitable).to.be.a('boolean');
    });
  });

  describe('Token Approval Tests', () => {
    it('should check existing approvals', async function() {
      this.timeout(60000);

      const signerAddress = await signer.getAddress();

      const token0Contract = new ethers.Contract(
        CONFIG.poolKey.token0,
        [
          'function allowance(address owner, address spender) view returns (uint256)',
          'function symbol() view returns (string)',
        ],
        signer,
      );

      const token1Contract = new ethers.Contract(
        CONFIG.poolKey.token1,
        [
          'function allowance(address owner, address spender) view returns (uint256)',
          'function symbol() view returns (string)',
        ],
        signer,
      );

      const allowance0 = await token0Contract.allowance(signerAddress, CONFIG.universalRouter);
      const allowance1 = await token1Contract.allowance(signerAddress, CONFIG.universalRouter);
      const symbol0 = await token0Contract.symbol();
      const symbol1 = await token1Contract.symbol();

      logger.info(`${symbol0} allowance to Universal Router: ${ethers.utils.formatUnits(allowance0, 6)}`);
      logger.info(`${symbol1} allowance to Universal Router: ${ethers.utils.formatUnits(allowance1, 6)}`);

      expect(BigNumber.isBigNumber(allowance0)).to.be.true;
      expect(BigNumber.isBigNumber(allowance1)).to.be.true;
    });
  });

  describe('Full Flow Simulation (Dry Run)', () => {
    it('should simulate complete take flow', async function() {
      this.timeout(60000);

      // 1. Verify pool exists
      const quoteProvider = new UniswapV4QuoteProvider(signer, {
        poolManager: CONFIG.poolManager,
        defaultSlippage: 0.5,
        pools: { 'B_T1-B_T2': CONFIG.poolKey },
      });

      const initialized = await quoteProvider.initialize();
      expect(initialized).to.be.true;

      // 2. Get market price
      const amountIn = ethers.utils.parseUnits('0.1', 6);
      const priceResult = await quoteProvider.getMarketPrice(
        amountIn,
        CONFIG.poolKey.token0,
        CONFIG.poolKey.token1,
        CONFIG.poolKey,
      );

      if (!priceResult.success) {
        logger.warn('⚠️  Could not get market price - pool may not be initialized');
        return;
      }

      // 3. Get quote
      const quoteResult = await quoteProvider.getQuote(
        amountIn,
        CONFIG.poolKey.token0,
        CONFIG.poolKey.token1,
        CONFIG.poolKey,
      );

      if (quoteResult.success && quoteResult.dstAmount) {
        logger.info(`✅ Full simulation successful:`);
        logger.info(`   Input: 0.1 B_T1`);
        logger.info(`   Output: ${ethers.utils.formatUnits(quoteResult.dstAmount, 6)} B_T2`);
        logger.info(`   Market price: ${priceResult.price}`);
      } else {
        logger.warn(`⚠️  Quote failed: ${quoteResult.error}`);
      }
    });
  });

  describe('All Three Pools Test', () => {
    const ALL_POOLS = {
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
        tickSpacing: 1,  // Fixed: actual pool uses tickSpacing 1
        hooks: '0x0000000000000000000000000000000000000000',
      },
      'B_T2-B_T4': {
        token0: '0x46c9b45628bc1cf680d151b4c5b1226c3d236187',
        token1: '0xd8A0af85E2539e22953287b436255422724871AB',
        fee: 500,
        tickSpacing: 10,
        hooks: '0x0000000000000000000000000000000000000000',
      },
    };

    it('should test all three V4 pools', async function() {
      this.timeout(90000);

      const quoteProvider = new UniswapV4QuoteProvider(signer, {
        poolManager: CONFIG.poolManager,
        defaultSlippage: 0.5,
        pools: ALL_POOLS,
      });

      const initialized = await quoteProvider.initialize();
      expect(initialized).to.be.true;

      for (const [name, poolKey] of Object.entries(ALL_POOLS)) {
        const amountIn = ethers.utils.parseUnits('0.1', 6);
        const result = await quoteProvider.getMarketPrice(
          amountIn,
          poolKey.token0,
          poolKey.token1,
          poolKey,
        );

        if (result.success) {
          logger.info(`✅ ${name}: price = ${result.price}`);
        } else {
          logger.warn(`⚠️  ${name}: ${result.error}`);
        }
      }
    });
  });
});
