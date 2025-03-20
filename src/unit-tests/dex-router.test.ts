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
  let axiosGetStub: sinon.SinonStub;
  let loggerErrorStub: sinon.SinonStub;

  const chainId = 43114;
  const amount = BigNumber.from('1000000000000000000');
  const tokenIn = MAINNET_CONFIG.WBTC_USDC_POOL.collateralAddress; // WBTC
  const tokenOut = MAINNET_CONFIG.WETH_ADDRESS; // WETH
  const to = MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress;
  const fromAddress = '0x964d9D1A532B5a5DaeacBAc71d46320DE313AE9C';
  const slippage = 1;
  const feeAmount = 3000;

  beforeEach(() => {
    process.env.ONEINCH_API = 'https://api.1inch.io/v5.0';
    process.env.ONEINCH_API_KEY = 'api_key';

    mockProvider = new providers.JsonRpcProvider();
    mockProvider.estimateGas = sinon.stub().resolves(BigNumber.from('100000'));
    mockProvider.getResolver = sinon.stub().resolves(null);
    mockProvider.getNetwork = sinon
      .stub()
      .resolves({ chainId: chainId, name: 'mockNetwork' });

    mockProvider.call = sinon.stub().callsFake((tx) => {
      if (tx.data === '0x313ce567') {
        return ethers.utils.defaultAbiCoder.encode(['uint8'], [8]);
      }
      if (
        tx.data ===
        '0x70a08231' +
          ethers.utils.defaultAbiCoder
            .encode(['address'], [fromAddress])
            .slice(2)
      ) {
        return ethers.utils.defaultAbiCoder.encode(
          ['uint256'],
          [BigNumber.from('50000000')]
        );
      }
      throw new Error('Unexpected call');
    });

    signer = {
      provider: mockProvider,
      getAddress: sinon.stub().resolves(fromAddress),
      sendTransaction: sinon
        .stub()
        .resolves({ wait: sinon.stub().resolves({}) }),
    } as unknown as Signer;

    contractStub = new CustomContract(tokenIn, [], mockProvider);
    sinon.stub(ethers, 'Contract').callsFake((address, abi, provider) => {
      return contractStub;
    });

    dexRouter = new DexRouter(signer, {
      oneInchRouters: {
        1: '0x1111111254EEB25477B68fb85Ed929f73A960582',
        8453: '0x1111111254EEB25477B68fb85Ed929f73A960582',
        43114: '0x1111111254EEB25477B68fb85Ed929f73A960582',
      },
    });

    sinon.stub(logger, 'info');
    loggerErrorStub = sinon.stub(logger, 'error');
    sinon.stub(logger, 'debug');

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
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('constructor', () => {
    it('should log error if signer is undefined', () => {
      let threwError = false;
      try {
        new DexRouter(undefined as any);
      } catch (error) {
        threwError = true;
        expect((error as Error).message).to.include(
          "Cannot read properties of undefined (reading 'provider')"
        );
      }
      expect(threwError).to.be.true;
      expect(loggerErrorStub.calledWith('Signer is required')).to.be.true;
    });

    it('should log error if provider is unavailable', () => {
      const invalidSigner = { provider: undefined } as any;
      expect(() => new DexRouter(invalidSigner)).to.not.throw();
      expect(loggerErrorStub.calledWith('No provider available')).to.be.true;
    });
  });

  describe('swap', () => {
    it('should log error if amount is missing', async () => {
      let threwError = false;
      try {
        await dexRouter.swap(
          chainId,
          undefined as any,
          tokenIn,
          tokenOut,
          to,
          false
        );
      } catch (error) {
        threwError = true;
        expect((error as Error).message).to.include(
          "Cannot read properties of undefined (reading 'toString')"
        );
      }
      expect(threwError).to.be.true;
      expect(loggerErrorStub.calledWith('Invalid parameters provided to swap'))
        .to.be.true;
    });

    it('should log error if tokenIn is missing', async () => {
      let threwError = false;
      try {
        await dexRouter.swap(
          chainId,
          amount,
          undefined as any,
          tokenOut,
          to,
          false
        );
      } catch (error) {
        threwError = true;
        expect((error as Error).message).to.include(
          "Cannot read properties of undefined (reading 'toLowerCase')"
        );
      }
      expect(threwError).to.be.true;
      expect(loggerErrorStub.calledWith('Invalid parameters provided to swap'))
        .to.be.true;
    });

    it('should log error if tokenOut is missing', async () => {
      let threwError = false;
      try {
        await dexRouter.swap(
          chainId,
          amount,
          tokenIn,
          undefined as any,
          to,
          false
        );
      } catch (error) {
        threwError = true;
        expect((error as Error).message).to.include(
          "Cannot read properties of undefined (reading 'toLowerCase')"
        );
      }
      expect(threwError).to.be.true;
      expect(loggerErrorStub.calledWith('Invalid parameters provided to swap'))
        .to.be.true;
    });

    it('should log error if to is missing', async () => {
      let threwError = false;
      try {
        await dexRouter.swap(
          chainId,
          amount,
          tokenIn,
          tokenOut,
          undefined as any,
          false
        );
      } catch (error) {
        threwError = true;
        expect((error as Error).message).to.include(
          'invalid signer or provider'
        );
      }
      expect(threwError).to.be.true;
      expect(loggerErrorStub.calledWith('Invalid parameters provided to swap'))
        .to.be.true;
    });

    it('should log error if balance is insufficient', async () => {
      let threwError = false;
      try {
        await dexRouter.swap(chainId, amount, tokenIn, tokenOut, to, false);
      } catch (error) {
        threwError = true;
        expect((error as Error).message).to.include(
          'invalid signer or provider'
        );
      }
      expect(threwError).to.be.true;
      expect(
        loggerErrorStub.calledWith(
          `Insufficient balance for ${tokenIn}: 50000000 < 100000000`
        )
      ).to.be.true;
    });

    describe('useOneInch = true', () => {
      beforeEach(() => {
        (mockProvider.call as sinon.SinonStub).callsFake((tx) => {
          if (tx.data === '0x313ce567') {
            return ethers.utils.defaultAbiCoder.encode(['uint8'], [8]);
          }
          if (
            tx.data ===
            '0x70a08231' +
              ethers.utils.defaultAbiCoder
                .encode(['address'], [fromAddress])
                .slice(2)
          ) {
            return ethers.utils.defaultAbiCoder.encode(
              ['uint256'],
              [BigNumber.from('100000000')]
            ); // 1 WBTC
          }
          throw new Error('Unexpected call');
        });
      });

      it('should approve token if allowance is insufficient', async () => {
        const getAllowanceStub = sinon
          .stub(erc20, 'getAllowanceOfErc20')
          .resolves(BigNumber.from('1'));
        const approveStub = sinon.stub(erc20, 'approveErc20').resolves();

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
        expect(getAllowanceStub.calledOnce).to.be.true;
        expect(approveStub.calledOnce).to.be.true;
      });

      it('should skip approval if allowance is sufficient', async () => {
        const getAllowanceStub = sinon
          .stub(erc20, 'getAllowanceOfErc20')
          .resolves(amount);
        const approveStub = sinon.stub(erc20, 'approveErc20');

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
      });

      it('should log error if approval fails', async () => {
        const getAllowanceStub = sinon
          .stub(erc20, 'getAllowanceOfErc20')
          .resolves(BigNumber.from('0'));
        const approveStub = sinon
          .stub(erc20, 'approveErc20')
          .rejects(new Error('Approval failed'));

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
      });

      it('should call swapWithOneInch and execute transaction', async () => {
        const getAllowanceStub = sinon
          .stub(erc20, 'getAllowanceOfErc20')
          .resolves(amount);

        axiosGetStub.onCall(0).resolves({
          data: {
            toTokenAmount: '900000000000000000',
            protocols: [],
          },
        });
        axiosGetStub.onCall(1).resolves({
          data: {
            tx: {
              to: '0x1inchRouter',
              data: '0xdata',
              value: '0',
              gas: '100000',
            },
          },
        });

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

        expect(axiosGetStub.calledTwice).to.be.true;

        expect(
          axiosGetStub
            .getCall(0)
            .calledWith(`${process.env.ONEINCH_API}/${chainId}/quote`, {
              params: {
                fromTokenAddress: tokenIn,
                toTokenAddress: tokenOut,
                amount: '100000000',
                connectorTokens:
                  '0x24de8771bc5ddb3362db529fc3358f2df3a0e346,0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e,0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7,0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
              },
              headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${process.env.ONEINCH_API_KEY}`,
              },
            })
        ).to.be.true;

        expect(
          axiosGetStub
            .getCall(1)
            .calledWith(`${process.env.ONEINCH_API}/${chainId}/swap`, {
              params: {
                fromTokenAddress: tokenIn,
                toTokenAddress: tokenOut,
                amount: '100000000',
                fromAddress,
                slippage,
              },
              headers: {
                Accept: 'application/json',
                Authorization: `Bearer ${process.env.ONEINCH_API_KEY}`,
              },
            })
        ).to.be.true;
      });
    });
  });

  describe('swapWithOneInch', () => {
    beforeEach(() => {
      (mockProvider.call as sinon.SinonStub).callsFake((tx) => {
        if (tx.data === '0x313ce567') {
          return ethers.utils.defaultAbiCoder.encode(['uint8'], [8]);
        }
        if (
          tx.data ===
          '0x70a08231' +
            ethers.utils.defaultAbiCoder
              .encode(['address'], [fromAddress])
              .slice(2)
        ) {
          return ethers.utils.defaultAbiCoder.encode(
            ['uint256'],
            [BigNumber.from('100000000')]
          ); // 1 WBTC
        }
        throw new Error('Unexpected call');
      });
    });

    it('should execute swap with 1inch successfully', async () => {
      axiosGetStub.onCall(0).resolves({
        data: {
          toTokenAmount: '900000000000000000',
          protocols: [],
        },
      });
      axiosGetStub.onCall(1).resolves({
        data: {
          tx: {
            to: '0x1inchRouter',
            data: '0xdata',
            value: '0',
            gas: '100000',
          },
        },
      });

      await dexRouter['swapWithOneInch'](
        chainId,
        BigNumber.from('100000000'),
        tokenIn,
        tokenOut,
        slippage
      );

      expect(axiosGetStub.calledTwice).to.be.true;

      expect(
        axiosGetStub
          .getCall(0)
          .calledWith(`${process.env.ONEINCH_API}/${chainId}/quote`, {
            params: {
              fromTokenAddress: tokenIn,
              toTokenAddress: tokenOut,
              amount: '100000000',
              connectorTokens:
                '0x24de8771bc5ddb3362db529fc3358f2df3a0e346,0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e,0x9702230a8ea53601f5cd2dc00fdbc13d4df4a8c7,0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7',
            },
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${process.env.ONEINCH_API_KEY}`,
            },
          })
      ).to.be.true;

      expect(
        axiosGetStub
          .getCall(1)
          .calledWith(`${process.env.ONEINCH_API}/${chainId}/swap`, {
            params: {
              fromTokenAddress: tokenIn,
              toTokenAddress: tokenOut,
              amount: '100000000',
              fromAddress,
              slippage,
            },
            headers: {
              Accept: 'application/json',
              Authorization: `Bearer ${process.env.ONEINCH_API_KEY}`,
            },
          })
      ).to.be.true;
    });

    it('should log error if axios fails', async () => {
      axiosGetStub.rejects(new Error('API error'));
      await expect(
        dexRouter['swapWithOneInch'](
          chainId,
          amount,
          tokenIn,
          tokenOut,
          slippage
        )
      ).to.be.rejectedWith('API error');
    });
  });
});
