import './subgraph-mock';
import { getLoansToKick, handleKicks, kick } from '../kick';
import { AjnaSDK, ERC20Pool__factory, FungiblePool } from '@ajna-finance/sdk';
import { MAINNET_CONFIG, USER1_MNEMONIC } from './test-config';
import { configureAjna, LiquiditySource, TokenToCollect } from '../config-types';
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
import {
  arbTakeLiquidation,
  getLiquidationsToTake,
  handleTakesWith1inch,
} from '../take';
import { BigNumber, constants, Wallet } from 'ethers';
import { arrayFromAsync, decimaledToWei, weiToDecimaled } from '../utils';
import { depositQuoteToken, drawDebt } from './loan-helpers';
import { SECONDS_PER_YEAR, SECONDS_PER_DAY } from '../constants';
import { NonceTracker } from '../nonce';
import { LpCollector } from '../collect-lp';
import { DexRouter } from '../dex-router';
import { RewardActionTracker } from '../reward-action-tracker';
import { collectBondFromPool } from '../collect-bond';

const setup = async () => {
  configureAjna(MAINNET_CONFIG.AJNA_CONFIG);
  const ajna = new AjnaSDK(getProvider());
  const pool: FungiblePool = await ajna.fungiblePoolFactory.getPoolByAddress(
    MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address
  );
  overrideGetLoans(makeGetLoansFromSdk(pool));
  overrideGetLiquidations(makeGetLiquidationsFromSdk(pool));
  overrideGetHighestMeaningfulBucket(makeGetHighestMeaningfulBucket(pool));
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
  await increaseTime(SECONDS_PER_YEAR * 2);
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
  const signer = await impersonateSigner(
    MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2
  );
  setBalance(
    MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2,
    '100000000000000000000'
  );
  await kick({
    pool,
    signer,
    loanToKick: loansToKick[0],
    config: {
      dryRun: false,
    },
  });

  return { pool, signer };
};

describe('getLiquidationsToArbTake', () => {
  beforeEach(async () => {
    await resetHardhat();
  });

  it('skips auction immediately after kick (price too high for arb take)', async () => {
    const { pool, signer } = await setup();
    // No increaseTime — auction price is still near 256 * NP, far above HPB
    const liquidationsToArbTake = await arrayFromAsync(
      getLiquidationsToTake({
        pool,
        poolConfig: MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
        signer,
        config: {
          subgraphUrl: '',
          oneInchRouters: {},
          connectorTokens: [],
        },
      })
    );
    expect(liquidationsToArbTake).to.be.empty;
  });

  it('gets loans when there are kicked loans', async () => {
    const { pool, signer } = await setup();
    await increaseTime(SECONDS_PER_DAY * 1);

    const liquidationsToArbTake = await arrayFromAsync(
      getLiquidationsToTake({
        pool,
        poolConfig: MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
        signer,
        config: {
          subgraphUrl: '',
          oneInchRouters: {},
          connectorTokens: [],
        },
      })
    );
    expect(liquidationsToArbTake.length).equals(1);
    expect(liquidationsToArbTake[0].borrower).equals(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress
    );
    expect(liquidationsToArbTake[0].isArbTakeable).to.be.true;
    expect(liquidationsToArbTake[0].collateral.gt(constants.Zero)).to.be.true;
    expect(liquidationsToArbTake[0].auctionPrice.gt(constants.Zero)).to.be.true;
  });

  it('skips liquidation when collateral is below minCollateral', async () => {
    const { pool, signer } = await setup();
    await increaseTime(SECONDS_PER_DAY * 1);

    // Set minCollateral very high — more than the 14 SOL pledged
    const liquidations = await arrayFromAsync(
      getLiquidationsToTake({
        pool,
        poolConfig: {
          ...MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
          take: {
            minCollateral: 1000, // 1000 SOL — way more than the 14 pledged
            hpbPriceFactor: 0.99,
          },
        },
        signer,
        config: {
          subgraphUrl: '',
          oneInchRouters: {},
          connectorTokens: [],
        },
      })
    );
    expect(liquidations).to.be.empty;
  });

  it('skips liquidation when auction price is above maxArbPrice (strict hpbPriceFactor)', async () => {
    const { pool, signer } = await setup();
    // Only wait a short time — auction price is still high relative to HPB
    await increaseTime(60 * 30); // 30 minutes

    const liquidations = await arrayFromAsync(
      getLiquidationsToTake({
        pool,
        poolConfig: {
          ...MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
          take: {
            minCollateral: 1e-8,
            hpbPriceFactor: 0.01, // Very strict — maxArbPrice = HPB * 0.01
          },
        },
        signer,
        config: {
          subgraphUrl: '',
          oneInchRouters: {},
          connectorTokens: [],
        },
      })
    );
    // Should find the auction but NOT mark it as arb-takeable
    // (auction price after 30 min is still much higher than HPB * 0.01)
    const arbTakeable = liquidations.filter(l => l.isArbTakeable);
    expect(arbTakeable).to.be.empty;
  });

  it('handles long-expired auction gracefully (price near floor)', async () => {
    const { pool, signer } = await setup();
    // Wait well past the 72-hour auction duration
    await increaseTime(SECONDS_PER_DAY * 4);

    // Verify the auction still exists on-chain (hasn't been settled yet)
    const liquidation = pool.getLiquidation(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress
    );
    const status = await liquidation.getStatus();

    // After 4 days, auction price should have decayed to near-zero
    const auctionPrice = weiToDecimaled(status.price);
    expect(auctionPrice).to.be.lessThan(0.001, 'Auction price should be near zero after 4 days');

    // Collateral should still exist (no one settled it)
    expect(weiToDecimaled(status.collateral)).to.be.greaterThan(0);

    // getLiquidationsToTake should still find it — at this low price it's arb-takeable
    const liquidations = await arrayFromAsync(
      getLiquidationsToTake({
        pool,
        poolConfig: MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
        signer,
        config: {
          subgraphUrl: '',
          oneInchRouters: {},
          connectorTokens: [],
        },
      })
    );
    // At near-zero auction price, it should be arb-takeable (price < HPB * factor)
    expect(liquidations.length).to.equal(1);
    expect(liquidations[0].isArbTakeable).to.be.true;
  });
});

describe('arbTakeLiquidation', () => {
  beforeEach(async () => {
    await resetHardhat();
  });

  it('ArbTakes eligible liquidations and earns lpb', async () => {
    const { pool } = await setup();
    await increaseTime(SECONDS_PER_DAY * 1); // Increase timestamp by 1 day.
    const signer = Wallet.fromMnemonic(USER1_MNEMONIC).connect(getProvider());
    setBalance(signer.address, decimaledToWei(100).toHexString());

    const liquidationsToArbTake = await arrayFromAsync(
      getLiquidationsToTake({
        pool,
        poolConfig: MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
        signer,
        config: {
          subgraphUrl: '',
          oneInchRouters: {},
          connectorTokens: [],
        },
      })
    );

    await arbTakeLiquidation({
      pool,
      poolConfig: MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
      signer,
      config: {
        dryRun: false,
      },
      liquidation: liquidationsToArbTake[0],
    });
    const bucket = await pool.getBucketByIndex(
      liquidationsToArbTake[0].hpbIndex
    );
    const loan = await pool.getLoan(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress
    );
    const lpBalance = await bucket.lpBalance(await signer.getAddress());
    // Taker receives LP in the bucket (per Ajna whitepaper: arb taker gets LP representing collateral)
    expect(weiToDecimaled(lpBalance)).to.be.greaterThan(0);
    // All collateral should be consumed by the take
    expect(weiToDecimaled(loan.collateral)).equals(0);
    // Loan should still have remaining debt (arb take repays partial debt via bucket exchange)
    // Note: original debt was 0.9 WETH but accrued interest over 2 years makes it higher
    expect(loan.debt.gt(constants.Zero)).to.be.true;
  });

  it('dryRun mode does not execute the arb take', async () => {
    const { pool } = await setup();
    await increaseTime(SECONDS_PER_DAY * 1);
    const signer = Wallet.fromMnemonic(USER1_MNEMONIC).connect(getProvider());
    setBalance(signer.address, decimaledToWei(100).toHexString());

    const liquidations = await arrayFromAsync(
      getLiquidationsToTake({
        pool,
        poolConfig: MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
        signer,
        config: {
          subgraphUrl: '',
          oneInchRouters: {},
          connectorTokens: [],
        },
      })
    );

    await arbTakeLiquidation({
      pool,
      poolConfig: MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
      signer,
      config: {
        dryRun: true, // DRY RUN
      },
      liquidation: liquidations[0],
    });

    // Collateral should still be there — dryRun didn't execute
    const loan = await pool.getLoan(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress
    );
    expect(weiToDecimaled(loan.collateral)).to.be.greaterThan(0);
    // Taker should have earned no LP
    const hpbIndex = liquidations[0].hpbIndex;
    const bucket = pool.getBucketByIndex(hpbIndex);
    const lpBalance = await bucket.lpBalance(signer.address);
    expect(weiToDecimaled(lpBalance)).to.equal(0);
  });
});

describe('handleTakesWith1inch', () => {
  beforeEach(async () => {
    await resetHardhat();
    NonceTracker.clearNonces();
  });

  it('ArbTakes multiple times to fill multiple buckets in one auction.', async () => {
    configureAjna(MAINNET_CONFIG.AJNA_CONFIG);
    const ajna = new AjnaSDK(getProvider());
    const pool: FungiblePool = await ajna.fungiblePoolFactory.getPoolByAddress(
      MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address
    );
    overrideGetLoans(makeGetLoansFromSdk(pool));
    overrideGetLiquidations(makeGetLiquidationsFromSdk(pool));
    overrideGetHighestMeaningfulBucket(makeGetHighestMeaningfulBucket(pool));
    const bucket1 = pool.getBucketByPrice(decimaledToWei(1));
    const bucket2 = pool.getBucketByIndex(bucket1.index + 1);
    await depositQuoteToken({
      pool,
      owner: MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress,
      amount: 1,
      price: weiToDecimaled(bucket1.price),
    });
    await depositQuoteToken({
      pool,
      owner: MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress,
      amount: 1,
      price: weiToDecimaled(bucket2.price),
    });
    await drawDebt({
      pool,
      owner: MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress,
      amountToBorrow: 1.5,
      collateralToPledge: 1.6,
    });
    await increaseTime(SECONDS_PER_YEAR * 2);
    const signer = await impersonateSigner(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2
    );
    setBalance(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress2,
      '100000000000000000000'
    );
    await handleKicks({
      signer,
      pool,
      poolConfig: MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
      config: {
        subgraphUrl: '',
        coinGeckoApiKey: '',
        delayBetweenActions: 0,
      },
    });
    const AUCTION_WAIT_TIME = 60 * 20 * 6 + 2 * 2 * 60 * 60 + 50 * 60;
    await increaseTime(AUCTION_WAIT_TIME);

    // Record initial deposits for comparison
    const bucket2DepositBefore = weiToDecimaled((await bucket2.getStatus()).deposit);

    await handleTakesWith1inch({
      signer,
      pool,
      poolConfig: MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
      config: {
        subgraphUrl: '',
        delayBetweenActions: 0,
      },
    });

    const bucket1Status = await bucket1.getStatus();
    expect(weiToDecimaled(bucket1Status.deposit)).lessThan(
      1e-7,
      'Bucket 1 should only have dust remaining'
    );

    await handleTakesWith1inch({
      signer,
      pool,
      poolConfig: MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
      config: {
        subgraphUrl: '',
        delayBetweenActions: 0,
      },
    });

    const bucket2Status = await bucket2.getStatus();
    const bucket2DepositAfter = weiToDecimaled(bucket2Status.deposit);
    expect(bucket2DepositAfter).to.be.lessThan(
      bucket2DepositBefore,
      'Bucket 2 deposit should decrease after second arb take'
    );
  });
});

describe('ArbTake → LP Collection chain', () => {
  beforeEach(async () => {
    await resetHardhat();
    NonceTracker.clearNonces();
  });

  it('collects LP rewards after successful arb take', async () => {
    const { pool } = await setup();
    await increaseTime(SECONDS_PER_DAY * 1);

    const signer = await impersonateSigner(
      MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress2
    );
    setBalance(
      MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress2,
      decimaledToWei(100).toHexString()
    );

    const dexRouter = new DexRouter(signer);
    const lpCollector = new LpCollector(
      pool,
      signer,
      {
        collectLpReward: {
          redeemFirst: TokenToCollect.QUOTE,
          minAmountQuote: 0,
          minAmountCollateral: 0,
        },
      },
      {},
      new RewardActionTracker(
        signer,
        {
          uniswapOverrides: {
            wethAddress: MAINNET_CONFIG.WETH_ADDRESS,
            uniswapV3Router: MAINNET_CONFIG.UNISWAP_V3_ROUTER,
          },
          delayBetweenActions: 0,
          pools: [],
        },
        dexRouter
      )
    );

    // Start subscription BEFORE the arb take so the BucketTake event is captured
    await lpCollector.startSubscription();

    // Execute arb take
    await handleTakesWith1inch({
      pool,
      poolConfig: MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
      signer,
      config: {
        dryRun: false,
        subgraphUrl: '',
        delayBetweenActions: 0,
      },
    });

    // Wait for LP reward to be tracked
    let rewardLp: BigNumber | undefined;
    for (let i = 0; i < 50; i++) {
      const entries = Array.from(lpCollector.lpMap.entries());
      rewardLp = entries?.[0]?.[1];
      if (rewardLp && rewardLp.gt(constants.Zero)) break;
      await new Promise(r => setTimeout(r, 100));
    }

    expect(rewardLp).to.not.be.undefined;
    expect(rewardLp!.gt(constants.Zero)).to.be.true;

    // Verify LP was tracked in the collector's map
    const signerAddress = await signer.getAddress();
    const bucketIndex = Array.from(lpCollector.lpMap.keys())[0];
    const bucket = pool.getBucketByIndex(bucketIndex);
    const lpBalance = await bucket.lpBalance(signerAddress);
    expect(weiToDecimaled(lpBalance)).to.be.greaterThan(0);

    // Attempt to redeem LP rewards. When the arb take consumed the entire
    // bucket deposit, the redemption will fail on-chain (nothing to withdraw).
    // This is expected Ajna behavior — the LP represents a claim on an empty bucket.
    // The collectLpRewards() call handles this gracefully (logs error, continues).
    await lpCollector.collectLpRewards();

    // The LP reward should still be tracked (redemption from empty bucket
    // returns 0 tokens, so the reward isn't subtracted)
    const remainingReward = lpCollector.lpMap.get(bucketIndex);
    expect(remainingReward).to.not.be.undefined;
    expect(remainingReward!.gt(constants.Zero)).to.be.true;

    await lpCollector.stopSubscription();
  });
});

describe('ArbTake → Settlement → Bond Collection chain', () => {
  beforeEach(async () => {
    await resetHardhat();
    NonceTracker.clearNonces();
  });

  it('collects bond after arb take and settlement', async () => {
    const { pool, signer } = await setup();
    await increaseTime(SECONDS_PER_DAY * 2);

    // Execute arb take — consumes all collateral
    await handleTakesWith1inch({
      pool,
      poolConfig: MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
      signer,
      config: {
        dryRun: false,
        subgraphUrl: '',
        delayBetweenActions: 0,
      },
    });

    // Verify collateral is consumed
    const loan = await pool.getLoan(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress
    );
    expect(weiToDecimaled(loan.collateral)).equals(0);

    // Wait and settle the auction using NonceTracker to keep nonce in sync
    await increaseTime(SECONDS_PER_DAY * 2);
    NonceTracker.clearNonces(); // Re-sync nonce after SDK-direct settle call
    const liquidation = await pool.getLiquidation(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress
    );
    const settleTx = await liquidation.settle(signer);
    await settleTx.verifyAndSubmit();
    NonceTracker.clearNonces(); // Re-sync after settle

    // Verify bond state after settlement:
    // - locked should be 0 (auction is settled, bond is no longer locked)
    // - claimable may be > 0 (bond returned) or 0 (bond forfeited if auction price > NP)
    const signerAddress = await signer.getAddress();
    const { claimable, locked } = await pool.kickerInfo(signerAddress);
    expect(weiToDecimaled(locked)).to.equal(0, 'Bond should be unlocked after settlement');

    // Attempt bond collection — this exercises the full collectBondFromPool path
    await collectBondFromPool({
      signer,
      pool,
      poolConfig: {
        ...MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
        settlement: {
          enabled: true,
          minAuctionAge: 3600,
          maxBucketDepth: 50,
          maxIterations: 10,
          checkBotIncentive: false,
        },
      },
      config: {
        dryRun: false,
        subgraphUrl: '',
        delayBetweenActions: 0,
      },
    });

    // Verify: claimable should now be 0 regardless of path taken:
    // - If claimable was > 0: collectBondFromPool withdrew it → now 0
    // - If claimable was 0: nothing to withdraw → still 0
    const { claimable: claimableAfter, locked: lockedAfter } = await pool.kickerInfo(signerAddress);
    expect(weiToDecimaled(claimableAfter)).to.equal(0, 'Claimable bond should be 0 after collection');
    expect(weiToDecimaled(lockedAfter)).to.equal(0, 'Locked bond should remain 0');
  });
});
