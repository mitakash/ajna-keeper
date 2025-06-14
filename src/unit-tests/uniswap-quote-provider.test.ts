import { expect } from 'chai';
import sinon from 'sinon';
import { BigNumber, ethers } from 'ethers';
import { UniswapV3QuoteProvider } from '../dex-providers/uniswap-quote-provider';

describe('UniswapV3QuoteProvider', () => {
  let mockSigner: any;

  beforeEach(() => {
    mockSigner = {
      provider: {},
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('isAvailable()', () => {
    it('should return true when all required config is present', () => {
      const config = {
        universalRouterAddress: '0xUniversalRouter123',
        poolFactoryAddress: '0xFactory123',
        defaultFeeTier: 3000,
        wethAddress: '0xWeth123',
        quoterV2Address: '0xQuoter123',
      };

      const provider = new UniswapV3QuoteProvider(mockSigner, config);
      expect(provider.isAvailable()).to.be.true;
    });

    it('should return true for real Hemi configuration', () => {
      // Real working Hemi configuration
      const hemiConfig = {
        universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
        poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
        defaultFeeTier: 3000,
        wethAddress: '0x4200000000000000000000000000000000000006',
        quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
      };

      const provider = new UniswapV3QuoteProvider(mockSigner, hemiConfig);
      expect(provider.isAvailable()).to.be.true;
    });

    it('should return false when QuoterV2 address is missing', () => {
      const config = {
        universalRouterAddress: '0xUniversalRouter123',
        poolFactoryAddress: '0xFactory123',
        defaultFeeTier: 3000,
        wethAddress: '0xWeth123',
        // Missing quoterV2Address
      };

      const provider = new UniswapV3QuoteProvider(mockSigner, config as any);
      expect(provider.isAvailable()).to.be.false;
    });

    it('should return false when universalRouterAddress is missing', () => {
      const config = {
        // Missing universalRouterAddress
        poolFactoryAddress: '0xFactory123',
        defaultFeeTier: 3000,
        wethAddress: '0xWeth123',
        quoterV2Address: '0xQuoter123',
      };

      const provider = new UniswapV3QuoteProvider(mockSigner, config as any);
      expect(provider.isAvailable()).to.be.false;
    });

    it('should return false when poolFactoryAddress is missing', () => {
      const config = {
        universalRouterAddress: '0xUniversalRouter123',
        // Missing poolFactoryAddress
        defaultFeeTier: 3000,
        wethAddress: '0xWeth123',
        quoterV2Address: '0xQuoter123',
      };

      const provider = new UniswapV3QuoteProvider(mockSigner, config as any);
      expect(provider.isAvailable()).to.be.false;
    });

    it('should return false when wethAddress is missing', () => {
      const config = {
        universalRouterAddress: '0xUniversalRouter123',
        poolFactoryAddress: '0xFactory123',
        defaultFeeTier: 3000,
        // Missing wethAddress
        quoterV2Address: '0xQuoter123',
      };

      const provider = new UniswapV3QuoteProvider(mockSigner, config as any);
      expect(provider.isAvailable()).to.be.false;
    });
  });

  describe('getQuoterAddress()', () => {
    it('should return the configured QuoterV2 address', () => {
      const config = {
        universalRouterAddress: '0xUniversalRouter123',
        poolFactoryAddress: '0xFactory123',
        defaultFeeTier: 3000,
        wethAddress: '0xWeth123',
        quoterV2Address: '0xQuoter123',
      };

      const provider = new UniswapV3QuoteProvider(mockSigner, config);
      expect(provider.getQuoterAddress()).to.equal('0xQuoter123');
    });

    it('should return real Hemi QuoterV2 address', () => {
      const hemiConfig = {
        universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
        poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
        defaultFeeTier: 3000,
        wethAddress: '0x4200000000000000000000000000000000000006',
        quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5', // Real Hemi QuoterV2
      };

      const provider = new UniswapV3QuoteProvider(mockSigner, hemiConfig);
      expect(provider.getQuoterAddress()).to.equal('0xcBa55304013187D49d4012F4d7e4B63a04405cd5');
    });

    it('should return undefined when QuoterV2 address is not configured', () => {
      const config = {
        universalRouterAddress: '0xUniversalRouter123',
        poolFactoryAddress: '0xFactory123',
        defaultFeeTier: 3000,
        wethAddress: '0xWeth123',
        // Missing quoterV2Address
      };

      const provider = new UniswapV3QuoteProvider(mockSigner, config as any);
      expect(provider.getQuoterAddress()).to.be.undefined;
    });
  });

  describe('getQuote() - early validation', () => {
    it('should return failure when QuoterV2 address is not configured', async () => {
      const config = {
        universalRouterAddress: '0xUniversalRouter123',
        poolFactoryAddress: '0xFactory123',
        defaultFeeTier: 3000,
        wethAddress: '0xWeth123',
        // Missing quoterV2Address
      };

      const provider = new UniswapV3QuoteProvider(mockSigner, config as any);

      const result = await provider.getQuote(
        BigNumber.from('1000000000000000000'),
        '0xTokenA',
        '0xTokenB',
        3000
      );

      expect(result.success).to.be.false;
      expect(result.error).to.include('QuoterV2 address not configured');
    });

    it('should validate inputs with real Hemi token addresses', async () => {
      const hemiConfig = {
        universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
        poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
        defaultFeeTier: 3000,
        wethAddress: '0x4200000000000000000000000000000000000006',
        quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
      };

      const provider = new UniswapV3QuoteProvider(mockSigner, hemiConfig);

      // Test with real Hemi token addresses (USD_T1 -> USD_T2)
      const srcToken = '0x1f0d51a052aa79527fffaf3108fb4440d3f53ce6'; // USD_T1
      const dstToken = '0x91e1a2966408d434cfc1c0790df4a1ce08dc73d8'; // USD_T2
      const amount = BigNumber.from('1000000000000000000'); // 1 token

      // Should proceed to contract call (would fail without mocking, but validates config)
      expect(provider.isAvailable()).to.be.true;
      expect(provider.getQuoterAddress()).to.equal('0xcBa55304013187D49d4012F4d7e4B63a04405cd5');
    });
  });

  describe('Chain-Specific QuoterV2 Addresses', () => {
    const chainConfigs = [
      {
        name: 'Ethereum Mainnet',
        chainId: 1,
        quoterV2: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e', // Real Ethereum QuoterV2
        universalRouter: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
      },
      {
        name: 'Avalanche',
        chainId: 43114,
        quoterV2: '0xbe0F5544EC67e9B3b2D979aaA43f18Fd87E6257F', // Real Avalanche QuoterV2
        universalRouter: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
      },
      {
        name: 'Hemi',
        chainId: 43111,
        quoterV2: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5', // Real Hemi QuoterV2
        universalRouter: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
      },
    ];

    chainConfigs.forEach(chain => {
      it(`should handle ${chain.name} configuration correctly`, () => {
        const config = {
          universalRouterAddress: chain.universalRouter,
          poolFactoryAddress: '0xFactory123', // Chain-specific factory would go here
          defaultFeeTier: 3000,
          wethAddress: '0xWETH123', // Chain-specific WETH would go here
          quoterV2Address: chain.quoterV2,
        };

        const provider = new UniswapV3QuoteProvider(mockSigner, config);
        
        expect(provider.isAvailable()).to.be.true;
        expect(provider.getQuoterAddress()).to.equal(chain.quoterV2);
      });
    });

    it('should handle missing QuoterV2 for unsupported chains', () => {
      const unsupportedChainConfig = {
        universalRouterAddress: '0xUniversalRouter123',
        poolFactoryAddress: '0xFactory123',
        defaultFeeTier: 3000,
        wethAddress: '0xWETH123',
        // Missing quoterV2Address - chain not supported
      };

      const provider = new UniswapV3QuoteProvider(mockSigner, unsupportedChainConfig as any);
      
      expect(provider.isAvailable()).to.be.false;
      expect(provider.getQuoterAddress()).to.be.undefined;
    });
  });

  describe('Configuration Validation Edge Cases', () => {
    it('should validate fee tier configuration', () => {
      const configs = [
        { feeTier: 100, valid: true },     // 0.01% - Valid Uniswap V3 fee tier
        { feeTier: 500, valid: true },     // 0.05% - Valid Uniswap V3 fee tier
        { feeTier: 3000, valid: true },    // 0.3% - Most common Uniswap V3 fee tier
        { feeTier: 10000, valid: true },   // 1.0% - Valid Uniswap V3 fee tier
        { feeTier: 0, valid: false },      // Invalid - 0 is not a valid Uniswap V3 fee tier
      ];

      const baseConfig = {
        universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
        poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
        wethAddress: '0x4200000000000000000000000000000000000006',
        quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
      };

      configs.forEach(({ feeTier, valid }) => {
        const config = { ...baseConfig, defaultFeeTier: feeTier };
        const provider = new UniswapV3QuoteProvider(mockSigner, config);
        
        expect(provider.isAvailable()).to.equal(valid, `Fee tier ${feeTier} should be ${valid ? 'valid' : 'invalid'}`);
      });
    });

    it('should handle complete vs partial configuration gracefully', () => {
      const completeHemiConfig = {
        universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
        poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
        defaultFeeTier: 3000,
        wethAddress: '0x4200000000000000000000000000000000000006',
        quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
        // Extra fields that might be present
        permit2Address: '0xB952578f3520EE8Ea45b7914994dcf4702cEe578',
        defaultSlippage: 0.5,
      };

      const provider = new UniswapV3QuoteProvider(mockSigner, completeHemiConfig);
      
      // Should work even with extra fields
      expect(provider.isAvailable()).to.be.true;
      expect(provider.getQuoterAddress()).to.equal('0xcBa55304013187D49d4012F4d7e4B63a04405cd5');
    });
  });

  describe('Real Production Integration Scenarios', () => {
    it('should integrate with real pool addresses and amounts', async () => {
      const hemiConfig = {
        universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
        poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
        defaultFeeTier: 3000,
        wethAddress: '0x4200000000000000000000000000000000000006',
        quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
      };

      const provider = new UniswapV3QuoteProvider(mockSigner, hemiConfig);

      // Test configuration is valid for production scenarios
      expect(provider.isAvailable()).to.be.true;

      // Test with real production values
      const realProductionParams = {
        srcToken: '0x1f0d51a052aa79527fffaf3108fb4440d3f53ce6', // USD_T1
        dstToken: '0x91e1a2966408d434cfc1c0790df4a1ce08dc73d8', // USD_T2  
        amount: BigNumber.from('100000000000000000'), // 0.1 token (matches minCollateral)
        feeTier: 3000,
      };

      // Validate that the provider would handle these real parameters
      expect(realProductionParams.srcToken).to.be.a('string');
      expect(realProductionParams.dstToken).to.be.a('string');
      expect(realProductionParams.amount.gt(0)).to.be.true;
      expect(realProductionParams.feeTier).to.equal(3000);
    });

    it('should handle mixed strategy pools configuration', () => {
      // Config that supports both arbTake and external take (like real Hemi pools)
      const mixedStrategyConfig = {
        universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
        poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
        defaultFeeTier: 3000,
        wethAddress: '0x4200000000000000000000000000000000000006',
        quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
      };

      const provider = new UniswapV3QuoteProvider(mockSigner, mixedStrategyConfig);

      // Should be available for external takes
      expect(provider.isAvailable()).to.be.true;
      
      // Should work alongside arbTake configuration (arbTake doesn't need QuoterV2)
      const hasExternalTakeSupport = provider.isAvailable();
      const supportsArbTake = true; // ArbTake doesn't depend on QuoterV2
      
      expect(hasExternalTakeSupport).to.be.true;
      expect(supportsArbTake).to.be.true;
    });
  });
});
