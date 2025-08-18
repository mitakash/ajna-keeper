import { expect } from 'chai';
import sinon from 'sinon';
import { BigNumber, ethers } from 'ethers';
import { UniswapV3QuoteProvider } from '../dex-providers/uniswap-quote-provider';

describe('Uniswap V3 Quote Provider', () => {
  let mockSigner: any;
  let quoteProvider: UniswapV3QuoteProvider;
  let validConfig: any;

  beforeEach(() => {
    // Reset sinon after each test
    sinon.restore();
    
    // Create basic mock signer
    mockSigner = {
      getAddress: sinon.stub().resolves('0xTestAddress'),
      getChainId: sinon.stub().resolves(43114),
      provider: {
        getCode: sinon.stub().resolves('0x1234'), // Mock contract exists
      }
    };

    // Valid Uniswap V3 configuration (based on your Hemi config)
    validConfig = {
      universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
      poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
      defaultFeeTier: 3000,
      wethAddress: '0x4200000000000000000000000000000000000006',
      quoterV2Address: '0xcBa55304013187D49d4012F4d7e4B63a04405cd5',
    };
  });

  it('should create Uniswap V3 quote provider with valid configuration', async () => {
    quoteProvider = new UniswapV3QuoteProvider(mockSigner, validConfig);
    
    expect(quoteProvider).to.be.instanceOf(UniswapV3QuoteProvider);
    expect(quoteProvider.getQuoterAddress()).to.equal(validConfig.quoterV2Address);
  });

  it('should detect available configuration correctly', async () => {
    quoteProvider = new UniswapV3QuoteProvider(mockSigner, validConfig);
    
    expect(quoteProvider.isAvailable()).to.be.true;
  });

  it('should detect incomplete configuration', async () => {
    const incompleteConfig = {
      universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
      // Missing required fields
    };
    
    quoteProvider = new UniswapV3QuoteProvider(mockSigner, incompleteConfig as any);
    expect(quoteProvider.isAvailable()).to.be.false;
  });

  it('should handle quote requests gracefully', async () => {
    quoteProvider = new UniswapV3QuoteProvider(mockSigner, validConfig);
    
    const result = await quoteProvider.getQuote(
      BigNumber.from('1000000000000000000'), // 1 ETH
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC
      '0x4200000000000000000000000000000000000006', // WETH
      3000 // 0.3% fee tier
    );
    
    // Since we can't mock the full QuoterV2 contract interaction, expect it to fail gracefully
    expect(result.success).to.be.false;
    expect(result.error).to.be.a('string');
  });

  it('should handle missing QuoterV2 configuration', async () => {
    const configWithoutQuoter = {
      universalRouterAddress: '0x533c7A53389e0538AB6aE1D7798D6C1213eAc28B',
      poolFactoryAddress: '0x346239972d1fa486FC4a521031BC81bFB7D6e8a4',
      defaultFeeTier: 3000,
      wethAddress: '0x4200000000000000000000000000000000000006',
      // Missing quoterV2Address
    };
    
    const providerWithoutQuoter = new UniswapV3QuoteProvider(mockSigner, configWithoutQuoter as any);
    
    expect(providerWithoutQuoter.isAvailable()).to.be.false;
    
    const result = await providerWithoutQuoter.getQuote(
      BigNumber.from('1000000000000000000'),
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      '0x4200000000000000000000000000000000000006'
    );
    
    expect(result.success).to.be.false;
    expect(result.error).to.include('QuoterV2 address not configured');
  });

  it('should handle different chain configurations', async () => {
    // Test Hemi configuration
    const hemiProvider = new UniswapV3QuoteProvider(mockSigner, validConfig);
    expect(hemiProvider.isAvailable()).to.be.true;
    expect(hemiProvider.getQuoterAddress()).to.equal(validConfig.quoterV2Address);
    
    // Test Mainnet configuration
    const mainnetConfig = {
      universalRouterAddress: '0x3fC91A3afd70395Cd496C647d5a6CC9D4B2b7FAD',
      poolFactoryAddress: '0x1F98431c8aD98523631AE4a59f267346ea31F984',
      defaultFeeTier: 3000,
      wethAddress: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
      quoterV2Address: '0x61fFE014bA17989E743c5F6cB21bF9697530B21e',
    };
    
    const mainnetProvider = new UniswapV3QuoteProvider(mockSigner, mainnetConfig);
    expect(mainnetProvider.isAvailable()).to.be.true;
    expect(mainnetProvider.getQuoterAddress()).to.equal(mainnetConfig.quoterV2Address);
  });

  it('should provide interface compatible with factory take logic', async () => {
    quoteProvider = new UniswapV3QuoteProvider(mockSigner, validConfig);
    
    // Test the methods that factory takes would use
    expect(quoteProvider.isAvailable()).to.be.a('boolean');
    expect(quoteProvider.getQuoterAddress()).to.be.a('string');
    
    // Test quote method signature
    const quotePromise = quoteProvider.getQuote(
      BigNumber.from('1000000000000000000'),
      '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      '0x4200000000000000000000000000000000000006',
      3000
    );
    
    expect(quotePromise).to.be.instanceOf(Promise);
    
    const result = await quotePromise;
    expect(result).to.have.property('success');
    expect(result).to.have.property('error');
  });
});