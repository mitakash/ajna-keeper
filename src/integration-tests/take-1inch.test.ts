import { AjnaSDK, FungiblePool, Provider } from '@ajna-finance/sdk';
import axios from 'axios';
import { expect } from 'chai';
import { BigNumber, Contract, ethers, utils, Wallet } from 'ethers';
import sinon from 'sinon';
import { AjnaKeeperTaker__factory } from '../../typechain-types/factories/contracts';
import * as oneInch from '../1inch';
import ERC20_ABI from '../abis/erc20.abi.json';
import { configureAjna, LiquiditySource } from '../config-types';
import { SECONDS_PER_DAY } from '../constants';
import { getLoansToKick, kick } from '../kick';
import { getLiquidationsToTake, takeLiquidation } from '../take';
import { arrayFromAsync, decimaledToWei } from '../utils';
import { depositQuoteToken, drawDebt } from './loan-helpers';
import './subgraph-mock';
import {
  makeGetHighestMeaningfulBucket,
  makeGetLiquidationsFromSdk,
  makeGetLoansFromSdk,
  overrideGetHighestMeaningfulBucket,
  overrideGetLiquidations,
  overrideGetLoans,
} from './subgraph-mock';
import { MAINNET_CONFIG, USER1_MNEMONIC } from './test-config';
import {
  getProvider,
  impersonateSigner,
  increaseTime,
  resetHardhat,
  setBalance,
} from './test-utils';

describe('Take with 1inch Integration', () => {
  let provider: Provider;
  let axiosGetStub: sinon.SinonStub;
  let pool: FungiblePool;
  let signer: Wallet;
  let keeperTakerAddress: string;
  let borrower: string;
  let quoteToken: Contract;
  let collateralToken: Contract;

  const ONE_INCH_QUOTE_RESPONSE = {
    dstAmount: '1000000000000000000',
  };

  const ONE_INCH_SWAP_RESPONSE = {
    tx: {
      to: '0x1111111254EEB25477B68fb85Ed929f73A960582',
      data: '0x12345678deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
      value: '0',
      gas: '200000',
    },
  };

  before(async () => {
    process.env.ONEINCH_API = 'https://api.1inch.io/v6.0';
    process.env.ONEINCH_API_KEY = 'mock_api_key';
    provider = getProvider();
    await resetHardhat();
  });

  beforeEach(async () => {
    await resetHardhat();
    axiosGetStub = sinon.stub(axios, 'get');
    axiosGetStub
      .withArgs(sinon.match(/\/quote$/), sinon.match.any)
      .callsFake(() => Promise.resolve({ data: ONE_INCH_QUOTE_RESPONSE }));
    axiosGetStub
      .withArgs(sinon.match(/\/swap$/), sinon.match.any)
      .callsFake(() => Promise.resolve({ data: ONE_INCH_SWAP_RESPONSE }));

    sinon
      .stub(oneInch, 'convertSwapApiResponseToDetailsBytes')
      .callsFake(() => {
        const details = {
          aggregationExecutor: '0x6956C0a5DFE1Ea7Bf71422EaCb6e9D85F7607176',
          swapDescription: {
            srcToken: '0xD31a59c85aE9D8edEFeC411D448f90841571b89c',
            dstToken: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
            srcReceiver: '0x1111111254EEB25477B68fb85Ed929f73A960582',
            dstReceiver: keeperTakerAddress,
            amount: BigNumber.from('14000000000000000000'),
            minReturnAmount: BigNumber.from('1000000000000000000'),
            flags: BigNumber.from('0'),
          },
          opaqueData:
            '0xa9059cbb000000000000000000000000c02aaa39b223fe8d0a0e5c4f27ead9083c756cc20000000000000000000000000000000000000000000000000de0b6b3a7640000',
        };
        return utils.defaultAbiCoder.encode(
          [
            '(address,(address,address,address,address,uint256,uint256,uint256),bytes)',
          ],
          [
            [
              details.aggregationExecutor,
              [
                details.swapDescription.srcToken,
                details.swapDescription.dstToken,
                details.swapDescription.srcReceiver,
                details.swapDescription.dstReceiver,
                details.swapDescription.amount,
                details.swapDescription.minReturnAmount,
                details.swapDescription.flags,
              ],
              details.opaqueData,
            ],
          ]
        );
      });

    configureAjna(MAINNET_CONFIG.AJNA_CONFIG);
    const ajna = new AjnaSDK(provider);
    pool = await ajna.fungiblePoolFactory.getPoolByAddress(
      MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address
    );

    overrideGetLoans(makeGetLoansFromSdk(pool));
    overrideGetLiquidations(makeGetLiquidationsFromSdk(pool));
    overrideGetHighestMeaningfulBucket(makeGetHighestMeaningfulBucket(pool));

    signer = Wallet.fromMnemonic(USER1_MNEMONIC).connect(provider);
    await setBalance(signer.address, utils.parseEther('100').toHexString());
    const keeperTakerFactory = new AjnaKeeperTaker__factory(signer);
    const address = await signer.getAddress();
    const keeperTaker = await keeperTakerFactory.deploy(address);
    await keeperTaker.deployed();
    keeperTakerAddress = keeperTaker.address;

    quoteToken = new Contract(pool.quoteAddress, ERC20_ABI, provider);
    collateralToken = new Contract(pool.collateralAddress, ERC20_ABI, provider);

    const signerAddress = await signer.getAddress();
    await setBalance(signerAddress, utils.parseEther('100').toHexString());
    await setBalance(keeperTakerAddress, utils.parseEther('100').toHexString());

    const quoteWhaleSigner = await impersonateSigner(
      MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress
    );
    await setBalance(
      MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress,
      utils.parseEther('1000').toHexString()
    );
    await quoteToken
      .connect(quoteWhaleSigner)
      .approve(keeperTakerAddress, ethers.constants.MaxUint256);
    await quoteToken
      .connect(quoteWhaleSigner)
      .approve(pool.poolAddress, ethers.constants.MaxUint256);

    const collateralWhaleSigner = await impersonateSigner(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress
    );
    await setBalance(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress,
      utils.parseEther('1000').toHexString()
    );
    await collateralToken
      .connect(collateralWhaleSigner)
      .approve(keeperTakerAddress, ethers.constants.MaxUint256);
    await collateralToken
      .connect(collateralWhaleSigner)
      .approve(pool.poolAddress, ethers.constants.MaxUint256);

    await depositQuoteToken({
      pool,
      owner: MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress,
      amount: 1,
      price: 0.07,
    });
    await drawDebt({
      pool,
      owner: MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress,
      amountToBorrow: 0.9,
      collateralToPledge: 14,
    });
    await increaseTime(SECONDS_PER_DAY * 365 * 2);

    const loansToKick = await arrayFromAsync(
      getLoansToKick({
        pool,
        poolConfig: MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
        config: {
          subgraphUrl: '',
          coinGeckoApiKey: '',
        },
      })
    );
    const kickSigner = await impersonateSigner(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2
    );
    await setBalance(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2,
      utils.parseEther('100').toHexString()
    );
    await kick({
      pool,
      signer: kickSigner,
      loanToKick: loansToKick[0],
      config: {
        dryRun: false,
      },
    });

    await increaseTime(SECONDS_PER_DAY * 1);

    borrower = MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress;
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should deploy AjnaKeeperTaker and setup environment', async () => {
    expect(pool.poolAddress).to.equal(
      MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address
    );
    expect(signer.address).to.match(/^0x[a-fA-F0-9]{40}$/);
    expect(keeperTakerAddress).to.match(/^0x[a-fA-F0-9]{40}$/);
    expect(borrower).to.match(/^0x[a-fA-F0-9]{40}$/);

    const keeperTaker = AjnaKeeperTaker__factory.connect(
      keeperTakerAddress,
      signer
    );
    expect(await keeperTaker.signer.getAddress()).to.equal(signer.address);

    const liquidationStatus = await pool.getLiquidation(borrower).getStatus();
    expect(liquidationStatus.collateral.toString()).to.equal(
      '14000000000000000000'
    );
  });

  it('should not take liquidation when price is too high', async () => {
    const liquidations = await arrayFromAsync(
      getLiquidationsToTake({
        pool,
        poolConfig: {
          ...MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
          take: {
            minCollateral: 1e-8,
            liquiditySource: LiquiditySource.ONEINCH,
            marketPriceFactor: 0.01,
            hpbPriceFactor: undefined,
          },
        },
        signer,
        config: {
          subgraphUrl: '',
          oneInchRouters: { 1: '0x1111111254EEB25477B68fb85Ed929f73A960582' },
          connectorTokens: [],
          delayBetweenActions: 1,
        },
      })
    );
    expect(liquidations.length).to.equal(0);
  });

  // TODO: Last transaction fails with revert
  it.skip('should take liquidation when price is appropriate and earn quote tokens', async () => {
    const initialBalance = await quoteToken.balanceOf(signer.address);

    const liquidations = await arrayFromAsync(
      getLiquidationsToTake({
        pool,
        poolConfig: {
          ...MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
          take: {
            minCollateral: 1e-8,
            liquiditySource: LiquiditySource.ONEINCH,
            marketPriceFactor: 1000000,
            hpbPriceFactor: undefined,
          },
        },
        signer,
        config: {
          subgraphUrl: '',
          oneInchRouters: { 1: '0x1111111254EEB25477B68fb85Ed929f73A960582' },
          connectorTokens: [],
          delayBetweenActions: 1,
        },
      })
    );
    expect(liquidations.length).to.equal(1);
    expect(liquidations[0].takeStrategy).to.equal(1);

    await takeLiquidation({
      pool,
      poolConfig: {
        ...MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
        take: {
          minCollateral: 1e-8,
          liquiditySource: LiquiditySource.ONEINCH,
          marketPriceFactor: 1000000,
        },
      },
      signer,
      liquidation: liquidations[0],
      config: {
        dryRun: false,
        oneInchRouters: { 1: '0x1111111254EEB25477B68fb85Ed929f73A960582' },
        connectorTokens: [],
        keeperTaker: keeperTakerAddress,
        delayBetweenActions: 1,
      },
    });

    const finalBalance = await quoteToken.balanceOf(signer.address);
    expect(finalBalance.gt(initialBalance)).to.be.true;

    const liquidationStatus = await pool.getLiquidation(borrower).getStatus();
    expect(liquidationStatus.collateral).to.eq(0);
  });

  // TODO: Last transaction fails with revert
  it.skip('should handle collateral mutation between swap and execution', async () => {
    const mutatedCollateral = BigNumber.from('10000000000000000000');

    const ONE_INCH_SWAP_RESPONSE_MUTATED = {
      tx: {
        to: '0x1111111254EEB25477B68fb85Ed929f73A960582',
        data: '0x12345678deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef',
        value: '0',
        gas: '200000',
      },
    };

    axiosGetStub
      .withArgs(sinon.match(/\/swap$/), sinon.match.any)
      .callsFake((url, config) => {
        const amount = config.params.amount;
        if (amount === '10000000000000000000') {
          return Promise.resolve({ data: ONE_INCH_SWAP_RESPONSE_MUTATED });
        }
        return Promise.resolve({ data: ONE_INCH_SWAP_RESPONSE });
      });

    overrideGetLiquidations(() =>
      Promise.resolve({
        pool: {
          hpb: 0.07,
          hpbIndex: 4689,
          liquidationAuctions: [
            {
              borrower,
            },
          ],
        },
      })
    );

    sinon.stub(pool, 'getLiquidation').returns({
      getStatus: async () => ({
        price: BigNumber.from('5215788124770'),
        collateral: mutatedCollateral,
      }),
    } as any);

    const liquidations = await arrayFromAsync(
      getLiquidationsToTake({
        pool,
        poolConfig: {
          ...MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
          take: {
            minCollateral: 1e-8,
            liquiditySource: LiquiditySource.ONEINCH,
            marketPriceFactor: 1000000,
            hpbPriceFactor: undefined,
          },
        },
        signer,
        config: {
          subgraphUrl: '',
          oneInchRouters: { 1: '0x1111111254EEB25477B68fb85Ed929f73A960582' },
          connectorTokens: [],
          delayBetweenActions: 1,
        },
      })
    );
    expect(liquidations.length).to.equal(1);
    expect(liquidations[0].collateral).to.eq(mutatedCollateral);

    const initialBalance = await quoteToken.balanceOf(signer.address);
    await takeLiquidation({
      pool,
      poolConfig: {
        ...MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
        take: {
          minCollateral: 1e-8,
          liquiditySource: LiquiditySource.ONEINCH,
          marketPriceFactor: 1000000,
        },
      },
      signer,
      liquidation: liquidations[0],
      config: {
        dryRun: false,
        oneInchRouters: { 1: '0x1111111254EEB25477B68fb85Ed929f73A960582' },
        connectorTokens: [],
        keeperTaker: keeperTakerAddress,
        delayBetweenActions: 1,
      },
    });

    const finalBalance = await quoteToken.balanceOf(signer.address);
    expect(finalBalance.gt(initialBalance)).to.be.true;

    const liquidationStatus = await pool.getLiquidation(borrower).getStatus();
    expect(liquidationStatus.collateral).to.eq(0);
  });
});
