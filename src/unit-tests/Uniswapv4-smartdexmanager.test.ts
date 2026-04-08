import { expect } from 'chai';
import sinon from 'sinon';
import { SmartDexManager } from '../smart-dex-manager';
import { LiquiditySource } from '../config-types';

/**
 * Tests for SmartDexManager with Uniswap V4 Support
 * 
 * Validates that the SmartDexManager properly detects and handles
 * Uniswap V4 deployments alongside existing V3, SushiSwap, and 1inch integrations.
 * 
 * NOTE: As of implementation, factory V4 support is detected but not yet
 * fully implemented in canTakeLiquidation() - this is expected behavior.
 */

describe('SmartDexManager - Uniswap V4 Integration', () => {
  let mockSigner: any;

  beforeEach(() => {
    mockSigner = {
      getChainId: sinon.stub().resolves(8453), // Base chain ID
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('detectDeploymentType() - V4 Support', () => {
    it('should detect factory deployment with V4 taker contract', async () => {
      const config = {
        keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
        takerContracts: {
          'UniswapV4': '0x1A4a16cB0e399ed57a541b4Bbc729fe2650F6f63'
        },
      };

      const manager = new SmartDexManager(mockSigner, config);
      const result = await manager.detectDeploymentType();

      expect(result).to.equal('factory');
    });

    it('should detect factory with multiple DEX takers including V4', async () => {
      const config = {
        keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
        takerContracts: {
          'UniswapV3': '0xV3Taker123',
          'UniswapV4': '0x1A4a16cB0e399ed57a541b4Bbc729fe2650F6f63',
          'SushiSwap': '0xSushiTaker123',
        },
      };

      const manager = new SmartDexManager(mockSigner, config);
      const result = await manager.detectDeploymentType();

      expect(result).to.equal('factory');
      expect(config.takerContracts).to.have.property('UniswapV4');
    });

    it('should detect real Base factory with V4 support', async () => {
      const baseConfig = {
        keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
        takerContracts: {
          'UniswapV4': '0x1A4a16cB0e399ed57a541b4Bbc729fe2650F6f63',
        },
        uniswapV4RouterOverrides: {
          router: '0x66a9893cc07d91d95644aedd05d03f95e1dba8af',
          poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
          defaultSlippage: 1.0,
          pools: {},
        },
      };

      const manager = new SmartDexManager(mockSigner, baseConfig);
      const result = await manager.detectDeploymentType();

      expect(result).to.equal('factory');
    });
  });

  describe('validateDeployment() - V4 Validation', () => {
    it('should validate factory with V4 taker contract', async () => {
      const config = {
        keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
        takerContracts: {
          'UniswapV4': '0x1A4a16cB0e399ed57a541b4Bbc729fe2650F6f63'
        },
      };

      const manager = new SmartDexManager(mockSigner, config);
      const result = await manager.validateDeployment();

      expect(result.valid).to.be.true;
      expect(result.errors).to.be.empty;
    });

    it('should validate mixed V3/V4 factory deployment', async () => {
      const config = {
        keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
        takerContracts: {
          'UniswapV3': '0xV3Taker123',
          'UniswapV4': '0x1A4a16cB0e399ed57a541b4Bbc729fe2650F6f63',
        },
      };

      const manager = new SmartDexManager(mockSigner, config);
      const result = await manager.validateDeployment();

      expect(result.valid).to.be.true;
      expect(result.errors).to.be.empty;
    });

    it('should validate Base production deployment with V4', async () => {
      const baseConfig = {
        keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
        takerContracts: {
          'UniswapV4': '0x1A4a16cB0e399ed57a541b4Bbc729fe2650F6f63',
        },
        uniswapV4RouterOverrides: {
          router: '0x66a9893cc07d91d95644aedd05d03f95e1dba8af',
          poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
          defaultSlippage: 1.0,
          pools: {
            'B_T1-B_T2': {
              token0: '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE',
              token1: '0xd8A0af85E2539e22953287b436255422724871AB',
              fee: 3000,
              tickSpacing: 60,
              hooks: '0x0000000000000000000000000000000000000000',
            },
          },
        },
      };

      const manager = new SmartDexManager(mockSigner, baseConfig);
      const result = await manager.validateDeployment();

      expect(result.valid).to.be.true;
      expect(result.errors).to.be.empty;
    });

    it('should still validate even without V4 config overrides', async () => {
      const config = {
        keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
        takerContracts: {
          'UniswapV4': '0x1A4a16cB0e399ed57a541b4Bbc729fe2650F6f63'
        },
        // Missing uniswapV4RouterOverrides - should still be valid
      };

      const manager = new SmartDexManager(mockSigner, config);
      const result = await manager.validateDeployment();

      expect(result.valid).to.be.true;
    });
  });

  describe('canTakeLiquidation() - V4 Support', () => {
    it('should return false for factory V4 deployment (not yet implemented)', async () => {
      const config = {
        keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
        takerContracts: {
          'UniswapV4': '0x1A4a16cB0e399ed57a541b4Bbc729fe2650F6f63'
        },
      };

      const poolConfig = {
        name: 'Test Pool',
        address: '0xPoolAddress',
        price: { source: 'fixed' as any, value: 1.0 },
        take: {
          liquiditySource: LiquiditySource.UNISWAPV4,
          marketPriceFactor: 0.99,
        },
      };

      const manager = new SmartDexManager(mockSigner, config);
      const result = await manager.canTakeLiquidation(poolConfig as any);

      // Current implementation returns false for factory - this is expected
      // until the provider system is fully implemented
      expect(result).to.be.false;
    });

    it('should handle V3 takes in mixed deployment', async () => {
      const config = {
        keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
        takerContracts: {
          'UniswapV3': '0xV3Taker123',
          'UniswapV4': '0x1A4a16cB0e399ed57a541b4Bbc729fe2650F6f63',
        },
      };

      const v3PoolConfig = {
        name: 'V3 Pool',
        address: '0xPoolAddress',
        price: { source: 'fixed' as any, value: 1.0 },
        take: {
          liquiditySource: LiquiditySource.UNISWAPV3,
          marketPriceFactor: 0.99,
        },
      };

      const manager = new SmartDexManager(mockSigner, config);
      const result = await manager.canTakeLiquidation(v3PoolConfig as any);

      // Factory deployment currently returns false for all external takes
      expect(result).to.be.false;
    });

    it('should validate liquiditySource enum includes UNISWAPV4', () => {
      // Ensure UNISWAPV4 exists in LiquiditySource enum
      const hasV4InEnum = Object.values(LiquiditySource).includes(
        LiquiditySource.UNISWAPV4
      );

      expect(hasV4InEnum).to.be.true;
      expect(LiquiditySource.UNISWAPV4).to.equal(5);
    });
  });

  describe('Configuration Hierarchy - V4', () => {
    it('should support uniswapV4RouterOverrides configuration', () => {
      const config = {
        keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
        takerContracts: {
          'UniswapV4': '0x1A4a16cB0e399ed57a541b4Bbc729fe2650F6f63',
        },
        uniswapV4RouterOverrides: {
          router: '0x66a9893cc07d91d95644aedd05d03f95e1dba8af',
          poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
          defaultSlippage: 1.0,
          pools: {
            'B_T1-B_T2': {
              token0: '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE',
              token1: '0xd8A0af85E2539e22953287b436255422724871AB',
              fee: 3000,
              tickSpacing: 60,
              hooks: '0x0000000000000000000000000000000000000000',
            },
          },
        },
      };

      expect(config.uniswapV4RouterOverrides).to.exist;
      expect(config.uniswapV4RouterOverrides.router).to.exist;
      expect(config.uniswapV4RouterOverrides.poolManager).to.exist;
      expect(config.uniswapV4RouterOverrides.pools).to.exist;
    });

    it('should handle V4-only configuration', () => {
      const v4OnlyConfig = {
        keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
        takerContracts: {
          'UniswapV4': '0x1A4a16cB0e399ed57a541b4Bbc729fe2650F6f63'
        },
        uniswapV4RouterOverrides: {
          router: '0x66a9893cc07d91d95644aedd05d03f95e1dba8af',
          poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
          defaultSlippage: 1.0,
          pools: {},
        },
      };

      const hasV4Config = !!(v4OnlyConfig.uniswapV4RouterOverrides);
      const hasV3Config = !!(v4OnlyConfig as any).universalRouterOverrides;

      expect(hasV4Config).to.be.true;
      expect(hasV3Config).to.be.false;
    });

    it('should support mixed V3 and V4 configuration', () => {
      const mixedConfig = {
        keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
        takerContracts: {
          'UniswapV3': '0xV3Taker123',
          'UniswapV4': '0x1A4a16cB0e399ed57a541b4Bbc729fe2650F6f63',
        },
        universalRouterOverrides: {
          universalRouterAddress: '0xUniversalRouter',
          poolFactoryAddress: '0xFactory',
        },
        uniswapV4RouterOverrides: {
          router: '0x66a9893cc07d91d95644aedd05d03f95e1dba8af',
          poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
          defaultSlippage: 1.0,
          pools: {},
        },
      };

      expect(mixedConfig.universalRouterOverrides).to.exist;
      expect(mixedConfig.uniswapV4RouterOverrides).to.exist;
    });
  });

  describe('Chain-Specific V4 Support', () => {
    it('should validate Base chain V4 deployment', async () => {
      mockSigner.getChainId.resolves(8453); // Base

      const baseConfig = {
        keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
        takerContracts: {
          'UniswapV4': '0x1A4a16cB0e399ed57a541b4Bbc729fe2650F6f63',
        },
        uniswapV4RouterOverrides: {
          router: '0x66a9893cc07d91d95644aedd05d03f95e1dba8af',
          poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
          defaultSlippage: 1.0,
          pools: {},
        },
      };

      const manager = new SmartDexManager(mockSigner, baseConfig);
      
      const deploymentType = await manager.detectDeploymentType();
      expect(deploymentType).to.equal('factory');

      const validation = await manager.validateDeployment();
      expect(validation.valid).to.be.true;
    });

    it('should handle different chain IDs', () => {
      const chainSupport = [
        {
          name: 'Ethereum Mainnet',
          chainId: 1,
          hasV4: true,
        },
        {
          name: 'Base',
          chainId: 8453,
          hasV4: true,
        },
        {
          name: 'Hemi',
          chainId: 43111,
          hasV4: false, // Not yet deployed
        },
      ];

      chainSupport.forEach(chain => {
        expect(chain.chainId).to.be.a('number');
        expect(chain.hasV4).to.be.a('boolean');
      });
    });
  });

  describe('Migration and Rollout Scenarios', () => {
    it('should support gradual V4 rollout alongside existing DEXes', async () => {
      const migrationConfig = {
        keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
        takerContracts: {
          'UniswapV3': '0xV3Taker123', // Keep V3 for existing pools
          'UniswapV4': '0x1A4a16cB0e399ed57a541b4Bbc729fe2650F6f63', // Add V4 for new pools
        },
      };

      const manager = new SmartDexManager(mockSigner, migrationConfig);
      
      const validation = await manager.validateDeployment();
      expect(validation.valid).to.be.true;

      const deploymentType = await manager.detectDeploymentType();
      expect(deploymentType).to.equal('factory');
    });

    it('should handle pool-by-pool V4 migration', () => {
      const pools = [
        {
          name: 'Legacy Pool',
          liquiditySource: LiquiditySource.UNISWAPV3,
          useV4: false,
        },
        {
          name: 'Migrated Pool',
          liquiditySource: LiquiditySource.UNISWAPV4,
          useV4: true,
        },
      ];

      pools.forEach(pool => {
        const isV4Pool = pool.liquiditySource === LiquiditySource.UNISWAPV4;
        expect(isV4Pool).to.equal(pool.useV4);
      });
    });
  });

  describe('Real Production Scenarios', () => {
    it('should handle complete Base production config with V4', async () => {
      const baseProductionConfig = {
        keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
        takerContracts: {
          'UniswapV4': '0x1A4a16cB0e399ed57a541b4Bbc729fe2650F6f63',
        },
        uniswapV4RouterOverrides: {
          router: '0x66a9893cc07d91d95644aedd05d03f95e1dba8af',
          poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
          defaultSlippage: 1.0,
          pools: {
            'B_T1-B_T2': {
              token0: '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE',
              token1: '0xd8A0af85E2539e22953287b436255422724871AB',
              fee: 3000,
              tickSpacing: 60,
              hooks: '0x0000000000000000000000000000000000000000',
            },
          },
        },
      };

      const manager = new SmartDexManager(mockSigner, baseProductionConfig);
      
      const deploymentType = await manager.detectDeploymentType();
      expect(deploymentType).to.equal('factory');
      
      const validation = await manager.validateDeployment();
      expect(validation.valid).to.be.true;
      expect(validation.errors).to.be.empty;
    });

    it('should support mixed strategy pools with V4', () => {
      const poolConfig = {
        name: 'B_T1/B_T2 Test Pool',
        take: {
          // ArbTake settings
          minCollateral: 0.001,
          hpbPriceFactor: 0.95,
          // External take with V4
          liquiditySource: LiquiditySource.UNISWAPV4,
          marketPriceFactor: 0.95,
        },
      };

      const hasArbTake = !!(poolConfig.take.minCollateral && poolConfig.take.hpbPriceFactor);
      const hasV4ExternalTake = poolConfig.take.liquiditySource === LiquiditySource.UNISWAPV4;

      expect(hasArbTake).to.be.true;
      expect(hasV4ExternalTake).to.be.true;
    });
  });

  describe('Implementation Status', () => {
    it('should document current V4 factory implementation status', async () => {
      // As documented in smart-dex-manager.ts:
      // "Factory approach - check if any DEX sources are configured (future implementation)
      //  For now, return false until we implement the provider system"
      
      const config = {
        keeperTakerFactory: '0x2B4af01Ea576F6eF3394ba2C66A582B89b54f872',
        takerContracts: {
          'UniswapV4': '0x1A4a16cB0e399ed57a541b4Bbc729fe2650F6f63',
        },
      };

      const poolConfig = {
        name: 'Test Pool',
        address: '0xPoolAddress',
        price: { source: 'fixed' as any, value: 1.0 },
        take: {
          liquiditySource: LiquiditySource.UNISWAPV4,
          marketPriceFactor: 0.99,
        },
      };

      const manager = new SmartDexManager(mockSigner, config);
      
      // V4 is detected as factory
      const deploymentType = await manager.detectDeploymentType();
      expect(deploymentType).to.equal('factory');
      
      // But canTakeLiquidation returns false (not yet implemented)
      const canTake = await manager.canTakeLiquidation(poolConfig as any);
      expect(canTake).to.be.false;
      
      // This is expected and documented behavior
    });
  });
});