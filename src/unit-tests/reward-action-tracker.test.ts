import { FeeAmount } from '@uniswap/v3-sdk';
import { expect } from 'chai';
import { BigNumber, Wallet } from 'ethers';
import sinon, { SinonStub } from 'sinon';
import { RewardAction, RewardActionLabel } from '../config-types';
import { DexRouter } from '../dex-router';
import { MAINNET_CONFIG } from '../integration-tests/test-config';
import {
  deterministicJsonStringify,
  RewardActionTracker,
} from '../reward-action-tracker';
import { decimaledToWei } from '../utils';

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

  it('Swaps to eth and clears entry after.', async () => {
    const signer = Wallet.createRandom();
    sinon.stub(signer, 'getChainId').resolves(1);

    dexRouter = {
      swap: sinon.stub().resolves(),
    } as unknown as { swap: SinonStub };
    const wethAddress = MAINNET_CONFIG.WETH_ADDRESS;
    const uniswapV3Router = MAINNET_CONFIG.UNISWAP_V3_ROUTER;
    const tokenToSwap = MAINNET_CONFIG.WBTC_USDC_POOL.collateralAddress;
    const et = new RewardActionTracker(
      signer,
      {
        uniswapOverrides: {
          wethAddress: wethAddress,
          uniswapV3Router: uniswapV3Router,
        },
        delayBetweenActions: 0,
        pools: [],
        oneInchRouters: { 1: '0x1111111254EEB25477B68fb85Ed929f73A960582' },
        tokenAddresses: { weth: wethAddress },
      },
      dexRouter as unknown as DexRouter
    );

    const exchangeAction: RewardAction = {
      action: RewardActionLabel.EXCHANGE,
      address: tokenToSwap,
      targetToken: 'weth',
      slippage: 1,
      useOneInch: false,
      fee: FeeAmount.MEDIUM,
    };
    const amount = decimaledToWei(1);
    et.addToken(exchangeAction, tokenToSwap, amount);

    await et.handleAllTokens();
    await et.handleAllTokens();

    expect(
      dexRouter.swap.calledWith(
        1,
        amount,
        tokenToSwap,
        wethAddress,
        signer.address,
        false,
        1,
        FeeAmount.MEDIUM,
        { wethAddress, uniswapV3Router }
      )
    ).to.be.true;
  });

  it('Handles swap failure properly.', async () => {
    const signer = Wallet.createRandom();
    sinon.stub(signer, 'getChainId').resolves(1);

    dexRouter = {
      swap: sinon.stub().rejects(new Error('Swap failed')),
    } as unknown as { swap: SinonStub };

    const wethAddress = MAINNET_CONFIG.WETH_ADDRESS;
    const uniswapV3Router = MAINNET_CONFIG.UNISWAP_V3_ROUTER;
    const tokenToSwap = MAINNET_CONFIG.WBTC_USDC_POOL.collateralAddress;

    const et = new RewardActionTracker(
      signer,
      {
        uniswapOverrides: {
          wethAddress: wethAddress,
          uniswapV3Router: uniswapV3Router,
        },
        delayBetweenActions: 0,
        pools: [],
      },
      dexRouter as unknown as DexRouter
    );

    const exchangeAction: RewardAction = {
      action: RewardActionLabel.EXCHANGE,
      address: tokenToSwap,
      targetToken: 'weth',
      slippage: 1,
      useOneInch: false,
      fee: FeeAmount.MEDIUM,
    };

    const amount = decimaledToWei(1);
    et.addToken(exchangeAction, tokenToSwap, amount);

    await expect(et.handleAllTokens()).to.be.rejectedWith('Swap failed');

    expect(dexRouter.swap.calledOnce).to.be.true;
  });
});
