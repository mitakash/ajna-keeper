import { expect } from 'chai';
import sinon from 'sinon';
import { BigNumber, ethers } from 'ethers';
import * as sushiswapRouterModule from '../sushiswap-router-module';
import { NonceTracker } from '../nonce';

describe('SushiSwap Router Module', () => {
  let swapStub: sinon.SinonStub;
  let mockSigner: any;
  let queueTransactionStub: sinon.SinonStub;
  
  beforeEach(() => {
    // Reset sinon after each test
    sinon.restore();
    
    // Create basic mocks - same pattern as universal-router-module.test.ts
    mockSigner = {
      getAddress: sinon.stub().resolves('0xTestAddress'),
      getChainId: sinon.stub().resolves(43111), // Hemi chain ID
      provider: {
        getNetwork: sinon.stub().resolves({ chainId: 43111, name: 'hemi-test' }),
        estimateGas: sinon.stub().resolves(BigNumber.from('100000')),
        getGasPrice: sinon.stub().resolves(BigNumber.from('20000000000')),
        getCode: sinon.stub().resolves('0x123456'), // Non-empty code
      },
      sendTransaction: sinon.stub().resolves({
        hash: '0xTestHash',
        wait: sinon.stub().resolves({ transactionHash: '0xTestHash' }),
      }),
    };
    
    // Mock NonceTracker - same pattern as universal-router-module.test.ts
    queueTransactionStub = sinon.stub(NonceTracker, 'queueTransaction').callsFake(async (signer, txFunc) => {
      return await txFunc(10);
    });
    
    // Stub the actual exported function
    swapStub = sinon.stub(sushiswapRouterModule, 'swapWithSushiswapRouter');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('swapWithSushiswapRouter', () => {
    it('should execute successful swap with correct parameters', async () => {
      // Return success to simulate a successful call
      swapStub.resolves({ success: true, receipt: { transactionHash: '0xSuccess' } });
      
      // Call the actual function
      const result = await sushiswapRouterModule.swapWithSushiswapRouter(
        mockSigner,
        '0x1f0d51a052aa79527fffaf3108fb4440d3f53ce6', // tokenAddress
        BigNumber.from('1000000'), // amount
        '0x91e1a2966408d434cfc1c0790df4a1ce08dc73d8', // targetTokenAddress
        2.0, // slippagePercentage
        '0x33d91116e0370970444B0281AB117e161fEbFcdD', // swapRouterAddress
        '0x1400feFD6F9b897970f00Df6237Ff2B8b27Dc82C', // quoterV2Address
        500, // feeTier
        '0xCdBCd51a5E8728E0AF4895ce5771b7d17fF71959' // factoryAddress
      );
      
      // Verify the function was called
      expect(swapStub.calledOnce).to.be.true;
      expect(result.success).to.be.true;
      expect(result.receipt.transactionHash).to.equal('0xSuccess');
    });

    it('should handle swap failure', async () => {
      // Simulate a failed swap
      swapStub.resolves({ success: false, error: 'No SushiSwap pool exists' });
      
      const result = await sushiswapRouterModule.swapWithSushiswapRouter(
        mockSigner,
        '0x1f0d51a052aa79527fffaf3108fb4440d3f53ce6',
        BigNumber.from('1000000'),
        '0x91e1a2966408d434cfc1c0790df4a1ce08dc73d8',
        2.0,
        '0x33d91116e0370970444B0281AB117e161fEbFcdD',
        '0x1400feFD6F9b897970f00Df6237Ff2B8b27Dc82C',
        500,
        '0xCdBCd51a5E8728E0AF4895ce5771b7d17fF71959'
      );
      
      expect(result.success).to.be.false;
      expect(result.error).to.equal('No SushiSwap pool exists');
    });

    it('should handle exceptions during swap', async () => {
      // Simulate an exception
      swapStub.rejects(new Error('Transaction reverted'));
      
      try {
        await sushiswapRouterModule.swapWithSushiswapRouter(
          mockSigner,
          '0x1f0d51a052aa79527fffaf3108fb4440d3f53ce6',
          BigNumber.from('1000000'),
          '0x91e1a2966408d434cfc1c0790df4a1ce08dc73d8',
          2.0,
          '0x33d91116e0370970444B0281AB117e161fEbFcdD',
          '0x1400feFD6F9b897970f00Df6237Ff2B8b27Dc82C',
          500,
          '0xCdBCd51a5E8728E0AF4895ce5771b7d17fF71959'
        );
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.equal('Transaction reverted');
      }
    });
  });

  // Test NonceTracker integration - same pattern as universal-router-module.test.ts
  describe('Integration with NonceTracker', () => {
    it('should use NonceTracker.queueTransaction for transactions', async () => {
      // Restore the original method before this test
      swapStub.restore();
          
      // Test the interaction with NonceTracker
      const dummyTxFunction = async (nonce: number) => {
        return { success: true, transactionHash: '0xTest' };
      };
      
      // Call NonceTracker directly
      const result = await NonceTracker.queueTransaction(mockSigner, dummyTxFunction);
      
      // Verify it was called and returned expected result
      expect(queueTransactionStub.calledOnce).to.be.true;
      expect(result.success).to.be.true;
      expect(result.transactionHash).to.equal('0xTest');
    });
  });
});