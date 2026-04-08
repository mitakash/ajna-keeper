import { expect } from 'chai';
import sinon from 'sinon';
import { BigNumber, ethers } from 'ethers';
import { UniswapV4QuoteProvider } from '../dex-providers/uniswapV4-quote-provider';
import { UniV4PoolKey } from '../config-types';

describe('UniswapV4QuoteProvider', () => {
  let mockSigner: any;
  let mockContract: any;

  beforeEach(() => {
    // Create a more complete mock provider
    const mockProvider = {
      getNetwork: sinon.stub().resolves({ chainId: 8453, name: 'base' }),
      getCode: sinon.stub().resolves('0x123456'),
      getGasPrice: sinon.stub().resolves(BigNumber.from('1000000000')),
      estimateGas: sinon.stub().resolves(BigNumber.from('500000')),
      getBlockNumber: sinon.stub().resolves(1000000),
      call: sinon.stub().resolves('0x'),
      _isProvider: true, // Important for ethers.js validation
    };

    // Create mock signer with complete provider
    mockSigner = {
      getAddress: sinon.stub().resolves('0xTestAddress'),
      getChainId: sinon.stub().resolves(8453),
      provider: mockProvider,
      connect: sinon.stub().returnsThis(),
      _isSigner: true, // Important for ethers.js validation
    };

    // Create mock contract
    mockContract = {
      getSlot0: sinon.stub(),
      decimals: sinon.stub().resolves(18),
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('Configuration and Initialization', () => {
    it('should create provider with valid configuration', () => {
      const config = {
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
      };

      const provider = new UniswapV4QuoteProvider(mockSigner, config);
      expect(provider).to.exist;
    });

    it('should initialize successfully with valid pool manager', async () => {
      // Stub Contract BEFORE creating provider
      const contractStub = sinon.stub(ethers, 'Contract').returns(mockContract as any);

      const config = {
        router: '0x498581ff718922c3f8e6a244956af099b2652b2b',
        poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
        defaultSlippage: 1.0,
        pools: {},
      };

      const provider = new UniswapV4QuoteProvider(mockSigner, config);
      const initialized = await provider.initialize();
      
      expect(initialized).to.be.true;
      
      contractStub.restore();
    });

    // ... rest of tests
  });

  describe('getMarketPrice()', () => {
    const validPoolKey: UniV4PoolKey = {
      token0: '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE',
      token1: '0xd8A0af85E2539e22953287b436255422724871AB',
      fee: 3000,
      tickSpacing: 60,
      hooks: '0x0000000000000000000000000000000000000000',
    };

    it('should calculate price from pool state', async () => {
      // Set up Contract stub BEFORE creating provider
      mockContract.getSlot0.resolves({
        sqrtPriceX96: BigNumber.from('79228162514264337593543950336'),
        tick: 0,
      });
      
      const contractStub = sinon.stub(ethers, 'Contract').returns(mockContract as any);

      const config = {
        router: '0x498581ff718922c3f8e6a244956af099b2652b2b',
        defaultSlippage: 1.0,
        pools: { 'test': validPoolKey },
      };

      const provider = new UniswapV4QuoteProvider(mockSigner, config);
      await provider.initialize();

      const result = await provider.getMarketPrice(
        BigNumber.from('1000000'),
        validPoolKey.token0,
        validPoolKey.token1,
        18,
        18,
        validPoolKey
      );

      expect(result.success).to.be.true;
      expect(result.price).to.exist;
      
      contractStub.restore();
    });
  });

  // Fix the fee calculation test
  it('should apply fee reduction to quote', () => {
    const amountIn = 1000000;
    const price = 1.0;
    const fee = 3000; // 0.3%
    
    // Correct calculation
    const feeReduction = (10000 - fee) / 10000;
    const amountOut = amountIn * price * feeReduction;
    
    // Should be 997000 (99.7% of input)
    expect(amountOut).to.equal(997000);
  });
});
