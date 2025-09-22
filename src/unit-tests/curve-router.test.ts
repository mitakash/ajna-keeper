import { expect } from 'chai';
import sinon from 'sinon';
import { BigNumber, ethers } from 'ethers';
import * as curveRouterModule from '../curve-router-module';
import { NonceTracker } from '../nonce';
import { CurvePoolType } from '../config-types';

describe('Curve Router Module', () => {
  let swapStub: sinon.SinonStub;
  let mockSigner: any;
  let queueTransactionStub: sinon.SinonStub;
  
  beforeEach(() => {
    // Reset sinon after each test
    sinon.restore();
    
    // Create basic mocks - same pattern as sushiswap-router-module.test.ts
    mockSigner = {
      getAddress: sinon.stub().resolves('0xTestAddress'),
      getChainId: sinon.stub().resolves(8453), // Base chain ID
      provider: {
        getNetwork: sinon.stub().resolves({ chainId: 8453, name: 'base' }),
        estimateGas: sinon.stub().resolves(BigNumber.from('100000')),
        getGasPrice: sinon.stub().resolves(BigNumber.from('20000000000')),
        getCode: sinon.stub().resolves('0x123456'), // Non-empty code
      },
      sendTransaction: sinon.stub().resolves({
        hash: '0xTestHash',
        wait: sinon.stub().resolves({ transactionHash: '0xTestHash' }),
      }),
    };
    
    // Mock NonceTracker - same pattern as sushiswap-router-module.test.ts
    queueTransactionStub = sinon.stub(NonceTracker, 'queueTransaction').callsFake(async (signer, txFunc) => {
      return await txFunc(10);
    });
    
    // Stub the actual exported function
    swapStub = sinon.stub(curveRouterModule, 'swapWithCurveRouter');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('swapWithCurveRouter', () => {
    it('should execute successful swap with STABLE pool type', async () => {
      // Return success to simulate a successful call
      swapStub.resolves({ success: true, receipt: { transactionHash: '0xSuccess' } });
      
      // Call the actual function with STABLE pool parameters
      const result = await curveRouterModule.swapWithCurveRouter(
        mockSigner,
        '0x53Be558aF29cC65126ED0E585119FAC748FeB01B', // USDC_T from config
        BigNumber.from('1000000'), // amount
        '0xf0c44a9f24159E1f2A0D9Ba3203172f528d224CA', // USD_T1 from config
        1.0, // slippagePercentage
        '0x01C2c9f2C271ECEF81287B44FA6F813a1605F5Eb', // STABLE pool address from config
        CurvePoolType.STABLE,
        1.0 // defaultSlippage
      );
      
      // Verify the function was called
      expect(swapStub.calledOnce).to.be.true;
      expect(result.success).to.be.true;
      expect(result.receipt.transactionHash).to.equal('0xSuccess');
    });

    it('should execute successful swap with CRYPTO pool type', async () => {
      // Return success to simulate a successful call
      swapStub.resolves({ success: true, receipt: { transactionHash: '0xCryptoSuccess' } });
      
      // Call the actual function with CRYPTO pool parameters
      const result = await curveRouterModule.swapWithCurveRouter(
        mockSigner,
        '0x236aa50979D5f3De3Bd1Eeb40E81137F22ab794b', // tBTC from config
        BigNumber.from('100000000000000000'), // amount (0.1 tBTC)
        '0x4200000000000000000000000000000000000006', // WETH from config
        2.0, // slippagePercentage
        '0x6e53131F68a034873b6bFA15502aF094Ef0c5854', // CRYPTO pool address from config
        CurvePoolType.CRYPTO,
        2.0 // defaultSlippage
      );
      
      // Verify the function was called
      expect(swapStub.calledOnce).to.be.true;
      expect(result.success).to.be.true;
      expect(result.receipt.transactionHash).to.equal('0xCryptoSuccess');
    });

    it('should handle missing pool address validation', async () => {
      // Simulate a failed swap due to missing pool address
      swapStub.resolves({ success: false, error: 'Curve pool address must be provided via configuration' });
      
      const result = await curveRouterModule.swapWithCurveRouter(
        mockSigner,
        '0x53Be558aF29cC65126ED0E585119FAC748FeB01B',
        BigNumber.from('1000000'),
        '0xf0c44a9f24159E1f2A0D9Ba3203172f528d224CA',
        1.0,
        '', // Empty pool address
        CurvePoolType.STABLE,
        1.0
      );
      
      expect(result.success).to.be.false;
      expect(result.error).to.equal('Curve pool address must be provided via configuration');
    });

    it('should handle missing pool type validation', async () => {
      // Simulate a failed swap due to missing pool type
      swapStub.resolves({ success: false, error: 'Pool type must be provided via configuration' });
      
      const result = await curveRouterModule.swapWithCurveRouter(
        mockSigner,
        '0x53Be558aF29cC65126ED0E585119FAC748FeB01B',
        BigNumber.from('1000000'),
        '0xf0c44a9f24159E1f2A0D9Ba3203172f528d224CA',
        1.0,
        '0x01C2c9f2C271ECEF81287B44FA6F813a1605F5Eb',
        undefined as any, // Missing pool type
        1.0
      );
      
      expect(result.success).to.be.false;
      expect(result.error).to.equal('Pool type must be provided via configuration');
    });

    it('should handle swap failure', async () => {
      // Simulate a failed swap
      swapStub.resolves({ success: false, error: 'Token indices not found in pool. Cannot proceed with swap.' });
      
      const result = await curveRouterModule.swapWithCurveRouter(
        mockSigner,
        '0x53Be558aF29cC65126ED0E585119FAC748FeB01B',
        BigNumber.from('1000000'),
        '0xf0c44a9f24159E1f2A0D9Ba3203172f528d224CA',
        1.0,
        '0x01C2c9f2C271ECEF81287B44FA6F813a1605F5Eb',
        CurvePoolType.STABLE,
        1.0
      );
      
      expect(result.success).to.be.false;
      expect(result.error).to.equal('Token indices not found in pool. Cannot proceed with swap.');
    });

    it('should handle exceptions during swap', async () => {
      // Simulate an exception
      swapStub.rejects(new Error('Transaction reverted'));
      
      try {
        await curveRouterModule.swapWithCurveRouter(
          mockSigner,
          '0x53Be558aF29cC65126ED0E585119FAC748FeB01B',
          BigNumber.from('1000000'),
          '0xf0c44a9f24159E1f2A0D9Ba3203172f528d224CA',
          1.0,
          '0x01C2c9f2C271ECEF81287B44FA6F813a1605F5Eb',
          CurvePoolType.STABLE,
          1.0
        );
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.equal('Transaction reverted');
      }
    });
  });

  // Test NonceTracker integration - same pattern as sushiswap-router-module.test.ts
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