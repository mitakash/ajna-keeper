// import { Wallet } from 'ethers';
// import {
//   deterministicJsonStringify,
//   RewardActionTracker,
// } from '../reward-action-tracker';
// import { MAINNET_CONFIG } from '../integration-tests/test-config';
// import sinon from 'sinon';
// import Uniswap from '../uniswap';
// import { decimaledToWei } from '../utils';
// import { FeeAmount } from '@uniswap/v3-sdk';
// import { expect } from 'chai';
// import { RewardActionLabel } from '../config-types';

// describe('deterministicJsonStringify', () => {
//   it('serializes a shallow object in a repeatable way', () => {
//     const obj1: { [key: string]: string } = { hello: 'world' };
//     obj1.foo = 'bar';
//     const result1 = deterministicJsonStringify(obj1);
//     const obj2: { [key: string]: string } = { foo: 'bar' };
//     obj2.hello = 'world';
//     const result2 = deterministicJsonStringify(obj1);
//     expect(result1).equals(result2).equals('{"foo":"bar","hello":"world"}');
//   });
// });

// describe('RewardActionTracker', () => {
//   afterEach(() => {
//     sinon.restore();
//   });

//   it('Swaps to eth and clears entry after.', async () => {
//     const signer = Wallet.createRandom();
//     const swapToWethStub = sinon.stub(Uniswap, 'swapToWeth');
//     const wethAddress = MAINNET_CONFIG.WETH_ADDRESS;
//     const uniswapV3Router = MAINNET_CONFIG.UNISWAP_V3_ROUTER;
//     const tokenToSwap = MAINNET_CONFIG.WBTC_USDC_POOL.collateralAddress;
//     const et = new RewardActionTracker(signer, {
//       uniswapOverrides: {
//         wethAddress: wethAddress,
//         uniswapV3Router: uniswapV3Router,
//       },
//       delayBetweenActions: 0,
//     });
//     et.addToken(
//       { action: RewardActionLabel.EXCHANGE_ON_UNISWAP, fee: FeeAmount.MEDIUM },
//       tokenToSwap,
//       decimaledToWei(1)
//     );
//     await et.handleAllTokens(); // Should clear entry after successful call.
//     await et.handleAllTokens();

//     expect(
//       swapToWethStub.calledOnceWith(
//         signer,
//         tokenToSwap,
//         decimaledToWei(1),
//         FeeAmount.MEDIUM,
//         {
//           wethAddress,
//           uniswapV3Router,
//         }
//       )
//     ).to.be.true;
//   });

//   it('Retrys swap to eth upon failure.', async () => {
//     const signer = Wallet.createRandom();
//     const swapToWethStub = sinon
//       .stub(Uniswap, 'swapToWeth')
//       .throws('Error msg does not matter.');
//     const wethAddress = MAINNET_CONFIG.WETH_ADDRESS;
//     const uniswapV3Router = MAINNET_CONFIG.UNISWAP_V3_ROUTER;
//     const tokenToSwap = MAINNET_CONFIG.WBTC_USDC_POOL.collateralAddress;
//     const et = new RewardActionTracker(signer, {
//       uniswapOverrides: {
//         wethAddress: wethAddress,
//         uniswapV3Router: uniswapV3Router,
//       },
//       delayBetweenActions: 0,
//     });
//     et.addToken(
//       { action: RewardActionLabel.EXCHANGE_ON_UNISWAP, fee: FeeAmount.MEDIUM },
//       tokenToSwap,
//       decimaledToWei(1)
//     );
//     await et.handleAllTokens();
//     await et.handleAllTokens();

//     expect(swapToWethStub.callCount).equals(2);
//     expect(
//       swapToWethStub.calledWith(
//         signer,
//         tokenToSwap,
//         decimaledToWei(1),
//         FeeAmount.MEDIUM,
//         {
//           wethAddress,
//           uniswapV3Router,
//         }
//       )
//     ).to.be.true;
//   });
// });
