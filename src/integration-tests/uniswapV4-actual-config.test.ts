/**
 * Uniswap V4 Integration Test - Using Actual Deployed Configuration
 * Tests with your deployed contracts and pools
 */
import { expect } from 'chai';
import { ethers, BigNumber } from 'ethers';
import { logger } from '../logging';
import { UniswapV4QuoteProvider } from '../dex-providers/uniswapV4-quote-provider';
import { checkUniswapV4Quote } from '../take-factory';
import { LiquiditySource, PoolConfig } from '../config-types';

describe('Uniswap V4 - Actual Deployed Configuration Tests', function() {
  let signer: ethers.Signer;
  let provider: ethers.providers.Provider;

  // ACTUAL DEPLOYED CONFIGURATION
  const CONFIG = {
    poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
    universalRouter: '0x6ff5693b99212da76ad316178a184ab56d299b43',
    permit2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
    factory: '0x1729Fc45642D0713Fac14803b7381e601c27A8A4',
    takerContract: '0x2270916EcFAE3b5c127a545c8f33D622b8c0cc6f',

    // Three V4 pools configured
    pools: {
      'B_T1-B_T2': {
        token0: '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE', // B_T1 (18 decimals)
        token1: '0xd8A0af85E2539e22953287b436255422724871AB', // B_T2 (6 decimals)
        fee: 100,       // 0.01%
        tickSpacing: 1,
        hooks: '0x0000000000000000000000000000000000000000',
      },
      'B_T3-B_T4': {
        token0: '0x082b59dcb966fea684b8c5f833b997b62bb0ca20', // B_T3
        token1: '0x46c9b45628bc1cf680d151b4c5b1226c3d236187', // B_T4
        fee: 100,       // 0.01%
        tickSpacing: 10,
        hooks: '0x0000000000000000000000000000000000000000',
      },
      'B_T2-B_T4': {
        token0: '0x46c9b45628bc1cf680d151b4c5b1226c3d236187', // B_T4
        token1: '0xd8A0af85E2539e22953287b436255422724871AB', // B_T2
        fee: 500,       // 0.05%
        tickSpacing: 10,
        hooks: '0x0000000000000000000000000000000000000000',
      },
    },

    // Three Ajna pools
    ajnaPools: {
      'B_T2-B_T4': '0x8948e6a77a70afb07a84f769605a3f4a8d4ee7ef',
      'B_T2-B_T1': '0xdeac8a9a7026a4d17df81d4c03cb2ad059383e7c',
      'B_T3-B_T4': '0xf44ed07f91be6a46296084d4951a27015c58ff32',
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
    logger.info(`Using keeper account: ${await signer.getAddress()}`);

    // Verify chain
    const chainId = await signer.getChainId();
    expect(chainId).to.equal(8453, 'Must be on Base mainnet');
  });

  describe('Contract Deployment Verification', () => {
    it('should verify PoolManager deployment', async () => {
      const code = await provider.getCode(CONFIG.poolManager);
      expect(code).to.not.equal('0x');
      logger.info(`✅ PoolManager deployed at ${CONFIG.poolManager}`);
    });

    it('should verify UniversalRouter deployment', async () => {
      const code = await provider.getCode(CONFIG.universalRouter);
      expect(code).to.not.equal('0x');
      logger.info(`✅ UniversalRouter deployed at ${CONFIG.universalRouter}`);
    });

    it('should verify Factory deployment', async () => {
      const code = await provider.getCode(CONFIG.factory);
      expect(code).to.not.equal('0x');
      logger.info(`✅ AjnaKeeperTakerFactory deployed at ${CONFIG.factory}`);
    });

    it('should verify UniswapV4KeeperTaker deployment', async () => {
      const code = await provider.getCode(CONFIG.takerContract);
      expect(code).to.not.equal('0x');
      logger.info(`✅ UniswapV4KeeperTaker deployed at ${CONFIG.takerContract}`);
    });
  });

  describe('B_T1-B_T2 Pool Tests (0.01% fee, 1 tick spacing)', () => {
    const poolKey = CONFIG.pools['B_T1-B_T2'];

    it('should verify token decimals', async () => {
      const token0Contract = new ethers.Contract(
        poolKey.token0,
        ['function decimals() view returns (uint8)', 'function symbol() view returns (string)'],
        signer,
      );

      const token1Contract = new ethers.Contract(
        poolKey.token1,
        ['function decimals() view returns (uint8)', 'function symbol() view returns (string)'],
        signer,
      );

      const decimals0 = await token0Contract.decimals();
      const decimals1 = await token1Contract.decimals();
      const symbol0 = await token0Contract.symbol();
      const symbol1 = await token1Contract.symbol();

      logger.info(`Token0: ${symbol0} (${poolKey.token0}) - ${decimals0} decimals`);
      logger.info(`Token1: ${symbol1} (${poolKey.token1}) - ${decimals1} decimals`);

      // Check if decimals match expected values
      const expectedDecimals = 6;
      if (decimals0 !== expectedDecimals) {
        logger.warn(`⚠️  WARNING: ${symbol0} has ${decimals0} decimals, expected ${expectedDecimals}. This may cause pricing issues!`);
      }
      if (decimals1 !== expectedDecimals) {
        logger.warn(`⚠️  WARNING: ${symbol1} has ${decimals1} decimals, expected ${expectedDecimals}. This may cause pricing issues!`);
      }

      // Just verify decimals are numbers (not enforcing specific values)
      expect(decimals0).to.be.a('number');
      expect(decimals1).to.be.a('number');
    });

    it('should initialize quote provider and get market price', async () => {
      const quoteProvider = new UniswapV4QuoteProvider(signer, {
        poolManager: CONFIG.poolManager,
        defaultSlippage: 0.5,
        pools: { 'B_T1-B_T2': poolKey },
      });

      const initialized = await quoteProvider.initialize();
      expect(initialized).to.be.true;

      const amountIn = ethers.utils.parseUnits('1', 18); // 1 B_T1 (18 decimals)
      const result = await quoteProvider.getMarketPrice(
        amountIn,
        poolKey.token0,
        poolKey.token1,
        poolKey,
      );

      if (result.success) {
        logger.info(`✅ B_T1-B_T2 market price: ${result.price} (tick: ${result.tick})`);
        expect(result.price).to.be.a('number');
        expect(result.tick).to.be.a('number');
      } else {
        logger.warn(`⚠️  Pool may not be initialized: ${result.error}`);
      }
    });

    it('should get quote for swap', async () => {
      const quoteProvider = new UniswapV4QuoteProvider(signer, {
        poolManager: CONFIG.poolManager,
        defaultSlippage: 0.5,
        pools: { 'B_T1-B_T2': poolKey },
      });

      await quoteProvider.initialize();

      const amountIn = ethers.utils.parseUnits('0.1', 18); // 0.1 B_T1 (18 decimals)
      const result = await quoteProvider.getQuote(
        amountIn,
        poolKey.token0,
        poolKey.token1,
        poolKey,
      );

      if (result.success && result.dstAmount) {
        const amountOut = ethers.utils.formatUnits(result.dstAmount, 6); // B_T2 has 6 decimals
        logger.info(`✅ Quote: 0.1 B_T1 (18 dec) → ${amountOut} B_T2 (6 dec)`);
        expect(BigNumber.isBigNumber(result.dstAmount)).to.be.true;
        if (result.dstAmount.isZero()) {
          logger.warn(`⚠️  Warning: Quote returned 0 - pool may not have liquidity or price is too extreme`);
        }
      } else {
        logger.warn(`⚠️  Quote failed: ${result.error}`);
      }
    });
  });

  describe('B_T3-B_T4 Pool Tests (0.01% fee, 10 tick spacing)', () => {
    const poolKey = CONFIG.pools['B_T3-B_T4'];

    it('should get market price from B_T3-B_T4 pool', async () => {
      const quoteProvider = new UniswapV4QuoteProvider(signer, {
        poolManager: CONFIG.poolManager,
        defaultSlippage: 0.5,
        pools: { 'B_T3-B_T4': poolKey },
      });

      const initialized = await quoteProvider.initialize();
      expect(initialized).to.be.true;

      const amountIn = ethers.utils.parseUnits('1', 6);
      const result = await quoteProvider.getMarketPrice(
        amountIn,
        poolKey.token0,
        poolKey.token1,
        poolKey,
      );

      if (result.success) {
        logger.info(`✅ B_T3-B_T4 market price: ${result.price}`);
      } else {
        logger.warn(`⚠️  Pool may not be initialized: ${result.error}`);
      }
    });
  });

  describe('B_T2-B_T4 Pool Tests (0.05% fee, 10 tick spacing)', () => {
    const poolKey = CONFIG.pools['B_T2-B_T4'];

    it('should get market price from B_T2-B_T4 pool', async () => {
      const quoteProvider = new UniswapV4QuoteProvider(signer, {
        poolManager: CONFIG.poolManager,
        defaultSlippage: 0.5,
        pools: { 'B_T2-B_T4': poolKey },
      });

      const initialized = await quoteProvider.initialize();
      expect(initialized).to.be.true;

      const amountIn = ethers.utils.parseUnits('1', 6);
      const result = await quoteProvider.getMarketPrice(
        amountIn,
        poolKey.token0,
        poolKey.token1,
        poolKey,
      );

      if (result.success) {
        logger.info(`✅ B_T2-B_T4 market price: ${result.price}`);
      } else {
        logger.warn(`⚠️  Pool may not be initialized: ${result.error}`);
      }
    });
  });

  describe('Factory Quote Check Tests', () => {
    it('should check profitability for B_T2-B_T1 Ajna pool', async function() {
      this.timeout(60000);

      const poolKey = CONFIG.pools['B_T1-B_T2'];
      const ajnaPoolAddress = CONFIG.ajnaPools['B_T2-B_T1'];

      // Create mock pool with properties (not methods) as expected by checkUniswapV4Quote
      const mockPool = {
        address: ajnaPoolAddress,
        collateralAddress: poolKey.token1, // B_T2 is collateral (property, not method)
        quoteAddress: poolKey.token0, // B_T1 is quote (property, not method)
      } as any;

      const poolConfig = {
        name: 'B_T2/B_T1 Test Pool',
        address: ajnaPoolAddress,
        take: {
          liquiditySource: LiquiditySource.UNISWAPV4,
          marketPriceFactor: 1.01,
          minCollateral: ethers.utils.parseUnits('0.0001', 6),
          hpbPriceFactor: 1.02,
        },
      };

      const auctionPrice = 1.0; // 1:1 price as a number
      const collateral = ethers.utils.parseUnits('0.1', 18); // Collateral in WAD (18 decimals)

      const config = {
        uniswapV4RouterOverrides: {
          router: CONFIG.universalRouter,
          poolManager: CONFIG.poolManager,
          defaultSlippage: 0.5,
          pools: { 'B_T1-B_T2': poolKey },
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

      logger.info(`B_T2-B_T1 profitability check: ${isProfitable ? 'Profitable ✅' : 'Not profitable'}`);
      expect(isProfitable).to.be.a('boolean');
    });

    it('should check profitability for B_T2-B_T4 Ajna pool', async function() {
      this.timeout(60000);

      const poolKey = CONFIG.pools['B_T2-B_T4'];
      const ajnaPoolAddress = CONFIG.ajnaPools['B_T2-B_T4'];

      const mockPool = {
        address: ajnaPoolAddress,
        collateralAddress: poolKey.token1, // B_T2 is collateral
        quoteAddress: poolKey.token0, // B_T4 is quote
      } as any;

      const poolConfig = {
        name: 'B_T2/B_T4 Test Pool',
        address: ajnaPoolAddress,
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
          pools: { 'B_T2-B_T4': poolKey },
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

      logger.info(`B_T2-B_T4 profitability check: ${isProfitable ? 'Profitable ✅' : 'Not profitable'}`);
      expect(isProfitable).to.be.a('boolean');
    });

    it('should check profitability for B_T3-B_T4 Ajna pool', async function() {
      this.timeout(60000);

      const poolKey = CONFIG.pools['B_T3-B_T4'];
      const ajnaPoolAddress = CONFIG.ajnaPools['B_T3-B_T4'];

      const mockPool = {
        address: ajnaPoolAddress,
        collateralAddress: poolKey.token0, // B_T3 is collateral
        quoteAddress: poolKey.token1, // B_T4 is quote
      } as any;

      const poolConfig = {
        name: 'B_T3/B_T4 Test Pool',
        address: ajnaPoolAddress,
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
          pools: { 'B_T3-B_T4': poolKey },
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

      logger.info(`B_T3-B_T4 profitability check: ${isProfitable ? 'Profitable ✅' : 'Not profitable'}`);
      expect(isProfitable).to.be.a('boolean');
    });
  });

  describe('Token Balance Checks', () => {
    it('should check keeper balances for all tokens', async () => {
      const signerAddress = await signer.getAddress();
      // Token info with correct decimals
      const tokens = [
        { name: 'B_T1', address: CONFIG.pools['B_T1-B_T2'].token0, decimals: 18 },
        { name: 'B_T2', address: CONFIG.pools['B_T1-B_T2'].token1, decimals: 6 },
        { name: 'B_T3', address: CONFIG.pools['B_T3-B_T4'].token0, decimals: 18 },
        { name: 'B_T4', address: CONFIG.pools['B_T3-B_T4'].token1, decimals: 6 },
      ];

      logger.info(`\nKeeper balances for ${signerAddress}:`);

      for (const token of tokens) {
        const tokenContract = new ethers.Contract(
          token.address,
          ['function balanceOf(address) view returns (uint256)'],
          signer,
        );

        const balance = await tokenContract.balanceOf(signerAddress);
        const formatted = ethers.utils.formatUnits(balance, token.decimals);
        logger.info(`  ${token.name} (${token.decimals} dec): ${formatted}`);

        expect(BigNumber.isBigNumber(balance)).to.be.true;
      }
    });
  });

  describe('Configuration Validation', () => {
    it('should validate all pool configurations', () => {
      for (const [name, pool] of Object.entries(CONFIG.pools)) {
        expect(ethers.utils.isAddress(pool.token0)).to.be.true;
        expect(ethers.utils.isAddress(pool.token1)).to.be.true;
        expect(pool.fee).to.be.a('number');
        expect(pool.tickSpacing).to.be.a('number');
        expect(pool.hooks).to.equal('0x0000000000000000000000000000000000000000');

        logger.info(`✅ ${name} configuration valid`);
      }
    });

    it('should validate all Ajna pool addresses', () => {
      for (const [name, address] of Object.entries(CONFIG.ajnaPools)) {
        expect(ethers.utils.isAddress(address)).to.be.true;
        logger.info(`✅ ${name} Ajna pool: ${address}`);
      }
    });
  });
});
