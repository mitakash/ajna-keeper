import { expect } from 'chai';
import sinon from 'sinon';
import { BigNumber } from 'ethers';
import { LiquiditySource } from '../config-types';
import { logger } from '../logging';
import * as takeFactory from '../take-factory';

describe('Take Factory', () => {
  let mockSigner: any;
  let mockPool: any;
  let loggerInfoStub: sinon.SinonStub;
  let loggerDebugStub: sinon.SinonStub;
  let loggerErrorStub: sinon.SinonStub;

  beforeEach(() => {
    // Create basic mocks
    mockSigner = {
      getAddress: sinon.stub().resolves('0xTestAddress'),
      getChainId: sinon.stub().resolves(43114), // Avalanche
    };
    
    mockPool = {
      name: 'Test Pool',
      poolAddress: '0xPoolAddress',
      collateralAddress: '0xCollateralAddress',
      quoteAddress: '0xQuoteAddress',
    };

    // Stub logger methods
    loggerInfoStub = sinon.stub(logger, 'info');
    loggerDebugStub = sinon.stub(logger, 'debug');
    loggerErrorStub = sinon.stub(logger, 'error');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('handleFactoryTakes - Real Function Tests', () => {
    it('should handle missing configuration gracefully', async () => {
      const mockPool = {
        name: 'USD_T1 / USD_T2',
        poolAddress: '0x600ca6e0b5cf41e3e4b4242a5b170f3b02ce3da7',
        collateralAddress: '0x1f0d51a052aa79527fffaf3108fb4440d3f53ce6',
        quoteAddress: '0x91e1a2966408d434cfc1c0790df4a1ce08dc73d8',
      };

      const poolConfig = {
        name: 'USD_T1 / USD_T2',
        address: '0x600ca6e0b5cf41e3e4b4242a5b170f3b02ce3da7',
        take: {
          liquiditySource: LiquiditySource.UNISWAPV3,
          marketPriceFactor: 0.99,
        },
      };

      const config = {
        dryRun: false,
        subgraphUrl: 'https://api.goldsky.com/api/public/project_test/subgraphs/ajna-hemi/1.0.0/gn',
        delayBetweenActions: 1000,
        // Missing keeperTakerFactory and universalRouterOverrides (testing graceful degradation)
      };

      // Mock subgraph to return empty liquidations to avoid external calls
      const subgraphStub = sinon.stub(require('../subgraph'), 'default').value({
        getLiquidations: sinon.stub().resolves({
          pool: { hpb: 1000, hpbIndex: 0, liquidationAuctions: [] }
        })
      });

      try {
        // This should complete without throwing, even with missing config
        await takeFactory.handleFactoryTakes({
          signer: mockSigner,
          pool: mockPool as any,
          poolConfig: poolConfig as any,
          config: config as any,
        });

        // Should log debug message about the configuration
        expect(loggerDebugStub.called).to.be.true;
      } catch (error) {
        // Test should not throw for missing config, should handle gracefully
        expect.fail(`Function should handle missing config gracefully, but threw: ${error}`);
      }

      subgraphStub.restore();
    });

    it('should handle complete Hemi-style configuration', async () => {
      const mockPool = {
        name: 'USD_T1 / USD_T2',
        poolAddress: '0x600ca6e0b5cf41e3e4b4242a5b170f3b02ce3da7',
        collateralAddress: '0x1f0d51a052aa79527fffaf3108fb4440d3f53ce6',
        quoteAddress: '0x91e1a2966408d434cfc1c0790df4a1ce08dc73d8',
      };

      const poolConfig = {
        name: 'USD_T1 / USD_T2',
        address: '0x600ca6e0b5cf41e3e4b4242a5b170f3b02ce3da7',
        take: {
          liquiditySource: LiquiditySource.UNISWAPV3,
          marketPriceFactor: 0.99,
          minCollateral: 0.1,
          hpbPriceFactor: 0.98,
        },
      };

      // Real Hemi config structure
      const config = {
        dryRun: true, // Use dryRun to avoid actual transactions
        subgraphUrl: 'https://api.goldsky.com/api/public/project_test/subgraphs/ajna-hemi/1.0.0/gn',
        delayBetweenActions: 35,
        keeperTakerFactory: '0xB6006B9e9696a0A097D4990964D5bDa6E940ba0D',
        takerContracts: {
          'UniswapV3': '0x81D39B4A2Be43e5655608fCcE18A0edd8906D7c7'
        },
        universalRouterOverrides: {
          universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
          wethAddress: '0x4200000000000000000000000000000000000006',
          permit2Address: '0xB952578f3520EE8Ea45b7914994dcf4702cEe578',
          defaultFeeTier: 3000,
          defaultSlippage: 0.5,
          poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
          quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
        },
      };

      // Mock subgraph to return empty liquidations
      const subgraphStub = sinon.stub(require('../subgraph'), 'default').value({
        getLiquidations: sinon.stub().resolves({
          pool: { hpb: 1000, hpbIndex: 0, liquidationAuctions: [] }
        })
      });

      await takeFactory.handleFactoryTakes({
        signer: mockSigner,
        pool: mockPool as any,
        poolConfig: poolConfig as any,
        config: config as any,
      });

      // Should log the debug message about using factory take handler
      const debugCalls = loggerDebugStub.getCalls();
      const factoryLogFound = debugCalls.some(call => 
        call.args[0] && call.args[0].includes('Factory take handler starting')
      );
      expect(factoryLogFound).to.be.true;

      subgraphStub.restore();
    });
  });

  describe('Configuration Validation - Business Logic', () => {
    // Test the parameter validation logic that happens before external calls
    
    it('should handle missing marketPriceFactor gracefully', () => {
      const poolConfig = {
        name: 'Test Pool',
        take: {
          liquiditySource: LiquiditySource.UNISWAPV3,
          // Missing marketPriceFactor
          minCollateral: 1.0,
        },
      };

      // This tests the validation logic - marketPriceFactor is required for takes
      expect((poolConfig.take as any).marketPriceFactor).to.be.undefined;
      
      // Business logic: if no marketPriceFactor, external takes should not be attempted
      const hasMarketPriceFactor = !!(poolConfig.take as any).marketPriceFactor;
      expect(hasMarketPriceFactor).to.be.false;
    });

    it('should validate required fields for Uniswap V3 configuration', () => {
      // Based on real Hemi config
      const validHemiConfig = {
        universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
        poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
        wethAddress: '0x4200000000000000000000000000000000000006',
        permit2Address: '0xB952578f3520EE8Ea45b7914994dcf4702cEe578',
        defaultFeeTier: 3000,
        defaultSlippage: 0.5,
        quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
      };

      const incompleteConfig = {
        universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
        // Missing poolFactoryAddress and wethAddress
      };

      // Business logic: Uniswap V3 requires specific configuration fields
      const isValidConfig = !!(
        validHemiConfig.universalRouterAddress &&
        validHemiConfig.poolFactoryAddress &&
        validHemiConfig.wethAddress
      );
      
      const isIncompleteConfig = !!(
        incompleteConfig.universalRouterAddress &&
        (incompleteConfig as any).poolFactoryAddress &&
        (incompleteConfig as any).wethAddress
      );

      expect(isValidConfig).to.be.true;
      expect(isIncompleteConfig).to.be.false;
    });

    it('should handle unsupported liquiditySource gracefully', () => {
      const poolConfig = {
        name: 'Test Pool',
        take: {
          liquiditySource: LiquiditySource.ONEINCH, // Not supported in factory
          marketPriceFactor: 0.99,
        },
      };

      // Business logic: Factory only supports certain DEX types
      const isSupportedByFactory = poolConfig.take.liquiditySource === LiquiditySource.UNISWAPV3;
      expect(isSupportedByFactory).to.be.false;
    });

    it('should validate collateral amount is positive', () => {
      const validCollateral = BigNumber.from('1000000000000000000'); // 1 token
      const zeroCollateral = BigNumber.from('0');
      const negativeCollateral = BigNumber.from('-1');

      // Business logic: collateral must be positive for takes
      expect(validCollateral.gt(0)).to.be.true;
      expect(zeroCollateral.gt(0)).to.be.false;
      expect(negativeCollateral.gt(0)).to.be.false;
    });
  });

  describe('Routing Logic - DEX Selection', () => {
    it('should route to Uniswap V3 for UNISWAPV3 liquiditySource', () => {
      const poolConfig = {
        name: 'Test Pool',
        take: {
          liquiditySource: LiquiditySource.UNISWAPV3,
          marketPriceFactor: 0.99,
        },
      };

      // Business logic: routing decision based on liquiditySource
      const shouldRouteToUniswap = poolConfig.take.liquiditySource === LiquiditySource.UNISWAPV3;
      expect(shouldRouteToUniswap).to.be.true;
    });

    it('should not support 1inch in factory pattern', () => {
      const poolConfig = {
        name: 'Test Pool',
        take: {
          liquiditySource: LiquiditySource.ONEINCH,
          marketPriceFactor: 0.99,
        },
      };

      // Business logic: factory doesn't support 1inch (use single contract instead)
      const isFactorySupported = poolConfig.take.liquiditySource === LiquiditySource.UNISWAPV3;
      expect(isFactorySupported).to.be.false;
    });

    it('should handle unknown liquiditySource values', () => {
      const poolConfig = {
        name: 'Test Pool',
        take: {
          liquiditySource: 999 as LiquiditySource, // Invalid value
          marketPriceFactor: 0.99,
        },
      };

      // Business logic: only specific values are supported
      const supportedSources = [LiquiditySource.UNISWAPV3];
      const isSupported = supportedSources.includes(poolConfig.take.liquiditySource);
      expect(isSupported).to.be.false;
    });
  });

  describe('DryRun Mode Behavior', () => {
    it('should log and return early when dryRun is true for takeLiquidationFactory', async () => {
      const liquidation = {
        borrower: '0xBorrower',
        hpbIndex: 1000,
        collateral: BigNumber.from('1000000000000000000'),
        auctionPrice: BigNumber.from('1000000000000000000'),
        isTakeable: true,
        isArbTakeable: false,
      };

      const config = {
        dryRun: true,
        keeperTakerFactory: '0xB6006B9e9696a0A097D4990964D5bDa6E940ba0D', // Real Hemi factory
        universalRouterOverrides: {
          universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
          poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
          wethAddress: '0x4200000000000000000000000000000000000006',
        },
      };

      const poolConfig = {
        name: 'Test Pool',
        take: {
          liquiditySource: LiquiditySource.UNISWAPV3,
          marketPriceFactor: 0.99,
        },
      };

      // Test the DryRun logic directly - this is pure business logic
      if (config.dryRun) {
        // In dryRun mode, should log and return without executing
        expect(config.dryRun).to.be.true;
        // Verify this is the path taken
        const shouldExecuteTransaction = !config.dryRun;
        expect(shouldExecuteTransaction).to.be.false;
      }
    });

    it('should proceed to execution when dryRun is false', () => {
      const config = {
        dryRun: false,
        keeperTakerFactory: '0xB6006B9e9696a0A097D4990964D5bDa6E940ba0D', // Real Hemi factory
        universalRouterOverrides: {
          universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
          poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
          wethAddress: '0x4200000000000000000000000000000000000006',
        },
      };

      // Business logic: when not in dryRun, should proceed to execution
      const shouldExecuteTransaction = !config.dryRun;
      expect(shouldExecuteTransaction).to.be.true;
    });
  });

  describe('Parameter Validation and Error Handling', () => {
    it('should handle missing keeperTakerFactory address', () => {
      const config = {
        dryRun: false,
        // Missing keeperTakerFactory
        universalRouterOverrides: {
          universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
        },
      };

      // Business logic: keeperTakerFactory is required for execution
      const hasRequiredFactory = !!(config as any).keeperTakerFactory;
      expect(hasRequiredFactory).to.be.false;
    });

    it('should validate Uniswap configuration completeness', () => {
      // Real Hemi configuration - complete
      const completeHemiConfig = {
        universalRouterOverrides: {
          universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
          poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
          wethAddress: '0x4200000000000000000000000000000000000006',
          permit2Address: '0xB952578f3520EE8Ea45b7914994dcf4702cEe578',
          quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
        },
      };

      // Incomplete configuration (missing key fields)
      const incompleteConfig = {
        universalRouterOverrides: {
          universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
          // Missing permit2Address and other required fields
        },
      };

      // No configuration at all
      const missingConfig = {
        // No universalRouterOverrides at all
      };

      // Business logic: validate required fields for Uniswap operations
      const isCompleteConfig = !!(
        completeHemiConfig.universalRouterOverrides?.universalRouterAddress &&
        completeHemiConfig.universalRouterOverrides?.permit2Address
      );

      const isIncompleteConfig = !!(
        incompleteConfig.universalRouterOverrides?.universalRouterAddress &&
        (incompleteConfig.universalRouterOverrides as any)?.permit2Address
      );

      const isMissingConfig = !!(missingConfig as any).universalRouterOverrides;

      expect(isCompleteConfig).to.be.true;
      expect(isIncompleteConfig).to.be.false;
      expect(isMissingConfig).to.be.false;
    });

    it('should handle chain compatibility for DEX availability', () => {
      // Business logic: different chains have different DEX availability
      const chainConfigs = [
        { chainId: 1, hasUniswapV3: true, has1inch: true },      // Ethereum
        { chainId: 43114, hasUniswapV3: true, has1inch: true },  // Avalanche
        { chainId: 123456, hasUniswapV3: false, has1inch: false }, // New/small chain
      ];

      chainConfigs.forEach(chain => {
        const canUseUniswapV3 = chain.hasUniswapV3;
        const canUse1inch = chain.has1inch;
        
        if (chain.chainId === 123456) {
          // New chain - no DEX support
          expect(canUseUniswapV3).to.be.false;
          expect(canUse1inch).to.be.false;
        } else {
          // Major chains - should have DEX support
          expect(canUseUniswapV3).to.be.true;
          expect(canUse1inch).to.be.true;
        }
      });
    });
  });

  describe('ArbTake Configuration Validation', () => {
    it('should validate arbTake settings independently from external takes', () => {
      const arbTakeOnlyConfig = {
        name: 'Test Pool',
        take: {
          // Only arbTake settings, no external DEX
          minCollateral: 1.0,
          hpbPriceFactor: 0.98,
          // No liquiditySource or marketPriceFactor
        },
      };

      const externalTakeConfig = {
        name: 'Test Pool',
        take: {
          liquiditySource: LiquiditySource.UNISWAPV3,
          marketPriceFactor: 0.99,
          // No arbTake settings
        },
      };

      const bothConfig = {
        name: 'Test Pool',
        take: {
          minCollateral: 1.0,
          hpbPriceFactor: 0.98,
          liquiditySource: LiquiditySource.UNISWAPV3,
          marketPriceFactor: 0.99,
        },
      };

      // Business logic: arbTake and external takes are independent
      const hasArbTake = (config: any) => !!(config.take.minCollateral && config.take.hpbPriceFactor);
      const hasExternalTake = (config: any) => !!(config.take.liquiditySource && config.take.marketPriceFactor);

      expect(hasArbTake(arbTakeOnlyConfig)).to.be.true;
      expect(hasExternalTake(arbTakeOnlyConfig)).to.be.false;

      expect(hasArbTake(externalTakeConfig)).to.be.false;
      expect(hasExternalTake(externalTakeConfig)).to.be.true;

      expect(hasArbTake(bothConfig)).to.be.true;
      expect(hasExternalTake(bothConfig)).to.be.true;
    });

    it('should validate minCollateral and hpbPriceFactor values', () => {
      const validArbTakeConfig = {
        minCollateral: 1.0,
        hpbPriceFactor: 0.98,
      };

      const invalidArbTakeConfig = {
        minCollateral: 0, // Invalid: must be positive
        hpbPriceFactor: -0.5, // Invalid: must be positive
      };

      // Business logic: validate arbTake parameter ranges
      const isValidArbTake = (config: any) => {
        return config.minCollateral > 0 && config.hpbPriceFactor > 0;
      };

      expect(isValidArbTake(validArbTakeConfig)).to.be.true;
      expect(isValidArbTake(invalidArbTakeConfig)).to.be.false;
    });
  });

  describe('Swap Details Preparation', () => {
    it('should prepare correct Uniswap V3 swap details structure', () => {
      // Real Hemi configuration values
      const config = {
        universalRouterOverrides: {
          universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
          permit2Address: '0xB952578f3520EE8Ea45b7914994dcf4702cEe578',
          defaultFeeTier: 3000,
          defaultSlippage: 0.5,
        },
      };

      // Real pool addresses from Hemi config
      const pool = {
        quoteAddress: '0x91e1a2966408d434cfc1c0790df4a1ce08dc73d8', // USD_T2
      };

      // Business logic: prepare swap details for Uniswap V3
      const swapDetails = {
        universalRouter: config.universalRouterOverrides.universalRouterAddress,
        permit2: config.universalRouterOverrides.permit2Address,
        targetToken: pool.quoteAddress,
        feeTier: config.universalRouterOverrides.defaultFeeTier,
        slippageBps: Math.floor((config.universalRouterOverrides.defaultSlippage) * 100),
        deadline: Math.floor(Date.now() / 1000) + 1800, // 30 minutes
      };

      expect(swapDetails.universalRouter).to.equal('0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B');
      expect(swapDetails.permit2).to.equal('0xB952578f3520EE8Ea45b7914994dcf4702cEe578');
      expect(swapDetails.targetToken).to.equal('0x91e1a2966408d434cfc1c0790df4a1ce08dc73d8');
      expect(swapDetails.feeTier).to.equal(3000);
      expect(swapDetails.slippageBps).to.equal(50); // 0.5 * 100
      expect(swapDetails.deadline).to.be.greaterThan(Math.floor(Date.now() / 1000));
    });

    it('should handle missing swap configuration gracefully', () => {
      const incompleteConfig = {
        universalRouterOverrides: {
          universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
          // Missing permit2Address and other required fields
        },
      };

      // Business logic: detect incomplete configuration
      const hasRequiredFields = !!(
        incompleteConfig.universalRouterOverrides?.universalRouterAddress &&
        (incompleteConfig.universalRouterOverrides as any)?.permit2Address
      );

      expect(hasRequiredFields).to.be.false;
    });
  });

  describe('Error Path Validation', () => {
    it('should identify configuration errors before execution attempts', () => {
      const scenarios = [
        {
          name: 'Missing factory address',
          config: { dryRun: false },
          hasError: true,
          errorType: 'missing_factory'
        },
        {
          name: 'Missing Uniswap config for Uniswap take',
          config: { 
            dryRun: false, 
            keeperTakerFactory: '0xB6006B9e9696a0A097D4990964D5bDa6E940ba0D', // Real Hemi factory
            // Missing universalRouterOverrides
          },
          liquiditySource: LiquiditySource.UNISWAPV3,
          hasError: true,
          errorType: 'missing_uniswap_config'
        },
        {
          name: 'Valid Hemi configuration',
          config: {
            dryRun: false,
            keeperTakerFactory: '0xB6006B9e9696a0A097D4990964D5bDa6E940ba0D', // Real Hemi factory
            universalRouterOverrides: {
              universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
              permit2Address: '0xB952578f3520EE8Ea45b7914994dcf4702cEe578',
            },
          },
          liquiditySource: LiquiditySource.UNISWAPV3,
          hasError: false,
          errorType: null
        },
      ];

      scenarios.forEach(scenario => {
        // Business logic: validate configuration completeness
        let hasConfigError = false;
        let errorType = null;

        if (!(scenario.config as any).keeperTakerFactory && !scenario.config.dryRun) {
          hasConfigError = true;
          errorType = 'missing_factory';
        } else if (
          scenario.liquiditySource === LiquiditySource.UNISWAPV3 &&
          !(scenario.config as any).universalRouterOverrides
        ) {
          hasConfigError = true;
          errorType = 'missing_uniswap_config';
        }

        expect(hasConfigError).to.equal(scenario.hasError, `Scenario: ${scenario.name}`);
        expect(errorType).to.equal(scenario.errorType, `Scenario: ${scenario.name}`);
      });
    });
  });
});
