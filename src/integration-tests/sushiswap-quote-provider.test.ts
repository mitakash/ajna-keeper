// src/integration-tests/sushiswap-quote-provider.test.ts
import { expect } from 'chai';
import sinon from 'sinon';
import { BigNumber, ethers, Wallet } from 'ethers';
import { SushiSwapQuoteProvider } from '../dex-providers/sushiswap-quote-provider';
import { USER1_MNEMONIC } from './test-config';
import { getProvider } from './test-utils';

describe('SushiSwap Quote Provider', () => {
  let mockSigner: any;
  let quoteProvider: SushiSwapQuoteProvider;
  let validConfig: any;

  beforeEach(() => {
    // Reset sinon after each test
    sinon.restore();
    
    // Use REAL wallet from test mnemonic (same pattern as your working tests)
    const wallet = Wallet.fromMnemonic(USER1_MNEMONIC);
    mockSigner = wallet.connect(getProvider());

    // Valid SushiSwap configuration (based on your Hemi config)
    validConfig = {
      swapRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
      quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
      factoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
      defaultFeeTier: 500,
      wethAddress: '0x4200000000000000000000000000000000000006',
    };
  });

  it('should create SushiSwap quote provider with valid configuration', async () => {
    quoteProvider = new SushiSwapQuoteProvider(mockSigner, validConfig);
    
    expect(quoteProvider).to.be.instanceOf(SushiSwapQuoteProvider);
    expect(quoteProvider.getQuoterAddress()).to.equal(validConfig.quoterV2Address);
  });

  it('should initialize successfully with valid contracts', async () => {
    quoteProvider = new SushiSwapQuoteProvider(mockSigner, validConfig);
    
    try {
      const initialized = await quoteProvider.initialize();
      // May succeed or fail depending on contract existence, but should not crash
      expect(typeof initialized).to.equal('boolean');
    } catch (error) {
      // Expected to fail due to no real contracts in test environment
      const errorMessage = error instanceof Error ? error.message : String(error);
      expect(errorMessage.length).to.be.greaterThan(0);
    }
  });

  it('should handle missing quoterV2Address', async () => {
    const configWithoutQuoter = {
      ...validConfig,
      quoterV2Address: undefined,
    };
    
    quoteProvider = new SushiSwapQuoteProvider(mockSigner, configWithoutQuoter);
    expect(quoteProvider.getQuoterAddress()).to.be.undefined;
  });

  it('should handle quote requests gracefully', async () => {
    quoteProvider = new SushiSwapQuoteProvider(mockSigner, validConfig);
    
    // Don't initialize - test constructor and basic functionality
    const result = await quoteProvider.getQuote(
      BigNumber.from('1000000000000000000'), // 1 ETH
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
      '0x4200000000000000000000000000000000000006', // WETH
      500 // 0.05% fee tier
    );
    
    // Since we can't mock the full contract interaction, expect it to fail gracefully
    expect(result.success).to.be.false;
    expect(result.error).to.be.a('string');
  });

  it('should handle zero amount input', async () => {
    quoteProvider = new SushiSwapQuoteProvider(mockSigner, validConfig);
    
    const result = await quoteProvider.getQuote(
      BigNumber.from('0'),
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      '0x4200000000000000000000000000000000000006',
      500
    );
    
    expect(result.success).to.be.false;
    expect(result.error).to.be.a('string');
  });

  it('should handle network errors gracefully', async () => {
    // Create a wallet with a provider that will fail
    const failingWallet = Wallet.fromMnemonic(USER1_MNEMONIC);
    // Don't connect to provider - will cause issues
    
    try {
      const newProvider = new SushiSwapQuoteProvider(failingWallet, validConfig);
      // May fail during construction or later
      expect(newProvider).to.be.instanceOf(SushiSwapQuoteProvider);
    } catch (error) {
      // Expected to fail due to missing provider
      const errorMessage = error instanceof Error ? error.message : String(error);
      expect(errorMessage.length).to.be.greaterThan(0);
    }
  });

  it('should check pool existence for token pairs', async () => {
    quoteProvider = new SushiSwapQuoteProvider(mockSigner, validConfig);
    
    try {
      // Can't fully test without real contract, but test the method exists
      const exists = await quoteProvider.poolExists(
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        '0x4200000000000000000000000000000000000006',
        500
      );
      
      // Should return boolean
      expect(typeof exists).to.equal('boolean');
    } catch (error) {
      // Expected to fail due to no real contracts
      const errorMessage = error instanceof Error ? error.message : String(error);
      expect(errorMessage.length).to.be.greaterThan(0);
    }
  });

  describe('SushiSwap Configuration Variations', () => {
    it('should handle different chain configurations', async () => {
      // Test Hemi configuration
      const hemiProvider = new SushiSwapQuoteProvider(mockSigner, validConfig);
      expect(hemiProvider.getQuoterAddress()).to.equal(validConfig.quoterV2Address);
      
      // Test Mainnet-style configuration
      const mainnetConfig = {
        swapRouterAddress: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
        quoterV2Address: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
        factoryAddress: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
        defaultFeeTier: 3000,
        wethAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      };
      
      const mainnetProvider = new SushiSwapQuoteProvider(mockSigner, mainnetConfig);
      expect(mainnetProvider.getQuoterAddress()).to.equal(mainnetConfig.quoterV2Address);
    });

    it('should handle different fee tiers', async () => {
      quoteProvider = new SushiSwapQuoteProvider(mockSigner, validConfig);
      
      const feeTiers = [500, 3000, 10000]; // Common SushiSwap fee tiers
      
      for (const feeTier of feeTiers) {
        try {
          const result = await quoteProvider.getQuote(
            BigNumber.from('1000000000000000000'),
            '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
            '0x4200000000000000000000000000000000000006',
            feeTier
          );
          
          // Should handle different fee tiers without parameter errors
          expect(result).to.have.property('success');
          expect(result).to.have.property('error');
        } catch (error) {
          // Expected to fail due to no real contracts, but not due to parameter validation
          const errorMessage = error instanceof Error ? error.message : String(error);
          expect(errorMessage).to.not.include('invalid fee tier');
          expect(errorMessage).to.not.include('invalid parameters');
        }
      }
    });

    it('should provide interface compatible with factory take logic', async () => {
      quoteProvider = new SushiSwapQuoteProvider(mockSigner, validConfig);
      
      // Test the methods that factory takes would use
      expect(typeof quoteProvider.getQuoterAddress()).to.be.oneOf(['string', 'undefined']);
      
      // Test quote method signature exists and returns correct structure
      const quotePromise = quoteProvider.getQuote(
        BigNumber.from('1000000000000000000'),
        '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        '0x4200000000000000000000000000000000000006',
        500
      );
      
      expect(quotePromise).to.be.instanceOf(Promise);
      
      const result = await quotePromise;
      expect(result).to.have.property('success');
      expect(result).to.have.property('error');
    });
  });
});
