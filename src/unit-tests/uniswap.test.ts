import { FeeAmount } from '@uniswap/v3-sdk';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { BigNumber, Contract, ethers, providers, Signer } from 'ethers';
import sinon from 'sinon';
import * as erc20 from '../erc20';
import { logger } from '../logging';
import Uniswap, * as uniswap from '../uniswap';

chai.use(chaiAsPromised);

class CustomContract extends Contract {
  liquidity: sinon.SinonStub<any[], any>;
  slot0: sinon.SinonStub<any[], any>;
  decimals: sinon.SinonStub<any[], any>;
  exactInputSingle: sinon.SinonStub<any[], any>;
  hash: sinon.SinonStub<any[], any>;

  constructor(address: string, abi: any, provider: providers.Provider) {
    super(address, abi, provider);
    this.liquidity = sinon.stub();
    this.slot0 = sinon.stub();
    this.decimals = sinon.stub();
    this.exactInputSingle = sinon.stub();
    this.hash = sinon.stub();
  }
}

class CustomSigner extends Signer {
  getAddress: sinon.SinonStub<any[], any>;
  signMessage: sinon.SinonStub<any[], any>;
  signTransaction: sinon.SinonStub<any[], any>;
  connect: sinon.SinonStub<any[], any>;

  constructor(provider: providers.Provider) {
    super();
    this.getAddress = sinon
      .stub()
      .resolves('0x964d9D1A532B5a5DaeacBAc71d46320DE313AE9C');
    this.signMessage = sinon.stub().resolves('0xMockSignature');
    this.signTransaction = sinon.stub().resolves('0xMockTransaction');
    this.connect = sinon.stub().returns(this);

    Object.defineProperty(this, 'provider', { value: provider });
  }
}

describe('getPoolInfo', () => {
  let contractStub: CustomContract;

  const mockProvider = new providers.JsonRpcProvider();

  beforeEach(async () => {
    contractStub = new CustomContract(
      '0x964d9D1A532B5a5DaeacBAc71d46320DE313AE9C',
      [],
      mockProvider
    );

    contractStub.liquidity.resolves(BigNumber.from('1000000000000000000'));
    contractStub.slot0.resolves([
      BigNumber.from('79228162514264337593543950336'),
      0,
    ]);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return pool info correctly', async () => {
    const poolInfo = await Uniswap.getPoolInfo(contractStub);

    expect(poolInfo).to.have.property('liquidity');
    expect(poolInfo).to.have.property('sqrtPriceX96');
    expect(poolInfo).to.have.property('tick');
    expect(poolInfo.liquidity.toString()).to.equal('1000000000000000000');
    expect(poolInfo.sqrtPriceX96.toString()).to.equal(
      '79228162514264337593543950336'
    );
    expect(poolInfo.tick.toString()).to.equal('0');
  });
});

describe('swapToWETH', () => {
  const mockProvider = new providers.JsonRpcProvider();
  let mockSigner: CustomSigner;
  let mockSwapRouter: CustomContract;

  beforeEach(() => {
    mockProvider.getResolver = sinon.stub().resolves(null);
    mockProvider.getBalance = sinon.stub().resolves('1000000000000000000');

    mockSigner = new CustomSigner(mockProvider);
    mockSigner.getAddress.resolves(
      '0x964d9D1A532B5a5DaeacBAc71d46320DE313AE9C'
    );
    mockSigner.sendTransaction = sinon.stub().resolves({
      hash: '0xTransactionHash',
      wait: sinon.stub().resolves({
        status: 1,
        transactionHash: '0xTransactionHash',
        blockNumber: 12345,
        confirmations: 1,
        from: '0xMockAddress',
        to: '0xMockRouterAddress',
        gasUsed: 21000,
        logs: [
          {
            blockNumber: 12345,
            blockHash: '0xMockBlockHash',
            transactionIndex: 0,
            removed: false,
            address: '0xMockRouterAddress',
            data: '0xMockData',
            topics: ['0xMockTopic1', '0xMockTopic2'],
            transactionHash: '0xTransactionHash',
            logIndex: 1,
          },
        ],
      }),
    });

    Object.defineProperty(mockSigner, 'provider', { value: mockProvider });

    mockSwapRouter = new CustomContract(
      '0x964d9D1A532B5a5DaeacBAc71d46320DE313AE9C',
      [],
      mockProvider
    );

    mockSwapRouter.exactInputSingle.resolves({
      hash: '0xTransactionHash',
      wait: async () => ({
        status: 1,
        transactionHash: '0xTransactionHash',
        blockNumber: 12345,
        confirmations: 1,
        from: '0xMockAddress',
        to: '0xMockRouterAddress',
        gasUsed: 21000,
        logs: [
          {
            blockNumber: 12345,
            blockHash: '0xMockBlockHash',
            transactionIndex: 0,
            removed: false,
            address: '0xMockRouterAddress',
            data: '0xMockData',
            topics: ['0xMockTopic1', '0xMockTopic2'],
            transactionHash: '0xTransactionHash',
            logIndex: 1,
          },
        ],
      }),
    });

    mockSwapRouter.liquidity.resolves(BigNumber.from('1000000000000000000'));
    mockSwapRouter.slot0.resolves([
      BigNumber.from('79228162514264337593543950336'),
      0,
    ]);

    sinon.stub(mockSwapRouter, 'connect').returns(mockSwapRouter);

    sinon.stub(erc20, 'getDecimalsErc20').resolves(18);
    sinon.stub(uniswap, 'getPoolInfo').resolves({
      liquidity: BigNumber.from('1000000000000000000'),
      sqrtPriceX96: BigNumber.from('79228162514264337593543950336'),
      tick: 0,
    });

    const mockUniswapRouter = {
      exactInputSingle: sinon.stub().resolves(BigNumber.from('1000')),
      liquidity: sinon.stub().resolves(BigNumber.from('1000000000000000000')),
      slot0: sinon
        .stub()
        .resolves([BigNumber.from('79228162514264337593543950336'), 0]),
    };

    sinon.stub(Contract.prototype, 'constructor').returns(mockUniswapRouter);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should throw an error for invalid parameters', async function () {
    await expect(
      Uniswap.swapToWETH(
        null as any,
        '',
        ethers.utils.parseUnits('100', 8),
        FeeAmount.MEDIUM,
        ''
      )
    ).to.be.rejectedWith('Invalid parameters provided to swapToWETH');
  });

  it('should throw an error if signer does not have a provider', async function () {
    const spyWarn = sinon.spy(logger, 'warn');
    const invalidSigner = {
      getAddress: sinon.stub().resolves('0xMock'),
    } as unknown as Signer;
    await Uniswap.swapToWETH(
      invalidSigner,
      '0x964d9D1A532B5a5DaeacBAc71d46320DE313AE9C',
      ethers.utils.parseUnits('100', 8),
      FeeAmount.MEDIUM,
      mockSwapRouter.address
    );
    expect(spyWarn.calledOnce).to.be.true;
    expect(
      spyWarn.calledWith(sinon.match('No provider available, skipping swap'))
    ).to.be.true;
  });
});
