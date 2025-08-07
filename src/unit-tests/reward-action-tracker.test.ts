import { FeeAmount } from '@uniswap/v3-sdk';
import { expect } from 'chai';
import { BigNumber, Wallet } from 'ethers';
import sinon, { SinonStub } from 'sinon';
import { RewardAction, RewardActionLabel, KeeperConfig, PostAuctionDex } from '../config-types';
import { DexRouter } from '../dex-router';
import { MAINNET_CONFIG } from '../integration-tests/test-config';
import {
  deterministicJsonStringify,
  RewardActionTracker,
} from '../reward-action-tracker';
import { decimaledToWei } from '../utils';

// Helper function to create a mock KeeperConfig for testing
function createMockKeeperConfig(overrides: Partial<KeeperConfig> = {}): KeeperConfig {
  return {
    // Required fields with mock values
    ethRpcUrl: 'mock://rpc',
    logLevel: 'info',
    subgraphUrl: 'mock://subgraph',
    keeperKeystore: '/path/to/mock-keystore.json',
    keeperTaker: '0x0000000000000000000000000000000000000000',
    delayBetweenRuns: 0,
    delayBetweenActions: 0,
    dryRun: true,
    pools: [],
    coinGeckoApiKey: 'mock-api-key',
    ajna: {
      erc20PoolFactory: '0x0000000000000000000000000000000000000000',
      erc721PoolFactory: '0x0000000000000000000000000000000000000000',
      poolUtils: '0x0000000000000000000000000000000000000000',
      positionManager: '0x0000000000000000000000000000000000000000',
      ajnaToken: '0x0000000000000000000000000000000000000000',
      grantFund: '',
      burnWrapper: '',
      lenderHelper: '',
    },
    // Apply any test-specific overrides
    ...overrides
  };
}

describe('deterministicJsonStringify', () => {
  it('serializes a shallow object in a repeatable way', () => {
    const obj1: { [key: string]: string } = { hello: 'world' };
    obj1.foo = 'bar';
    const result1 = deterministicJsonStringify(obj1);
    const obj2: { [key: string]: string } = { foo: 'bar' };
    obj2.hello = 'world';
    const result2 = deterministicJsonStringify(obj1);
    expect(result1).equals(result2).equals('{"foo":"bar","hello":"world"}');
  });
});

describe('RewardActionTracker', () => {
  let dexRouter: { swap: SinonStub };

  beforeEach(() => {});

  afterEach(() => {
    sinon.restore();
  });

  it('Swaps to eth and clears entry after', async () => {
    const signer = Wallet.createRandom();
    sinon.stub(signer, 'getChainId').resolves(1);

    dexRouter = {
      swap: sinon.stub().resolves({ success: true }),
    } as unknown as { swap: SinonStub };
    const wethAddress = MAINNET_CONFIG.WETH_ADDRESS;
    const tokenToSwap = MAINNET_CONFIG.WBTC_USDC_POOL.collateralAddress;
    const et = new RewardActionTracker(
      signer,
      createMockKeeperConfig({
        oneInchRouters: { 1: '0x1111111254EEB25477B68fb85Ed929f73A960582' },
        tokenAddresses: { weth: wethAddress },
        delayBetweenActions: 0,
      }),
      dexRouter as unknown as DexRouter
    );

    const exchangeAction: RewardAction = {
      action: RewardActionLabel.EXCHANGE,
      address: tokenToSwap,
      targetToken: 'weth',
      slippage: 1,
      dexProvider: PostAuctionDex.ONEINCH,
      fee: FeeAmount.MEDIUM,
    };
    const amount = decimaledToWei(1);
    et.addToken(exchangeAction, tokenToSwap, amount);

    await et.handleAllTokens();
    await et.handleAllTokens();
    
    console.log('DexRouter swap call count:', dexRouter.swap.callCount);
    
    // The swap should have been called
    expect(dexRouter.swap.callCount).to.be.greaterThan(0);
    
    console.log('Actual call args:', dexRouter.swap.getCall(0).args);
    
    expect(dexRouter.swap.calledOnce).to.be.true;
    const callArgs = dexRouter.swap.getCall(0).args;
    expect(callArgs[0]).to.equal(1); // chainId
    expect(callArgs[1]).to.deep.equal(amount); // amount - use deep.equal for BigNumber
    expect(callArgs[2]).to.equal(tokenToSwap); // tokenIn
    expect(callArgs[3]).to.equal(wethAddress); // tokenOut
    expect(callArgs[4]).to.equal(signer.address); // to
    expect(callArgs[5]).to.equal(PostAuctionDex.ONEINCH); // dexProvider
    expect(callArgs[6]).to.equal(1); // slippage
    expect(callArgs[7]).to.equal(FeeAmount.MEDIUM); // feeAmount
    // Check the combinedSettings structure - will debug this based on console output
    console.log('Combined settings (arg 8):', JSON.stringify(callArgs[8], null, 2));
  });

  it('Handles swap failure properly with retries', async () => {
    const signer = Wallet.createRandom();
    sinon.stub(signer, 'getChainId').resolves(1);

    // Mock a dexRouter that fails with a resolved error response
    dexRouter = {
      swap: sinon.stub().resolves({ success: false, error: 'Swap failed' }),
    } as unknown as { swap: SinonStub };

    const wethAddress = MAINNET_CONFIG.WETH_ADDRESS;
    const tokenToSwap = MAINNET_CONFIG.WBTC_USDC_POOL.collateralAddress;

    const et = new RewardActionTracker(
      signer,
      createMockKeeperConfig({
        oneInchRouters: { 1: '0x1111111254EEB25477B68fb85Ed929f73A960582' },
        tokenAddresses: { weth: wethAddress },
        delayBetweenActions: 0,
      }),
      dexRouter as unknown as DexRouter
    );

    const exchangeAction: RewardAction = {
      action: RewardActionLabel.EXCHANGE,
      address: tokenToSwap,
      targetToken: 'weth',
      slippage: 1,
      dexProvider: PostAuctionDex.ONEINCH,
      fee: FeeAmount.MEDIUM,
    };

    const amount = decimaledToWei(1);
    et.addToken(exchangeAction, tokenToSwap, amount);

    // First call - should attempt but not throw error
    await et.handleAllTokens();
    expect(dexRouter.swap.calledOnce).to.be.true;

    // Verify token is still in queue for retries - reset the stub's history
    dexRouter.swap.resetHistory();

    // Second call - should attempt again
    await et.handleAllTokens();
    expect(dexRouter.swap.calledOnce).to.be.true;

    // Third call - should attempt again
    dexRouter.swap.resetHistory();
    await et.handleAllTokens();
    expect(dexRouter.swap.calledOnce).to.be.true;

    // After MAX_RETRY_COUNT (3), the token should be removed
    dexRouter.swap.resetHistory();
    await et.handleAllTokens();
    // No more calls should happen since token should be removed
    expect(dexRouter.swap.called).to.be.false;
  });
});
