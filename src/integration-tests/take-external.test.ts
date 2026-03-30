import { AjnaSDK, FungiblePool, Provider, Signer } from '@ajna-finance/sdk';
import axios from 'axios';
import { expect } from 'chai';
import { BigNumber, Contract, constants, ethers, utils, Wallet } from 'ethers';
import sinon from 'sinon';
import { AjnaKeeperTaker__factory } from '../../typechain-types/factories/contracts';
import { MockSwapRouter__factory } from '../../typechain-types/factories/contracts/mocks';
import { UniswapV3SwapAdapter__factory } from '../../typechain-types/factories/contracts/mocks/UniswapV3SwapAdapter.sol';
import * as oneInch from '../1inch';
import ERC20_ABI from '../abis/erc20.abi.json';
import { configureAjna, LiquiditySource } from '../config-types';
import { SECONDS_PER_DAY } from '../constants';
import { getLoansToKick, kick } from '../kick';
import { getLiquidationsToTake, takeLiquidation } from '../take';
import { arrayFromAsync, decimaledToWei, weiToDecimaled } from '../utils';
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
import { NonceTracker } from '../nonce';
import { getBalanceOfErc20 } from '../erc20';

describe('External Take with MockSwapRouter', () => {
  let provider: Provider;
  let pool: FungiblePool;
  let signer: Wallet;
  let keeperTakerAddress: string;
  let mockRouterAddress: string;
  let borrower: string;
  let quoteToken: Contract;
  let collateralToken: Contract;
  let axiosGetStub: sinon.SinonStub;

  before(async () => {
    process.env.ONEINCH_API = 'https://api.1inch.io/v6.0';
    process.env.ONEINCH_API_KEY = 'mock_api_key';
    provider = getProvider();
  });

  beforeEach(async () => {
    await resetHardhat();
    NonceTracker.clearNonces();

    // Stub axios to return mock 1inch API responses
    axiosGetStub = sinon.stub(axios, 'get');
    axiosGetStub
      .withArgs(sinon.match(/\/quote$/), sinon.match.any)
      .callsFake(() =>
        Promise.resolve({
          data: { dstAmount: '1000000000000000000' }, // 1 WETH
        })
      );
    axiosGetStub
      .withArgs(sinon.match(/\/swap$/), sinon.match.any)
      .callsFake(() =>
        Promise.resolve({
          data: {
            tx: {
              to: mockRouterAddress,
              data: '0x00', // not used — we override convertSwapApiResponseToDetailsBytes
              value: '0',
              gas: '200000',
            },
          },
        })
      );

    // Configure Ajna
    configureAjna(MAINNET_CONFIG.AJNA_CONFIG);
    const ajna = new AjnaSDK(provider);
    pool = await ajna.fungiblePoolFactory.getPoolByAddress(
      MAINNET_CONFIG.SOL_WETH_POOL.poolConfig.address
    );
    overrideGetLoans(makeGetLoansFromSdk(pool));
    overrideGetLiquidations(makeGetLiquidationsFromSdk(pool));
    overrideGetHighestMeaningfulBucket(makeGetHighestMeaningfulBucket(pool));

    // Create signer
    signer = Wallet.fromMnemonic(USER1_MNEMONIC).connect(provider);
    await setBalance(signer.address, utils.parseEther('100').toHexString());

    // Deploy AjnaKeeperTaker with pool factory
    const keeperTakerFactory = new AjnaKeeperTaker__factory(signer);
    const keeperTaker = await keeperTakerFactory.deploy(
      MAINNET_CONFIG.AJNA_CONFIG.erc20PoolFactory
    );
    await keeperTaker.deployed();
    keeperTakerAddress = keeperTaker.address;

    // Deploy MockSwapRouter with exchange rate:
    // SOL has 9 decimals, WETH has 18 decimals.
    // Rate: 1 SOL (1e9) = 0.075 WETH (75e15)
    // So numerator=75e15, denominator=1e9 → output = input * 75e15 / 1e9
    const mockRouterFactory = new MockSwapRouter__factory(signer);
    const mockRouter = await mockRouterFactory.deploy(
      utils.parseUnits('75', 15),  // 75e15
      utils.parseUnits('1', 9)     // 1e9
    );
    await mockRouter.deployed();
    mockRouterAddress = mockRouter.address;

    // Get token contracts
    quoteToken = new Contract(pool.quoteAddress, ERC20_ABI, provider);
    collateralToken = new Contract(pool.collateralAddress, ERC20_ABI, provider);

    // Fund the MockSwapRouter with quote tokens (WETH) so it can "swap"
    const quoteWhaleSigner = await impersonateSigner(
      MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress
    );
    await setBalance(
      MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress,
      utils.parseEther('1000').toHexString()
    );
    // Transfer WETH to mock router — this is the "DEX liquidity"
    await quoteToken
      .connect(quoteWhaleSigner)
      .transfer(mockRouterAddress, utils.parseEther('10'));

    // Stub convertSwapApiResponseToDetailsBytes to produce valid ABI data
    // pointing at the MockSwapRouter
    sinon
      .stub(oneInch, 'convertSwapApiResponseToDetailsBytes')
      .callsFake(() => {
        const details = {
          aggregationExecutor: mockRouterAddress, // not used by mock but must be valid address
          swapDescription: {
            srcToken: pool.collateralAddress,      // SOL (collateral)
            dstToken: pool.quoteAddress,           // WETH (quote)
            srcReceiver: mockRouterAddress,         // router receives collateral
            dstReceiver: keeperTakerAddress,        // keeper receives quote tokens
            amount: BigNumber.from('14000000000000000000'), // will be overridden by actual collateral
            minReturnAmount: BigNumber.from('500000000000000000'), // 0.5 WETH minimum
            flags: BigNumber.from('0'),
          },
          opaqueData: '0x', // empty — mock doesn't use it
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

    // Set up the loan and kick it
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
      config: { dryRun: false },
    });

    // Wait for auction price to decay
    await increaseTime(SECONDS_PER_DAY * 1);
    NonceTracker.clearNonces();

    borrower = MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress;
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should execute external take via MockSwapRouter and earn quote tokens', async () => {
    // Get initial quote token balance of the signer
    const initialBalance = await quoteToken.balanceOf(signer.address);

    // Detect liquidation with external take enabled
    const liquidations = await arrayFromAsync(
      getLiquidationsToTake({
        pool,
        poolConfig: {
          ...MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
          take: {
            minCollateral: 1e-8,
            liquiditySource: LiquiditySource.ONEINCH,
            marketPriceFactor: 1000000, // Very high so any price is takeable
            hpbPriceFactor: undefined,
          },
        },
        signer,
        config: {
          subgraphUrl: '',
          oneInchRouters: { 31337: mockRouterAddress },
          connectorTokens: [],
          delayBetweenActions: 0,
        },
      })
    );

    expect(liquidations.length).to.equal(1);
    expect(liquidations[0].isTakeable).to.be.true;
    expect(liquidations[0].borrower).to.equal(borrower);

    // Execute the take
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
        oneInchRouters: { 31337: mockRouterAddress },
        connectorTokens: [],
        keeperTaker: keeperTakerAddress,
        delayBetweenActions: 0,
      },
    });

    // Verify: signer should have received quote tokens (profit from the take)
    const finalBalance = await quoteToken.balanceOf(signer.address);
    expect(
      finalBalance.gt(initialBalance),
      `Quote balance should increase: before=${weiToDecimaled(initialBalance)}, after=${weiToDecimaled(finalBalance)}`
    ).to.be.true;

    // Verify: collateral should be consumed
    const liquidationStatus = await pool
      .getLiquidation(borrower)
      .getStatus();
    expect(weiToDecimaled(liquidationStatus.collateral)).to.equal(0);
  });

  it('should not take when no 1inch router configured for chain', async () => {
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
          oneInchRouters: {}, // No router for chainId 31337
          connectorTokens: [],
          delayBetweenActions: 0,
        },
      })
    );

    // Without a configured router, external take detection is skipped
    const takeable = liquidations.filter((l) => l.isTakeable);
    expect(takeable).to.be.empty;
  });

  it('should detect both external take and arb take when both are configured', async () => {
    const liquidations = await arrayFromAsync(
      getLiquidationsToTake({
        pool,
        poolConfig: {
          ...MAINNET_CONFIG.SOL_WETH_POOL.poolConfig,
          take: {
            // Arb take config
            minCollateral: 1e-8,
            hpbPriceFactor: 0.99,
            // External take config
            liquiditySource: LiquiditySource.ONEINCH,
            marketPriceFactor: 1000000,
          },
        },
        signer,
        config: {
          subgraphUrl: '',
          oneInchRouters: { 31337: mockRouterAddress },
          connectorTokens: [],
          delayBetweenActions: 0,
        },
      })
    );

    expect(liquidations.length).to.equal(1);
    // Both strategies should be flagged as eligible
    expect(liquidations[0].isTakeable, 'External take should be eligible').to.be
      .true;
    expect(liquidations[0].isArbTakeable, 'Arb take should be eligible').to.be
      .true;
  });
});

describe('Real Uniswap V3 External Take', () => {
  // This test uses NO mocks for the swap — real Uniswap V3 liquidity on the fork.
  // The UniswapV3SwapAdapter wraps the real Uniswap V3 SwapRouter behind
  // the 1inch IGenericRouter interface so the AjnaKeeperTaker can use it.
  //
  // FORK DEPENDENCY: This test relies on the SOL/WETH Uniswap V3 pool (0.3% fee)
  // having liquidity at the pinned fork block (see hardhat.config.ts forkConfigs.mainnet.blockNumber).
  // If the fork block is updated, verify liquidity still exists:
  //   1 SOL ≈ 0.073 WETH at block 21731352
  // Also depends on whale addresses in test-config.ts having token balances at that block.

  let provider: Provider;
  let pool: FungiblePool;
  let signer: Wallet;
  let keeperTakerAddress: string;
  let adapterAddress: string;
  let borrower: string;
  let quoteToken: Contract;

  // Real mainnet addresses
  const UNISWAP_V3_SWAP_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
  const UNISWAP_V3_FEE_TIER = 3000; // 0.3%

  before(async () => {
    process.env.ONEINCH_API = 'https://api.1inch.io/v6.0';
    process.env.ONEINCH_API_KEY = 'mock_api_key';
    provider = getProvider();

    // Verify the fork has Uniswap V3 liquidity for SOL/WETH before running tests.
    // This prevents cryptic reverts if the fork block is updated.
    const uniV3Quoter = new Contract(
      '0xb27308f9F90D607463bb33eA1BeBb41C27CE5AB6', // Uniswap V3 Quoter V1
      ['function quoteExactInputSingle(address tokenIn, address tokenOut, uint24 fee, uint256 amountIn, uint160 sqrtPriceLimitX96) external returns (uint256 amountOut)'],
      provider
    );
    try {
      const quote = await uniV3Quoter.callStatic.quoteExactInputSingle(
        MAINNET_CONFIG.SOL_WETH_POOL.collateralAddress,
        MAINNET_CONFIG.SOL_WETH_POOL.quoteAddress,
        UNISWAP_V3_FEE_TIER,
        '1000000000', // 1 SOL
        0
      );
      if (quote.eq(0)) {
        throw new Error('Zero output — pool may have no liquidity');
      }
    } catch (e: any) {
      throw new Error(
        `Real Uniswap V3 test requires SOL/WETH liquidity at the fork block. ` +
        `Update the fork block in hardhat.config.ts or skip this test. Error: ${e.message}`
      );
    }
  });

  beforeEach(async () => {
    await resetHardhat();
    NonceTracker.clearNonces();

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

    // Deploy AjnaKeeperTaker (uses 1inch interface)
    const keeperTakerFactory = new AjnaKeeperTaker__factory(signer);
    const keeperTaker = await keeperTakerFactory.deploy(
      MAINNET_CONFIG.AJNA_CONFIG.erc20PoolFactory
    );
    await keeperTaker.deployed();
    keeperTakerAddress = keeperTaker.address;

    // Deploy UniswapV3SwapAdapter — wraps real Uniswap V3 behind IGenericRouter
    const adapterFactory = new UniswapV3SwapAdapter__factory(signer);
    const adapter = await adapterFactory.deploy(
      UNISWAP_V3_SWAP_ROUTER,
      UNISWAP_V3_FEE_TIER
    );
    await adapter.deployed();
    adapterAddress = adapter.address;

    quoteToken = new Contract(pool.quoteAddress, ERC20_ABI, provider);

    // Stub the 1inch API calls (for detection phase only — the actual swap uses real Uniswap)
    const axiosStub = sinon.stub(axios, 'get');
    axiosStub
      .withArgs(sinon.match(/\/quote$/), sinon.match.any)
      .callsFake(() =>
        Promise.resolve({
          data: { dstAmount: '1000000000000000000' },
        })
      );
    axiosStub
      .withArgs(sinon.match(/\/swap$/), sinon.match.any)
      .callsFake(() =>
        Promise.resolve({
          data: { tx: { to: adapterAddress, data: '0x00', value: '0', gas: '500000' } },
        })
      );

    // Override the swap encoding to produce valid data for the adapter
    sinon
      .stub(oneInch, 'convertSwapApiResponseToDetailsBytes')
      .callsFake(() => {
        return utils.defaultAbiCoder.encode(
          ['(address,(address,address,address,address,uint256,uint256,uint256),bytes)'],
          [[
            adapterAddress, // aggregationExecutor (not used by adapter)
            [
              pool.collateralAddress,   // srcToken: SOL
              pool.quoteAddress,        // dstToken: WETH
              adapterAddress,           // srcReceiver
              keeperTakerAddress,       // dstReceiver: keeper gets WETH
              BigNumber.from('14000000000'), // amount in SOL decimals (14 SOL * 1e9)
              BigNumber.from('1'),      // minReturnAmount: 1 wei (let Uniswap determine actual output)
              BigNumber.from('0'),      // flags
            ],
            '0x', // opaqueData
          ]]
        );
      });

    // Set up loan, kick
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
        config: { subgraphUrl: '', coinGeckoApiKey: '' },
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
      config: { dryRun: false },
    });

    await increaseTime(SECONDS_PER_DAY * 1);
    NonceTracker.clearNonces();
    borrower = MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress;
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should execute take via real Uniswap V3 liquidity (no mock swap)', async () => {
    const initialBalance = await quoteToken.balanceOf(signer.address);

    // Detect
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
          oneInchRouters: { 31337: adapterAddress },
          connectorTokens: [],
          delayBetweenActions: 0,
        },
      })
    );

    expect(liquidations.length).to.equal(1);
    expect(liquidations[0].isTakeable).to.be.true;

    // Execute — this calls pool.take() → atomicSwapCallback() → adapter.swap() → real Uniswap V3
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
        oneInchRouters: { 31337: adapterAddress },
        connectorTokens: [],
        keeperTaker: keeperTakerAddress,
        delayBetweenActions: 0,
      },
    });

    // Verify: signer earned real WETH from real Uniswap V3 swap
    const finalBalance = await quoteToken.balanceOf(signer.address);
    expect(
      finalBalance.gt(initialBalance),
      `Signer should profit from real Uniswap V3 swap: before=${weiToDecimaled(initialBalance)}, after=${weiToDecimaled(finalBalance)}`
    ).to.be.true;

    // Verify: all collateral consumed
    const status = await pool.getLiquidation(borrower).getStatus();
    expect(weiToDecimaled(status.collateral)).to.equal(0);
  });
});
