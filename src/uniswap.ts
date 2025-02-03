// import { Pool as UniswapV3Pool, FeeAmount, Route } from "@uniswap/v3-sdk";
// import { Token, Ether } from "@uniswap/sdk-core";
// import { Contract, providers, BigNumber } from 'ethers';
// import { getDecimalsErc20 } from "./erc20";
// import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';

// interface PoolInfo {
//   sqrtPriceX96: BigNumber;
//   liquidity: BigNumber;
//   tick: number;
// }

// export async function getPoolInfo(provider: providers.JsonRpcProvider, nativeToken: Token, erc20Token: Token, feeAmt: FeeAmount): Promise<PoolInfo> {
//   const poolAddress = UniswapV3Pool.getAddress(nativeToken, erc20Token, feeAmt);
//   const poolContract = new Contract(poolAddress, IUniswapV3PoolABI.abi, provider);
//   const [liquidity, slot0] =
//   await Promise.all([
//     poolContract.liquidity(),
//     poolContract.slot0(),
//   ]);

//   return {
//     liquidity,
//     sqrtPriceX96: slot0[0],
//     tick: slot0[1],
//   };
// }

// export async function exchangeForNative(provider: providers.JsonRpcProvider, erc20Address: string, fee: FeeAmount, amount: number) {
//   const {chainId} = await provider.getNetwork()
//   const decimals = await getDecimalsErc20(provider, erc20Address);
//   const erc20Token = new Token(
//     chainId,
//     erc20Address,
//     decimals,
//   );
//   const nativeToken = Ether.onChain(chainId).wrapped;
//   const poolInfo = await getPoolInfo(provider, nativeToken, erc20Token, fee);

//   const pool = new UniswapV3Pool(
//     nativeToken,
//     erc20Token,
//     fee,
//     poolInfo.sqrtPriceX96.toString(),
//     poolInfo.liquidity.toString(),
//     poolInfo.tick,
//   )

//   const route = new Route(
//     [pool],
//     erc20Token,
//     nativeToken
//   )

//   // TODO: Complete uniswap exchange logic.
//   // const trade = Trade.createUncheckedTrade({
//   //   route,
//   //   inputAmount: amount,
//   // }
// }
