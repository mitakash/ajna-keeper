import './subgraph-mock';
import { AjnaSDK, FungiblePool, Provider } from '@ajna-finance/sdk';
import { MAINNET_CONFIG, USER1_MNEMONIC } from './test-config';
import { configureAjna } from '../config-types';
import {
  getProvider,
  resetHardhat,
  increaseTime,
  impersonateSigner,
  setBalance,
} from './test-utils';
import {
  makeGetHighestMeaningfulBucket,
  makeGetLiquidationsFromSdk,
  makeGetLoansFromSdk,
  overrideGetHighestMeaningfulBucket,
  overrideGetLiquidations,
  overrideGetLoans,
} from './subgraph-mock';
import { expect } from 'chai';
import { getLiquidationsToTake, handleTakes } from '../take';
import { LiquiditySource } from '../config-types';
import { Wallet } from 'ethers';
import { arrayFromAsync, decimaledToWei } from '../utils';
import { depositQuoteToken, drawDebt } from './loan-helpers';
import { SECONDS_PER_DAY } from '../constants';
import { getLoansToKick, kick } from '../kick';
import { AjnaKeeperTaker__factory } from '../../typechain-types/factories/contracts';
import axios from 'axios';
import sinon from 'sinon';
import { BigNumber } from 'ethers';

describe('Take with 1inch Integration', () => {
  let provider: Provider;
  let axiosGetStub: sinon.SinonStub;

  before(async () => {
    provider = getProvider();
    await resetHardhat();
  });

  beforeEach(async () => {
    await resetHardhat();
    axiosGetStub = sinon.stub(axios, 'get');
    axiosGetStub.resolves({
      data: {
        toAmount: '1000000000000000000',
        tx: {
          to: '0x1111111254EEB25477B68fb85Ed929f73A960582',
          data: '0x',
          value: '0',
          gas: '100000',
        },
      },
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  async function setup() {
    configureAjna(MAINNET_CONFIG.AJNA_CONFIG);
    const ajna = new AjnaSDK(provider);
    const pool: FungiblePool = await ajna.fungiblePoolFactory.getPoolByAddress(
      MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address
    );

    overrideGetLoans(makeGetLoansFromSdk(pool));
    overrideGetLiquidations(makeGetLiquidationsFromSdk(pool));
    overrideGetHighestMeaningfulBucket(makeGetHighestMeaningfulBucket(pool));

    const signer = Wallet.fromMnemonic(USER1_MNEMONIC).connect(provider);
    setBalance(signer.address, decimaledToWei(100).toHexString());
    const keeperTakerFactory = new AjnaKeeperTaker__factory(signer);
    const address = await signer.getAddress();
    const keeperTaker = await keeperTakerFactory.deploy(address);
    await keeperTaker.deployed();

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
    setBalance(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2,
      '100000000000000000000'
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

    return {
      pool,
      signer,
      keeperTakerAddress: keeperTaker.address,
      borrower: MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress,
    };
  }

  it('should deploy AjnaKeeperTaker and setup environment', async () => {
    const { pool, signer, keeperTakerAddress, borrower } = await setup();

    console.log(`Deployed AjnaKeeperTaker at: ${keeperTakerAddress}`);

    expect(pool.poolAddress).to.equal(MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address);
    expect(signer.address).to.match(/^0x[a-fA-F0-9]{40}$/);
    expect(keeperTakerAddress).to.match(/^0x[a-fA-F0-9]{40}$/);
    expect(borrower).to.match(/^0x[a-fA-F0-9]{40}$/);

    const keeperTaker = AjnaKeeperTaker__factory.connect(keeperTakerAddress, signer);
    expect(await keeperTaker.signer.getAddress()).to.equal(signer.address);

    const liquidationStatus = await pool.getLiquidation(borrower).getStatus();
    console.log(
      `Liquidation status: price=${liquidationStatus.price.toString()}, collateral=${liquidationStatus.collateral.toString()}`
    );

    const liquidations = await arrayFromAsync(
      getLiquidationsToTake({
        pool,
        poolConfig: {
          ...MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
          take: {
            minCollateral: Number('10000000000000000'),
            liquiditySource: LiquiditySource.ONEINCH,
            marketPriceFactor: 0.9,
          },
        },
        signer,
        config: {
          subgraphUrl: '',
          oneInchRouters: { 1: '0x1111111254EEB25477B68fb85Ed929f73A960582' },
          connectorTokens: [],
        },
      })
    );
    console.log(`Liquidations length: ${liquidations.length}`);
  });
});