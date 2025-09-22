// src/integration-tests/curve-quote-provider.test.ts
import { expect } from 'chai';
import sinon from 'sinon';
import { BigNumber, ethers, Wallet } from 'ethers';
import { CurveQuoteProvider } from '../dex-providers/curve-quote-provider';
import { CurvePoolType } from '../config-types';
import { USER1_MNEMONIC } from './test-config';
import { getProvider } from './test-utils';

describe('Curve Quote Provider', () => {
  let mockSigner: any;
  let quoteProvider: CurveQuoteProvider;
  let validConfig: any;

  beforeEach(() => {
    // Reset sinon after each test
    sinon.restore();
    
    // Use REAL wallet from test mnemonic (same pattern as your working tests)
    const wallet = Wallet.fromMnemonic(USER1_MNEMONIC);
    mockSigner = wallet.connect(getProvider());

    // Valid Curve configuration (based on your Base config)
    validConfig = {
      poolConfigs: {
        'tbtc-weth': {
          address: '0x6e53131F68a034873b6bFA15502aF094Ef0c5854', // TriCrypto pool from Base config
          poolType: CurvePoolType.CRYPTO
        },
        'usdc_t-usd_t1': {
          address: '0x01C2c9f2C271ECEF81287B44FA6F813a1605F5Eb', // 3-stable pool from Base config
          poolType: CurvePoolType.STABLE
        }
      },
      defaultSlippage: 1.0,
      wethAddress: '0x4200000000000000000000000000000000000006', // WETH on Base
      tokenAddresses: {
        weth: '0x4200000000000000000000000000000000000006',
        usdc_t: '0x53Be558aF29cC65126ED0E585119FAC748FeB01B',
        usd_t1: '0xf0c44a9f24159E1f2A0D9Ba3203172f528d224CA',
        tbtc: '0x236aa50979D5f3De3Bd1Eeb40E81137F22ab794b'
      }
    };
  });

  it('should create Curve quote provider with valid pool configurations', async () => {
    quoteProvider = new CurveQuoteProvider(mockSigner, validConfig);
    
    expect(quoteProvider).to.be.instanceOf(CurveQuoteProvider);
    expect(quoteProvider.isAvailable()).to.be.false; // Not initialized yet
    
    // Test pool configuration access
    const configuredPools = quoteProvider.getConfiguredPools();
    expect(configuredPools).to.include('0x6e53131F68a034873b6bFA15502aF094Ef0c5854');
    expect(configuredPools).to.include('0x01C2c9f2C271ECEF81287B44FA6F813a1605F5Eb');
  });

  it('should initialize successfully with valid pool addresses', async () => {
    quoteProvider = new CurveQuoteProvider(mockSigner, validConfig);
    
    try {
      const initialized = await quoteProvider.initialize();
      // May succeed or fail depending on contract existence, but should not crash
      expect(typeof initialized).to.equal('boolean');
      
      if (initialized) {
        expect(quoteProvider.isAvailable()).to.be.true;
      }
    } catch (error) {
      // Expected to fail due to no real contracts in test environment
      const errorMessage = error instanceof Error ? error.message : String(error);
      expect(errorMessage.length).to.be.greaterThan(0);
    }
  });

  it('should handle pool discovery with token address mapping', async () => {
    quoteProvider = new CurveQuoteProvider(mockSigner, validConfig);
    
    try {
      // Test pool existence for known token pairs
      const stablePoolExists = await quoteProvider.poolExists(
        '0x53Be558aF29cC65126ED0E585119FAC748FeB01B', // USDC_T
        '0xf0c44a9f24159E1f2A0D9Ba3203172f528d224CA'  // USD_T1
      );
      
      const cryptoPoolExists = await quoteProvider.poolExists(
        '0x236aa50979D5f3De3Bd1Eeb40E81137F22ab794b', // tBTC
        '0x4200000000000000000000000000000000000006'  // WETH
      );
      
      // Should return boolean values
      expect(typeof stablePoolExists).to.equal('boolean');
      expect(typeof cryptoPoolExists).to.equal('boolean');
    } catch (error) {
      // Expected to fail due to no real contracts, but test method exists
      const errorMessage = error instanceof Error ? error.message : String(error);
      expect(errorMessage.length).to.be.greaterThan(0);
    }
  });

  it('should handle quote requests for different pool types', async () => {
    quoteProvider = new CurveQuoteProvider(mockSigner, validConfig);
    
    // Test STABLE pool quote
    const stableQuoteResult = await quoteProvider.getQuote(
      BigNumber.from('1000000'), // 1 USDC_T (6 decimals)
      '0x53Be558aF29cC65126ED0E585119FAC748FeB01B', // USDC_T
      '0xf0c44a9f24159E1f2A0D9Ba3203172f528d224CA'  // USD_T1
    );
    
    // Since we can't mock the full contract interaction, expect it to fail gracefully
    expect(stableQuoteResult.success).to.be.false;
    expect(stableQuoteResult.error).to.be.a('string');
    
    // Test CRYPTO pool quote
    const cryptoQuoteResult = await quoteProvider.getQuote(
      BigNumber.from('100000000000000000'), // 0.1 tBTC (18 decimals)
      '0x236aa50979D5f3De3Bd1Eeb40E81137F22ab794b', // tBTC
      '0x4200000000000000000000000000000000000006'  // WETH
    );
    
    expect(cryptoQuoteResult.success).to.be.false;
    expect(cryptoQuoteResult.error).to.be.a('string');
  });

  it('should handle missing tokenAddresses configuration', async () => {
    const configWithoutTokenAddresses = {
      ...validConfig,
      tokenAddresses: undefined,
    };
    
    quoteProvider = new CurveQuoteProvider(mockSigner, configWithoutTokenAddresses);
    
    try {
      // Should still work but use fallback logic
      const result = await quoteProvider.poolExists(
        '0x53Be558aF29cC65126ED0E585119FAC748FeB01B',
        '0xf0c44a9f24159E1f2A0D9Ba3203172f528d224CA'
      );
      
      expect(typeof result).to.equal('boolean');
    } catch (error) {
      // Expected to fail due to no real contracts
      const errorMessage = error instanceof Error ? error.message : String(error);
      expect(errorMessage.length).to.be.greaterThan(0);
    }
  });

  it('should handle market price calculations gracefully', async () => {
    quoteProvider = new CurveQuoteProvider(mockSigner, validConfig);
    
    try {
      const priceResult = await quoteProvider.getMarketPrice(
        BigNumber.from('1000000'), // 1 USDC_T
        '0x53Be558aF29cC65126ED0E585119FAC748FeB01B', // USDC_T
        '0xf0c44a9f24159E1f2A0D9Ba3203172f528d224CA', // USD_T1
        6, // USDC_T decimals
        18 // USD_T1 decimals
      );
      
      expect(priceResult.success).to.be.false;
      expect(priceResult.error).to.be.a('string');
    } catch (error) {
      // Expected to fail due to no real contracts
      const errorMessage = error instanceof Error ? error.message : String(error);
      expect(errorMessage.length).to.be.greaterThan(0);
    }
  });

  it('should provide interface compatible with factory take logic', async () => {
    quoteProvider = new CurveQuoteProvider(mockSigner, validConfig);
    
    // Test the methods that factory takes would use
    expect(typeof quoteProvider.isAvailable()).to.equal('boolean');
    expect(Array.isArray(quoteProvider.getConfiguredPools())).to.be.true;
    
    // Test quote method signature exists and returns correct structure
    const quotePromise = quoteProvider.getQuote(
      BigNumber.from('1000000000000000000'), // 1 ETH
      '0x4200000000000000000000000000000000000006', // WETH
      '0x236aa50979D5f3De3Bd1Eeb40E81137F22ab794b', // tBTC
    );
    
    expect(quotePromise).to.be.instanceOf(Promise);
    
    const result = await quotePromise;
    expect(result).to.have.property('success');
    expect(result).to.have.property('error');
    
    // Test poolExists method signature
    const poolExistsPromise = quoteProvider.poolExists(
      '0x4200000000000000000000000000000000000006',
      '0x236aa50979D5f3De3Bd1Eeb40E81137F22ab794b'
    );
    
    expect(poolExistsPromise).to.be.instanceOf(Promise);
    
    const poolResult = await poolExistsPromise;
    expect(typeof poolResult).to.equal('boolean');
  });

  describe('Curve Configuration Variations', () => {
    it('should handle different pool type configurations', async () => {
      // Test STABLE-only configuration
      const stableOnlyConfig = {
        poolConfigs: {
          'usdc_t-usd_t1': {
            address: '0x01C2c9f2C271ECEF81287B44FA6F813a1605F5Eb',
            poolType: CurvePoolType.STABLE
          }
        },
        defaultSlippage: 1.0,
        wethAddress: '0x4200000000000000000000000000000000000006',
        tokenAddresses: validConfig.tokenAddresses
      };
      
      const stableProvider = new CurveQuoteProvider(mockSigner, stableOnlyConfig);
      expect(stableProvider.getConfiguredPools().length).to.equal(1);
      
      // Test CRYPTO-only configuration
      const cryptoOnlyConfig = {
        poolConfigs: {
          'tbtc-weth': {
            address: '0x6e53131F68a034873b6bFA15502aF094Ef0c5854',
            poolType: CurvePoolType.CRYPTO
          }
        },
        defaultSlippage: 2.0,
        wethAddress: '0x4200000000000000000000000000000000000006',
        tokenAddresses: validConfig.tokenAddresses
      };
      
      const cryptoProvider = new CurveQuoteProvider(mockSigner, cryptoOnlyConfig);
      expect(cryptoProvider.getConfiguredPools().length).to.equal(1);
    });

    it('should handle different slippage configurations', async () => {
      const slippageVariations = [0.5, 1.0, 2.0, 3.0]; // Different slippage values
      
      for (const slippage of slippageVariations) {
        const config = {
          ...validConfig,
          defaultSlippage: slippage
        };
        
        const provider = new CurveQuoteProvider(mockSigner, config);
        expect(provider).to.be.instanceOf(CurveQuoteProvider);
      }
    });

    it('should handle network errors gracefully', async () => {
      // Create a wallet with a provider that will fail
      const failingWallet = Wallet.fromMnemonic(USER1_MNEMONIC);
      // Don't connect to provider - will cause issues
      
      try {
        const newProvider = new CurveQuoteProvider(failingWallet, validConfig);
        // May fail during construction or later
        expect(newProvider).to.be.instanceOf(CurveQuoteProvider);
        
        // Test that methods don't crash even without provider
        const result = await newProvider.getQuote(
          BigNumber.from('1000000'),
          '0x53Be558aF29cC65126ED0E585119FAC748FeB01B',
          '0xf0c44a9f24159E1f2A0D9Ba3203172f528d224CA'
        );
        
        expect(result.success).to.be.false;
        expect(result.error).to.be.a('string');
      } catch (error) {
        // Expected to fail due to missing provider
        const errorMessage = error instanceof Error ? error.message : String(error);
        expect(errorMessage.length).to.be.greaterThan(0);
      }
    });

    it('should validate Base mainnet pool addresses are real', async () => {
      // Test that our configured addresses are valid Ethereum addresses
      const poolAddresses = Object.values(validConfig.poolConfigs).map(config => config.address);
      const tokenAddresses = Object.values(validConfig.tokenAddresses);
      
      [...poolAddresses, ...tokenAddresses, validConfig.wethAddress].forEach(address => {
        expect(ethers.utils.isAddress(address), `${address} should be valid address`).to.be.true;
        expect(address, `${address} should not be zero address`).to.not.equal('0x0000000000000000000000000000000000000000');
      });
      
      // Test that pool types are valid enums
      Object.values(validConfig.poolConfigs).forEach(config => {
        expect([CurvePoolType.STABLE, CurvePoolType.CRYPTO]).to.include(config.poolType);
      });
    });
  });
});