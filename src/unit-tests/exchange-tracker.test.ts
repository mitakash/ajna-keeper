import { Wallet } from 'ethers';
import { ExchangeTracker } from '../exchange-tracker';
import { MAINNET_CONFIG } from '../integration-tests/test-config';
import sinon from 'sinon';
import Uniswap from '../uniswap';
import { decimaledToWei } from '../utils';
import { FeeAmount } from '@uniswap/v3-sdk';
import { expect } from 'chai';

describe('ExchangeTracker', () => {
  afterEach(() => {
    sinon.restore();
  });

  it('Collects tokens at the fee and clears entry after success.', async () => {
    const signer = Wallet.createRandom();
    const swapToWethStub = sinon.stub(Uniswap, 'swapToWeth');
    const wethAddress = MAINNET_CONFIG.WETH_ADDRESS;
    const uniswapV3Router = MAINNET_CONFIG.UNISWAP_V3_ROUTER;
    const tokenToSwap = MAINNET_CONFIG.WBTC_USDC_POOL.collateralAddress;
    const et = new ExchangeTracker(signer, {
      wethAddress: wethAddress,
      uniswapV3Router: uniswapV3Router,
      delayBetweenActions: 0,
    });
    et.addTokenToBeExchanged(tokenToSwap, decimaledToWei(1), FeeAmount.MEDIUM);
    await et.exchangeAllTokens(); // Should clear entry after successful call.
    await et.exchangeAllTokens();

    expect(
      swapToWethStub.calledOnceWith(
        signer,
        tokenToSwap,
        decimaledToWei(1),
        FeeAmount.MEDIUM,
        wethAddress,
        uniswapV3Router
      )
    ).to.be.true;
  });

  it('Tries to collect added tokens at the fee and clears entry after success.', async () => {
    const signer = Wallet.createRandom();
    const swapToWethStub = sinon
      .stub(Uniswap, 'swapToWeth')
      .throws('Error msg does not matter.');
    const wethAddress = MAINNET_CONFIG.WETH_ADDRESS;
    const uniswapV3Router = MAINNET_CONFIG.UNISWAP_V3_ROUTER;
    const tokenToSwap = MAINNET_CONFIG.WBTC_USDC_POOL.collateralAddress;
    const et = new ExchangeTracker(signer, {
      wethAddress: wethAddress,
      uniswapV3Router: uniswapV3Router,
      delayBetweenActions: 0,
    });
    et.addTokenToBeExchanged(tokenToSwap, decimaledToWei(1), FeeAmount.MEDIUM);
    await et.exchangeAllTokens(); // Should clear entry after successful call.
    await et.exchangeAllTokens();

    expect(swapToWethStub.callCount).equals(2);
    expect(
      swapToWethStub.calledWith(
        signer,
        tokenToSwap,
        decimaledToWei(1),
        FeeAmount.MEDIUM,
        wethAddress,
        uniswapV3Router
      )
    ).to.be.true;
  });
});
