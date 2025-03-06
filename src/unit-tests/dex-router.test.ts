import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';
import { BigNumber, Contract, Signer, ethers, providers } from 'ethers';
import axios from 'axios';
import { DexRouter } from '../dex-router';
import { logger } from '../logging';
import * as erc20 from '../erc20';
import { MAINNET_CONFIG } from '../integration-tests/test-config';

chai.use(chaiAsPromised);

class CustomContract extends Contract {
  liquidity: sinon.SinonStub<any[], any>;
  slot0: sinon.SinonStub<any[], any>;
  decimals: sinon.SinonStub<any[], any>;
  exactInputSingle: sinon.SinonStub<any[], any>;
  hash: sinon.SinonStub<any[], any>;
  balanceOf: sinon.SinonStub<any[], any>;

  constructor(address: string, abi: any, provider: providers.Provider) {
    super(address, abi, provider);
    this.liquidity = sinon.stub();
    this.slot0 = sinon.stub();
    this.decimals = sinon.stub();
    this.exactInputSingle = sinon.stub();
    this.hash = sinon.stub();
    this.balanceOf = sinon.stub();
  }
}

describe('DexRouter', () => {
  let contractStub: CustomContract;
  let signer: Signer;
  let mockProvider: providers.JsonRpcProvider;
  let dexRouter: DexRouter;

  const chainId = 43114;
  const amount = BigNumber.from('1000000000000000000');
  const tokenIn = MAINNET_CONFIG.WBTC_USDC_POOL.collateralAddress;
  const tokenOut = MAINNET_CONFIG.WETH_ADDRESS;
  const to = MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress;
  const fromAddress = '0x964d9D1A532B5a5DaeacBAc71d46320DE313AE9C';
  const slippage = 1;
  const feeAmount = 3000;

  beforeEach(() => {
    mockProvider = new providers.JsonRpcProvider();

    mockProvider.estimateGas = sinon.stub().resolves(BigNumber.from('100000'));
    mockProvider.getResolver = sinon.stub().resolves(null);
    mockProvider.getNetwork = sinon
      .stub()
      .resolves({ chainId: chainId, name: 'mockNetwork' });

    signer = {
      provider: mockProvider,
      getAddress: sinon.stub().resolves(fromAddress),
      sendTransaction: sinon.stub().resolves({ wait: sinon.stub().resolves() }),
    } as unknown as Signer;

    contractStub = new CustomContract(fromAddress, [], mockProvider);

    dexRouter = new DexRouter(signer);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('constructor', () => {
    it('should throw if signer is undefined', () => {
      expect(() => new DexRouter(undefined as any)).to.throw(
        'Signer is required'
      );
    });

    it('should throw if provider is unavailable', () => {
      const invalidSigner = { provider: undefined } as any;
      expect(() => new DexRouter(invalidSigner)).to.throw(
        'No provider available'
      );
    });
  });

  describe('swap', () => {
    it('should throw if chainId is missing', async () => {
      await expect(
        dexRouter.swap(0, amount, tokenIn, tokenOut, to, false)
      ).to.be.rejectedWith('Invalid parameters provided to swap');
    });

    it('should throw if amount is missing', async () => {
      await expect(
        dexRouter.swap(chainId, undefined as any, tokenIn, tokenOut, to, false)
      ).to.be.rejectedWith('Invalid parameters provided to swap');
    });

    it('should throw if tokenIn is missing', async () => {
      await expect(
        dexRouter.swap(chainId, amount, undefined as any, tokenOut, to, false)
      ).to.be.rejectedWith('Invalid parameters provided to swap');
    });

    it('should throw if tokenOut is missing', async () => {
      await expect(
        dexRouter.swap(chainId, amount, tokenIn, undefined as any, to, false)
      ).to.be.rejectedWith('Invalid parameters provided to swap');
    });

    it('should throw if to is missing', async () => {
      await expect(
        dexRouter.swap(
          chainId,
          amount,
          tokenIn,
          tokenOut,
          undefined as any,
          false
        )
      ).to.be.rejectedWith('Invalid parameters provided to swap');
    });

    it('should throw if balance is insufficient', async () => {
      mockProvider.getBalance = sinon
        .stub()
        .resolves(BigNumber.from('50000000000000'));
      mockProvider.call = sinon
        .stub()
        .resolves(
          ethers.utils.defaultAbiCoder.encode(
            ['uint256'],
            [BigNumber.from('500000000000000000')]
          )
        );
      await expect(
        dexRouter.swap(chainId, amount, tokenIn, tokenOut, to, false)
      ).to.be.rejectedWith(
        `Insufficient balance for ${tokenIn}: 500000000000000000 < 1000000000000000000`
      );
    });

    describe('useOneInch = true', () => {
      let axiosGetStub: sinon.SinonStub;

      beforeEach(() => {
        axiosGetStub = sinon.stub(axios, 'get').resolves({
          data: {
            tx: {
              to: '0x1inchRouter',
              data: '0xdata',
              value: '0',
              gas: '100000',
            },
          },
        });
        sinon.stub(logger, 'info');
        sinon.stub(logger, 'debug');
        sinon.stub(logger, 'error');
      });

      afterEach(() => {
        sinon.restore();
      });

      it('should approve token if allowance is insufficient', async () => {
        const getAllowanceStub = sinon
          .stub(erc20, 'getAllowanceOfErc20')
          .resolves(BigNumber.from('0'));
        const approveStub = sinon.stub(erc20, 'approveErc20').resolves();

        mockProvider.call = sinon
          .stub()
          .resolves(ethers.utils.defaultAbiCoder.encode(['uint256'], [amount]));

        await dexRouter.swap(
          chainId,
          amount,
          tokenIn,
          tokenOut,
          to,
          true,
          slippage,
          feeAmount
        );
        expect(approveStub.calledOnceWith(signer, tokenIn, fromAddress, amount))
          .to.be.true;
        expect(
          (logger.info as sinon.SinonStub).calledWith(
            `1inch swap successful: ${amount.toString()} ${tokenIn} -> ${tokenOut}`
          )
        ).to.be.true;

        getAllowanceStub.restore();
        approveStub.restore();
      });

      it('should skip approval if allowance is sufficient', async () => {
        const getAllowanceStub = sinon
          .stub(erc20, 'getAllowanceOfErc20')
          .resolves(amount);
        const approveStub = sinon.stub(erc20, 'approveErc20');

        mockProvider.call = sinon
          .stub()
          .resolves(ethers.utils.defaultAbiCoder.encode(['uint256'], [amount]));

        await dexRouter.swap(
          chainId,
          amount,
          tokenIn,
          tokenOut,
          to,
          true,
          slippage,
          feeAmount
        );
        expect(approveStub.notCalled).to.be.true;

        getAllowanceStub.restore();
        approveStub.restore();
      });

      it('should throw if approval fails', async () => {
        const getAllowanceStub = sinon
          .stub(erc20, 'getAllowanceOfErc20')
          .resolves(BigNumber.from('0'));
        const approveStub = sinon
          .stub(erc20, 'approveErc20')
          .rejects(new Error('Approval failed'));

        mockProvider.call = sinon
          .stub()
          .resolves(ethers.utils.defaultAbiCoder.encode(['uint256'], [amount]));

        await expect(
          dexRouter.swap(
            chainId,
            amount,
            tokenIn,
            tokenOut,
            to,
            true,
            slippage,
            feeAmount
          )
        ).to.be.rejectedWith('Approval failed');
        expect(
          (logger.error as sinon.SinonStub).calledWith(
            `Failed to approve token ${tokenIn} for 1inch`
          )
        ).to.be.true;

        getAllowanceStub.restore();
        approveStub.restore();
      });

      it('should call swapWithOneInch and execute transaction', async () => {
        process.env.ONEINCH = 'https://api.1inch.io/v5.0';
        const getAllowanceStub = sinon
          .stub(erc20, 'getAllowanceOfErc20')
          .resolves(amount);

        mockProvider.call = sinon
          .stub()
          .resolves(ethers.utils.defaultAbiCoder.encode(['uint256'], [amount]));

        await dexRouter.swap(
          chainId,
          amount,
          tokenIn,
          tokenOut,
          to,
          true,
          slippage,
          feeAmount
        );
        expect(
          axiosGetStub.calledOnceWith(
            `${process.env.ONEINCH}/${chainId}/swap`,
            {
              params: {
                fromTokenAddress: tokenIn,
                toTokenAddress: tokenOut,
                amount: amount.toString(),
                fromAddress,
                slippage,
              },
            }
          )
        ).to.be.true;
        expect(
          (logger.info as sinon.SinonStub).calledWith(
            `1inch swap successful: ${amount.toString()} ${tokenIn} -> ${tokenOut}`
          )
        ).to.be.true;

        getAllowanceStub.restore();
      });
    });
  });

  describe('swapWithOneInch', () => {
    let axiosGetStub: sinon.SinonStub;

    beforeEach(() => {
      process.env.ONEINCH = 'https://api.1inch.io/v5.0';
      axiosGetStub = sinon.stub(axios, 'get').resolves({
        data: {
          tx: {
            to: '0x1inchRouter',
            data: '0xdata',
            value: '0',
            gas: '100000',
          },
        },
      });
      sinon.stub(logger, 'info');
      sinon.stub(logger, 'debug');
      sinon.stub(logger, 'error');
    });

    afterEach(() => {
      sinon.restore();
    });

    it('should execute swap with 1inch successfully', async () => {
      mockProvider.call = sinon
        .stub()
        .resolves(ethers.utils.defaultAbiCoder.encode(['uint256'], [amount]));
      await dexRouter['swapWithOneInch'](
        chainId,
        amount,
        tokenIn,
        tokenOut,
        slippage
      );
      expect(
        axiosGetStub.calledOnceWith(`${process.env.ONEINCH}/${chainId}/swap`)
      ).to.be.true;
      expect(
        (logger.info as sinon.SinonStub).calledWith(
          `1inch swap successful: ${amount.toString()} ${tokenIn} -> ${tokenOut}`
        )
      ).to.be.true;
    });

    it('should throw and log error if axios fails', async () => {
      axiosGetStub.rejects(new Error('API error'));
      mockProvider.call = sinon
        .stub()
        .resolves(ethers.utils.defaultAbiCoder.encode(['uint256'], [amount]));
      await expect(
        dexRouter['swapWithOneInch'](
          chainId,
          amount,
          tokenIn,
          tokenOut,
          slippage
        )
      ).to.be.rejectedWith('API error');
      expect((logger.info as sinon.SinonStub).notCalled).to.be.true;
    });
  });
});
