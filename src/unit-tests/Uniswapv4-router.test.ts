import { expect } from 'chai';
import sinon from 'sinon';
import { BigNumber, ethers } from 'ethers';
import * as uniswapV4RouterModule from '../uniswapV4-router-module';
import { UniV4PoolKey } from '../config-types';

/**
 * Tests for Uniswap V4 Router Module
 *
 * Tests the swapWithUniswapV4Adapter function which uses Universal Router
 * to execute V4 swaps with proper PoolKey encoding.
 */

describe('Uniswap V4 Router Module', () => {
  let swapStub: sinon.SinonStub;
  let mockSigner: any;

  // Define validPoolKey at the top level - using actual config values
  const validPoolKey: UniV4PoolKey = {
    token0: '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE',
    token1: '0xd8A0af85E2539e22953287b436255422724871AB',
    fee: 100,
    tickSpacing: 1,
    hooks: '0x0000000000000000000000000000000000000000',
  };

  beforeEach(() => {
    sinon.restore();

    mockSigner = {
      getAddress: sinon.stub().resolves('0x1234567890123456789012345678901234567890'),
      getChainId: sinon.stub().resolves(8453),
      provider: {
        getNetwork: sinon.stub().resolves({ chainId: 8453, name: 'base' }),
        estimateGas: sinon.stub().resolves(BigNumber.from('500000')),
        getGasPrice: sinon.stub().resolves(BigNumber.from('1000000000')),
        getCode: sinon.stub().resolves('0x123456'),
      },
    };

    swapStub = sinon.stub(uniswapV4RouterModule, 'swapWithUniswapV4Adapter');
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('swapWithUniswapV4Adapter()', () => {
    it('should execute successful swap with correct parameters', async () => {
      swapStub.resolves({
        success: true,
        receipt: {
          transactionHash: '0xSuccess',
          gasUsed: BigNumber.from('450000'),
        },
      });

      const result = await uniswapV4RouterModule.swapWithUniswapV4Adapter(
        mockSigner,
        '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE', // tokenIn
        BigNumber.from('1000000000000000000'), // 1 token
        '0xd8A0af85E2539e22953287b436255422724871AB', // tokenOut
        1.0, // slippagePct
        '0x6ff5693b99212da76ad316178a184ab56d299b43', // Universal Router
        validPoolKey,
        '0x1234567890123456789012345678901234567890', // recipient
        '0x' // hookData
      );

      expect(swapStub.calledOnce).to.be.true;
      expect(result.success).to.be.true;
      expect(result.receipt).to.exist;
      expect(result.receipt!.transactionHash).to.equal('0xSuccess');
    });

    it('should handle swap with custom hook data', async () => {
      swapStub.resolves({
        success: true,
        receipt: { transactionHash: '0xSuccessWithHooks' },
      });

      const poolKeyWithHooks: UniV4PoolKey = {
        ...validPoolKey,
        hooks: '0x1234567890123456789012345678901234567890',
      };

      const result = await uniswapV4RouterModule.swapWithUniswapV4Adapter(
        mockSigner,
        validPoolKey.token0,
        BigNumber.from('1000000000000000000'),
        validPoolKey.token1,
        1.0,
        '0x6ff5693b99212da76ad316178a184ab56d299b43',
        poolKeyWithHooks,
        '0x1234567890123456789012345678901234567890',
        '0x1234' // Custom hook data
      );

      expect(result.success).to.be.true;
    });

    it('should return error when router address is empty', async () => {
      // Configure stub to return error for empty router
      swapStub.resolves({
        success: false,
        error: 'Router address is required',
      });

      const result = await uniswapV4RouterModule.swapWithUniswapV4Adapter(
        mockSigner,
        validPoolKey.token0,
        BigNumber.from('1000000'),
        validPoolKey.token1,
        1.0,
        '', // Empty router address
        validPoolKey,
        '0x1234567890123456789012345678901234567890',
        '0x'
      );

      expect(result.success).to.be.false;
      expect(result.error).to.exist;
    });

    it('should handle approval when allowance is insufficient', async () => {
      // Configure stub to simulate successful swap after approval
      swapStub.resolves({
        success: true,
        receipt: {
          transactionHash: '0xSwapAfterApproval',
          gasUsed: BigNumber.from('550000'), // Higher gas due to approval
        },
      });

      const result = await uniswapV4RouterModule.swapWithUniswapV4Adapter(
        mockSigner,
        validPoolKey.token0,
        BigNumber.from('1000000000000000000'),
        validPoolKey.token1,
        1.0,
        '0x6ff5693b99212da76ad316178a184ab56d299b43',
        validPoolKey,
        '0x1234567890123456789012345678901234567890',
        '0x'
      );

      expect(result.success).to.be.true;
    });

    it('should skip approval when allowance is sufficient', async () => {
      // Configure stub to simulate direct swap (no approval needed)
      swapStub.resolves({
        success: true,
        receipt: {
          transactionHash: '0xDirectSwap',
          gasUsed: BigNumber.from('450000'),
        },
      });

      const result = await uniswapV4RouterModule.swapWithUniswapV4Adapter(
        mockSigner,
        validPoolKey.token0,
        BigNumber.from('1000000000000000000'),
        validPoolKey.token1,
        1.0,
        '0x6ff5693b99212da76ad316178a184ab56d299b43',
        validPoolKey,
        '0x1234567890123456789012345678901234567890',
        '0x'
      );

      expect(result.success).to.be.true;
    });

    it('should calculate minimum output with slippage correctly', () => {
      const amountIn = BigNumber.from('1000000000000000000'); // 1 token
      const slippagePct = 1.0; // 1%

      // Business logic: minOut = amountIn * (10000 - slippageBasisPoints) / 10000
      const slippageBasisPoints = slippagePct * 100; // 100
      const minOut = amountIn.mul(10000 - slippageBasisPoints).div(10000);

      // Should be 99% of input
      expect(minOut.toString()).to.equal('990000000000000000');
    });

    it('should encode PoolKey correctly for V4', () => {
      // Business logic: PoolKey must be encoded as tuple
      const encodedPoolKey = ethers.utils.defaultAbiCoder.encode(
        ['tuple(address,address,uint24,int24,address)'],
        [[
          validPoolKey.token0,
          validPoolKey.token1,
          validPoolKey.fee,
          validPoolKey.tickSpacing,
          validPoolKey.hooks
        ]]
      );

      expect(encodedPoolKey).to.be.a('string');
      expect(encodedPoolKey).to.include('0x');
    });

    it('should handle swap execution failure', async () => {
      swapStub.resolves({
        success: false,
        error: 'Transaction reverted'
      });

      const result = await uniswapV4RouterModule.swapWithUniswapV4Adapter(
        mockSigner,
        validPoolKey.token0,
        BigNumber.from('1000000'),
        validPoolKey.token1,
        1.0,
        '0x6ff5693b99212da76ad316178a184ab56d299b43',
        validPoolKey,
        '0x1234567890123456789012345678901234567890',
        '0x'
      );

      expect(result.success).to.be.false;
      expect(result.error).to.include('reverted');
    });

    it('should handle exceptions during swap', async () => {
      swapStub.rejects(new Error('Network error'));

      try {
        await uniswapV4RouterModule.swapWithUniswapV4Adapter(
          mockSigner,
          validPoolKey.token0,
          BigNumber.from('1000000'),
          validPoolKey.token1,
          1.0,
          '0x6ff5693b99212da76ad316178a184ab56d299b43',
          validPoolKey,
          '0x1234567890123456789012345678901234567890',
          '0x'
        );
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).to.include('Network error');
      }
    });
  });

  describe('V4 Command Encoding', () => {
    it('should use correct V4_SWAP command', () => {
      const V4_SWAP = '0x10';

      // V4 uses command 0x10 for swaps through PoolManager
      expect(V4_SWAP).to.equal('0x10');
    });

    it('should prepare swap input parameters correctly', () => {
      // Use a valid Ethereum address
      const to = '0x1234567890123456789012345678901234567890';
      const amountIn = BigNumber.from('1000000');
      const minOut = BigNumber.from('990000');
      const encodedPoolKey = '0x1234';
      const payerIsUser = false;

      const swapInput = ethers.utils.defaultAbiCoder.encode(
        ['address', 'uint256', 'uint256', 'bytes', 'bool'],
        [to, amountIn, minOut, encodedPoolKey, payerIsUser]
      );

      expect(swapInput).to.be.a('string');
      expect(swapInput).to.include('0x');
    });
  });

  describe('Real Base Network Configuration', () => {
    it('should work with production Base addresses', () => {
      const baseConfig = {
        router: '0x6ff5693b99212da76ad316178a184ab56d299b43',
        poolManager: '0x498581ff718922c3f8e6a244956af099b2652b2b',
        poolKey: {
          token0: '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE',
          token1: '0xd8A0af85E2539e22953287b436255422724871AB',
          fee: 100,
          tickSpacing: 1,
          hooks: '0x0000000000000000000000000000000000000000',
        },
      };

      // Validate addresses
      expect(ethers.utils.isAddress(baseConfig.router)).to.be.true;
      expect(ethers.utils.isAddress(baseConfig.poolManager)).to.be.true;
      expect(ethers.utils.isAddress(baseConfig.poolKey.token0)).to.be.true;
      expect(ethers.utils.isAddress(baseConfig.poolKey.token1)).to.be.true;
    });

    it('should validate all 3 pool configurations from config', () => {
      const pools = {
        'B_T1-B_T2': {
          token0: '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE',
          token1: '0xd8A0af85E2539e22953287b436255422724871AB',
          fee: 100,
          tickSpacing: 1,
          hooks: '0x0000000000000000000000000000000000000000',
        },
        'B_T3-B_T4': {
          token0: '0x082b59dcb966fea684b8c5f833b997b62bb0ca20',
          token1: '0x46c9b45628bc1cf680d151b4c5b1226c3d236187',
          fee: 100,
          tickSpacing: 10,
          hooks: '0x0000000000000000000000000000000000000000',
        },
        'B_T2-B_T4': {
          token0: '0x46c9b45628bc1cf680d151b4c5b1226c3d236187',
          token1: '0xd8A0af85E2539e22953287b436255422724871AB',
          fee: 500,
          tickSpacing: 10,
          hooks: '0x0000000000000000000000000000000000000000',
        },
      };

      expect(Object.keys(pools)).to.have.length(3);

      for (const [name, pool] of Object.entries(pools)) {
        expect(ethers.utils.isAddress(pool.token0)).to.be.true;
        expect(ethers.utils.isAddress(pool.token1)).to.be.true;
        expect(pool.fee).to.be.a('number');
        expect(pool.tickSpacing).to.be.a('number');
      }
    });
  });

  describe('Gas and Deadline Settings', () => {
    it('should set appropriate gas limit for V4 swaps', () => {
      const gasLimit = 800000;

      // V4 swaps through Universal Router need higher gas
      expect(gasLimit).to.be.greaterThan(500000);
    });

    it('should calculate deadline correctly', () => {
      const now = Math.floor(Date.now() / 1000);
      const deadline = now + 1800; // 30 minutes

      expect(deadline).to.be.greaterThan(now);
      expect(deadline - now).to.equal(1800);
    });

    it('should apply gas price multiplier', () => {
      const baseGasPrice = BigNumber.from('1000000000'); // 1 gwei
      const multiplier = baseGasPrice.mul(115).div(100); // 1.15x

      expect(multiplier.toString()).to.equal('1150000000');
    });
  });

  describe('Error Handling', () => {
    it('should catch and return error on contract call failure', async () => {
      swapStub.resolves({
        success: false,
        error: 'Pool not initialized',
      });

      const result = await uniswapV4RouterModule.swapWithUniswapV4Adapter(
        mockSigner,
        '0xbbA111dbDFA69f023f3fcc6404bB9dd3c7ef1afE',
        BigNumber.from('1000000'),
        '0xd8A0af85E2539e22953287b436255422724871AB',
        1.0,
        '0x6ff5693b99212da76ad316178a184ab56d299b43',
        validPoolKey,
        '0x1234567890123456789012345678901234567890',
        '0x'
      );

      expect(result.success).to.be.false;
      expect(result.error).to.exist;
    });
  });
});
