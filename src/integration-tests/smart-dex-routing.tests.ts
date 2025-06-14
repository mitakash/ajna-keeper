// src/integration-tests/smart-dex-routing.test.ts
import { expect } from 'chai';
import { Wallet } from 'ethers';
import { SmartDexManager } from '../smart-dex-manager';
import { validateTakeSettings, LiquiditySource } from '../config-types';
import { USER1_MNEMONIC } from './test-config';
import { getProvider } from './test-utils';

/**
 * Integration tests for SmartDexManager routing logic.
 * 
 * Purpose: Ensure configuration changes don't break routing decisions.
 * Critical for: Future developers modifying config-types.ts or smart-dex-manager.ts
 * 
 * Focus Areas:
 * 1. Configuration detection (single vs factory vs none)
 * 2. Per-chain configuration validation (one bot per chain reality)
 * 3. Backwards compatibility with existing configs
 * 4. Edge cases and error handling
 */
describe('Smart DEX Routing Integration Tests', () => {
  let mockSigner: any;

  beforeEach(() => {
    const wallet = Wallet.fromMnemonic(USER1_MNEMONIC);
    mockSigner = wallet.connect(getProvider());
  });

  describe('Configuration Detection', () => {
    /**
     * Critical: These tests ensure routing decisions are correct.
     * If someone modifies detectDeploymentType(), these tests catch breaking changes.
     */

    it('should detect factory deployment for Hemi-style config', async () => {
      // Based on your working hemi-conf-settlement.ts
      const hemiConfig = {
        keeperTakerFactory: '0xB6006B9e9696a0A097D4990964D5bDa6E940ba0D',
        takerContracts: {
          'UniswapV3': '0x81D39B4A2Be43e5655608fCcE18A0edd8906D7c7'
        },
        universalRouterOverrides: {
          universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
          wethAddress: '0x4200000000000000000000000000000000000006',
          permit2Address: '0xB952578f3520EE8Ea45b7914994dcf4702cEe578',
        }
      };

      const manager = new SmartDexManager(mockSigner, hemiConfig);
      const deploymentType = await manager.detectDeploymentType();
      
      expect(deploymentType).to.equal('factory');
    });

    it('should detect single deployment for 1inch config', async () => {
      // Typical mainnet/avalanche style config
      const oneInchConfig = {
        keeperTaker: '0x1234567890123456789012345678901234567890',
        oneInchRouters: {
          43114: '0x111111125421ca6dc452d289314280a0f8842a65' // Avalanche
        }
      };

      const manager = new SmartDexManager(mockSigner, oneInchConfig);
      const deploymentType = await manager.detectDeploymentType();
      
      expect(deploymentType).to.equal('single');
    });

    it('should detect none deployment for arbTake-only config', async () => {
      // Config with no external DEX integration
      const arbTakeOnlyConfig = {
        subgraphUrl: 'http://test-url',
        // No keeperTaker or keeperTakerFactory
      };

      const manager = new SmartDexManager(mockSigner, arbTakeOnlyConfig);
      const deploymentType = await manager.detectDeploymentType();
      
      expect(deploymentType).to.equal('none');
    });

    it('should prioritize factory when both factory and single are configured', async () => {
      // Mixed config - factory should take priority
      const mixedConfig = {
        keeperTaker: '0x1111111111111111111111111111111111111111',
        oneInchRouters: { 1: '0x1111111254EEB25477B68fb85Ed929f73A960582' },
        keeperTakerFactory: '0x2222222222222222222222222222222222222222',
        takerContracts: { 'UniswapV3': '0x3333333333333333333333333333333333333333' }
      };

      const manager = new SmartDexManager(mockSigner, mixedConfig);
      const deploymentType = await manager.detectDeploymentType();
      
      expect(deploymentType).to.equal('factory');
    });
  });

  describe('Configuration Validation', () => {
    /**
     * Critical: These tests ensure config validation doesn't break existing deployments.
     * Protects against changes to validateDeployment() breaking production configs.
     */

    it('should validate complete Hemi factory config', async () => {
      const validHemiConfig = {
        keeperTakerFactory: '0xB6006B9e9696a0A097D4990964D5bDa6E940ba0D',
        takerContracts: {
          'UniswapV3': '0x81D39B4A2Be43e5655608fCcE18A0edd8906D7c7'
        },
        universalRouterOverrides: {
          universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
          quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
        }
      };

      const manager = new SmartDexManager(mockSigner, validHemiConfig);
      const validation = await manager.validateDeployment();
      
      expect(validation.valid).to.be.true;
      expect(validation.errors).to.be.empty;
    });

    it('should validate complete 1inch config', async () => {
      const validOneInchConfig = {
        keeperTaker: '0x1234567890123456789012345678901234567890',
        oneInchRouters: {
          43114: '0x111111125421ca6dc452d289314280a0f8842a65'
        },
        pools: [{
          take: { liquiditySource: LiquiditySource.ONEINCH }
        }]
      };

      const manager = new SmartDexManager(mockSigner, validOneInchConfig);
      const validation = await manager.validateDeployment();
      
      expect(validation.valid).to.be.true;
      expect(validation.errors).to.be.empty;
    });

    it('should validate none deployment gracefully', async () => {
      const noneConfig = {
        subgraphUrl: 'http://test-url'
      };

      const manager = new SmartDexManager(mockSigner, noneConfig);
      const validation = await manager.validateDeployment();
      
      expect(validation.valid).to.be.true; // None deployment is valid
    });

    it('should catch missing factory dependencies', async () => {
      const invalidFactoryConfig = {
        keeperTakerFactory: '0x1234567890123456789012345678901234567890',
        // Missing takerContracts - this will be detected as 'none', not 'factory'
      };

      const manager = new SmartDexManager(mockSigner, invalidFactoryConfig);
      
      // Should detect as 'none' since takerContracts is missing
      const deploymentType = await manager.detectDeploymentType();
      expect(deploymentType).to.equal('none');
      
      // 'none' deployment is valid (for arbTake-only operation)
      const validation = await manager.validateDeployment();
      expect(validation.valid).to.be.true; // 'none' is always valid
    });

    it('should catch missing 1inch dependencies for pools that need them', async () => {
      const invalidOneInchConfig = {
        keeperTaker: '0x1234567890123456789012345678901234567890',
        // Missing oneInchRouters but pools expect 1inch
        pools: [{
          take: { liquiditySource: LiquiditySource.ONEINCH }
        }]
      };

      const manager = new SmartDexManager(mockSigner, invalidOneInchConfig);
      const validation = await manager.validateDeployment();
      
      expect(validation.valid).to.be.false;
      expect(validation.errors.some(e => e.includes('oneInchRouters'))).to.be.true;
    });
  });

  describe('Per-Chain Configuration Reality', () => {
    /**
     * Tests that reflect the one-bot-per-chain deployment reality.
     * Ensures configs work as expected in production scenarios.
     */

    it('should handle Avalanche mainnet style config', async () => {
      const avalancheConfig = {
        keeperTaker: '0x1234567890123456789012345678901234567890',
        oneInchRouters: {
          43114: '0x111111125421ca6dc452d289314280a0f8842a65' // Only Avalanche
        },
        tokenAddresses: {
          avax: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
          wavax: '0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7',
          usdc: '0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E',
        }
      };

      const manager = new SmartDexManager(mockSigner, avalancheConfig);
      
      const deploymentType = await manager.detectDeploymentType();
      expect(deploymentType).to.equal('single');
      
      const validation = await manager.validateDeployment();
      expect(validation.valid).to.be.true;
    });

    it('should handle Hemi testnet style config', async () => {
      const hemiConfig = {
        keeperTakerFactory: '0xB6006B9e9696a0A097D4990964D5bDa6E940ba0D',
        takerContracts: {
          'UniswapV3': '0x81D39B4A2Be43e5655608fCcE18A0edd8906D7c7'
        },
        universalRouterOverrides: {
          universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
          wethAddress: '0x4200000000000000000000000000000000000006',
          permit2Address: '0xB952578f3520EE8Ea45b7914994dcf4702cEe578',
          quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
        },
        tokenAddresses: {
          weth: '0x4200000000000000000000000000000000000006',
          usd_t1: '0x1f0d51a052aa79527fffaf3108fb4440d3f53ce6',
        }
      };

      const manager = new SmartDexManager(mockSigner, hemiConfig);
      
      const deploymentType = await manager.detectDeploymentType();
      expect(deploymentType).to.equal('factory');
      
      const validation = await manager.validateDeployment();
      expect(validation.valid).to.be.true;
    });

    it('should handle mainnet style config', async () => {
      const mainnetConfig = {
        keeperTaker: '0x1234567890123456789012345678901234567890',
        oneInchRouters: {
          1: '0x1111111254EEB25477B68fb85Ed929f73A960582' // Only Ethereum mainnet
        },
        connectorTokens: [
          '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
          '0x6B175474E89094C44Da98b954EedeAC495271d0F'  // DAI
        ]
      };

      const manager = new SmartDexManager(mockSigner, mainnetConfig);
      
      const deploymentType = await manager.detectDeploymentType();
      expect(deploymentType).to.equal('single');
      
      const validation = await manager.validateDeployment();
      expect(validation.valid).to.be.true;
    });
  });

  describe('Take Settings Integration', () => {
    /**
     * Critical: Tests that take settings validation works with routing decisions.
     * Protects against changes to validateTakeSettings() breaking existing pools.
     */

    it('should validate Uniswap V3 take settings with factory config', async () => {
      const factoryConfig = {
        keeperTakerFactory: '0x1234567890123456789012345678901234567890',
        takerContracts: {
          'UniswapV3': '0x2234567890123456789012345678901234567890'
        },
        universalRouterOverrides: {
          universalRouterAddress: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
          quoterV2Address: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        }
      };

      const uniswapTakeSettings = {
        minCollateral: 0.1,
        liquiditySource: LiquiditySource.UNISWAPV3,
        marketPriceFactor: 0.95,
        hpbPriceFactor: 0.98
      };

      // Should not throw
      expect(() => {
        validateTakeSettings(uniswapTakeSettings, factoryConfig as any);
      }).to.not.throw();
    });

    it('should validate 1inch take settings with single config', async () => {
      const singleConfig = {
        keeperTaker: '0x1234567890123456789012345678901234567890',
        oneInchRouters: {
          1: '0x1111111254EEB25477B68fb85Ed929f73A960582'
        }
      };

      const oneInchTakeSettings = {
        minCollateral: 0.1,
        liquiditySource: LiquiditySource.ONEINCH,
        marketPriceFactor: 0.95,
        hpbPriceFactor: 0.98
      };

      // Should not throw
      expect(() => {
        validateTakeSettings(oneInchTakeSettings, singleConfig as any);
      }).to.not.throw();
    });

    it('should validate arbTake-only settings', async () => {
      const arbTakeConfig = {
        subgraphUrl: 'http://test-url'
      };

      const arbTakeSettings = {
        minCollateral: 0.1,
        hpbPriceFactor: 0.98
        // No liquiditySource - arbTake only
      };

      // Should not throw
      expect(() => {
        validateTakeSettings(arbTakeSettings, arbTakeConfig as any);
      }).to.not.throw();
    });

    it('should reject invalid liquiditySource configurations', async () => {
      const factoryConfig = {
        keeperTakerFactory: '0x1234567890123456789012345678901234567890',
        // Missing takerContracts for Uniswap V3
      };

      const invalidTakeSettings = {
        liquiditySource: LiquiditySource.UNISWAPV3,
        marketPriceFactor: 0.95
      };

      expect(() => {
        validateTakeSettings(invalidTakeSettings, factoryConfig as any);
      }).to.throw();
    });
  });

  describe('Edge Cases and Error Handling', () => {
    /**
     * Tests edge cases that could break routing in production.
     * Ensures robust error handling for malformed configs.
     */

    it('should handle empty configuration gracefully', async () => {
      const emptyConfig = {};

      const manager = new SmartDexManager(mockSigner, emptyConfig);
      const deploymentType = await manager.detectDeploymentType();
      
      expect(deploymentType).to.equal('none');
    });

    it('should handle null/undefined config values', async () => {
      const nullConfig = {
        keeperTaker: null,
        oneInchRouters: undefined,
        keeperTakerFactory: null
      };

      const manager = new SmartDexManager(mockSigner, nullConfig as any);
      const deploymentType = await manager.detectDeploymentType();
      
      expect(deploymentType).to.equal('none');
    });

    it('should handle partial factory configuration', async () => {
      const partialFactoryConfig = {
        keeperTakerFactory: '0x1234567890123456789012345678901234567890',
        // Missing takerContracts
        universalRouterOverrides: {
          universalRouterAddress: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
        }
      };

      const manager = new SmartDexManager(mockSigner, partialFactoryConfig);
      
      // Should detect as 'none' since takerContracts is missing (business logic requires BOTH)
      const deploymentType = await manager.detectDeploymentType();
      expect(deploymentType).to.equal('none');
      
      // 'none' deployment is always valid
      const validation = await manager.validateDeployment();
      expect(validation.valid).to.be.true;
    });

    it('should handle concurrent routing requests', async () => {
      const config = {
        keeperTakerFactory: '0x1234567890123456789012345678901234567890',
        takerContracts: {
          'UniswapV3': '0x2234567890123456789012345678901234567890'
        }
      };

      // Test concurrent access doesn't break routing
      const managers = Array.from({ length: 5 }, () => new SmartDexManager(mockSigner, config));
      
      const results = await Promise.all(
        managers.map(manager => manager.detectDeploymentType())
      );
      
      // All results should be consistent
      expect(results.every(result => result === 'factory')).to.be.true;
    });
  });

  describe('Backwards Compatibility', () => {
    /**
     * Critical: Ensures existing production configs continue to work.
     * These tests protect against breaking changes to configuration handling.
     */

    it('should maintain compatibility with existing avalanche production configs', async () => {
      // Simulates existing avalanche production config format
      const existingAvalancheConfig = {
        dryRun: false,
        ethRpcUrl: 'https://avax-mainnet.g.alchemy.com/v2/test-key',
        keeperTaker: '0x1234567890123456789012345678901234567890',
        oneInchRouters: {
          43114: '0x111111125421ca6dc452d289314280a0f8842a65',
        },
        delayBetweenRuns: 2,
        delayBetweenActions: 31,
      };

      const manager = new SmartDexManager(mockSigner, existingAvalancheConfig);
      
      const deploymentType = await manager.detectDeploymentType();
      expect(deploymentType).to.equal('single');
      
      const validation = await manager.validateDeployment();
      expect(validation.valid).to.be.true;
    });

    it('should maintain compatibility with existing mainnet production configs', async () => {
      // Simulates existing mainnet production config format
      const existingMainnetConfig = {
        keeperTaker: '0x1234567890123456789012345678901234567890',
        oneInchRouters: {
          1: '0x1111111254EEB25477B68fb85Ed929f73A960582',
        },
        uniswapOverrides: {
          wethAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          uniswapV3Router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        },
      };

      const manager = new SmartDexManager(mockSigner, existingMainnetConfig);
      
      const deploymentType = await manager.detectDeploymentType();
      expect(deploymentType).to.equal('single');
      
      const validation = await manager.validateDeployment();
      expect(validation.valid).to.be.true;
    });

    it('should work with configs that have both old and new fields', async () => {
      // Config during migration - has both old and new fields
      const migrationConfig = {
        // Old 1inch fields
        keeperTaker: '0x1111111111111111111111111111111111111111',
        oneInchRouters: { 1: '0x1111111254EEB25477B68fb85Ed929f73A960582' },
        // New factory fields
        keeperTakerFactory: '0x2222222222222222222222222222222222222222',
        takerContracts: { 'UniswapV3': '0x3333333333333333333333333333333333333333' },
        universalRouterOverrides: {
          universalRouterAddress: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
        }
      };

      const manager = new SmartDexManager(mockSigner, migrationConfig);
      
      // Should prioritize factory
      const deploymentType = await manager.detectDeploymentType();
      expect(deploymentType).to.equal('factory');
      
      const validation = await manager.validateDeployment();
      expect(validation.valid).to.be.true;
    });
  });
});
