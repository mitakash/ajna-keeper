import {
  CurrencyAmount,
  Percent,
  SWAP_ROUTER_02_ADDRESSES,
  V3_CORE_FACTORY_ADDRESSES,
  Token,
  TradeType,
  WETH9,
} from '@uniswap/sdk-core';
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';
import { abi as UniswapABI } from '@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json';
import {
  FeeAmount,
  Route,
  Tick,
  TickListDataProvider,
  TickMath,
  Trade,
  Pool as UniswapV3Pool,
} from '@uniswap/v3-sdk';
import { BigNumber, Contract, ethers, providers, Signer, constants } from 'ethers';
import ERC20_ABI from './abis/erc20.abi.json';
import { logger } from './logging';
import { NonceTracker } from './nonce';
import { tokenChangeDecimals, weiToDecimaled } from './utils';
import { approveErc20, getAllowanceOfErc20 } from './erc20';
import { UniswapV3Overrides } from './config-types';

interface PoolInfo {
  sqrtPriceX96: BigNumber;
  liquidity: BigNumber;
  tick: number;
}

const Uniswap = {
  getPoolInfo,
  swapToWeth,
};

export async function getPoolInfo(poolContract: Contract): Promise<PoolInfo> {
  const [liquidity, slot0] = await Promise.all([
    poolContract.liquidity(),
    poolContract.slot0(),
  ]);

  return {
    liquidity: liquidity,
    sqrtPriceX96: slot0[0],
    tick: slot0[1],
  };
}

export async function getWethToken(
  chainId: number,
  provider: providers.Provider,
  overrideAddress?: string
) {
  if (overrideAddress) {
    return await getTokenFromAddress(chainId, provider, overrideAddress);
  } else if (WETH9[chainId]) {
    return WETH9[chainId];
  }
  throw new Error('You must provide an address in the config for wethAddress.');
}

export async function getTokenFromAddress(
  chainId: number,
  provider: providers.Provider,
  tokenAddress: string
) {
  const contract = new Contract(tokenAddress, ERC20_ABI, provider);
  const [symbol, name, decimals] = await Promise.all([
    contract.symbol(),
    contract.name(),
    contract.decimals(),
  ]);
  if (!decimals) {
    throw new Error(
      `Could not get details for token at address: ${tokenAddress}`
    );
  }
  return new Token(chainId, tokenAddress, decimals, symbol, name);
}

export async function swapToWeth(
  signer: Signer,
  tokenAddress: string,
  amountWad: BigNumber,
  feeAmount: FeeAmount,
  uniswapOverrides?: UniswapV3Overrides
) {
  if (!signer || !tokenAddress || !amountWad) {
    throw new Error('Invalid parameters provided to swapToWeth');
  }
  const provider = signer.provider;
  if (!provider) {
    throw new Error('No provider available, skipping swap');
  }

  const network = await provider.getNetwork();
  const chainId = network.chainId;

  const tokenToSwap = await getTokenFromAddress(
    chainId,
    provider,
    tokenAddress
  );
  const weth = await getWethToken(
    chainId,
    provider,
    uniswapOverrides?.wethAddress
  );
  const uniswapV3Router =
    uniswapOverrides?.uniswapV3Router ?? SWAP_ROUTER_02_ADDRESSES(chainId);
  const v3CoreFactorAddress = V3_CORE_FACTORY_ADDRESSES[chainId];

  const amount = tokenChangeDecimals(amountWad, 18, tokenToSwap.decimals);

  if (
    tokenToSwap.symbol === weth.symbol ||
    tokenToSwap.address === weth.address
  ) {
    logger.info('Collected tokens are already WETH, no swap necessary');
    return;
  }

  const currentAllowance = await getAllowanceOfErc20(
    signer,
    tokenAddress,
    uniswapV3Router
  );
  if (currentAllowance.lt(amount)) {
    try {
      logger.debug(`Approving Uniswap for token: ${tokenToSwap.symbol}`);
      await approveErc20(signer, tokenAddress, uniswapV3Router, amount);
      logger.info(
        `Uniswap approval successful for token ${tokenToSwap.symbol}`
      );
    } catch (error) {
      logger.error(
        `Failed to approve Uniswap swap for token: ${tokenToSwap.symbol}.`,
        error
      );
      throw error;
    }
  } else {
    logger.info(`Token ${tokenToSwap.symbol} already has sufficient allowance`);
  }

  const poolAddress = UniswapV3Pool.getAddress(
    tokenToSwap,
    weth,
    feeAmount,
    undefined,
    v3CoreFactorAddress
  );

  const poolContract = new Contract(
    poolAddress,
    IUniswapV3PoolABI.abi,
    provider
  );

  try {
    await poolContract.slot0();
  } catch {
    throw new Error(
      `Pool does not exist for ${tokenToSwap.symbol}/${weth.symbol}, fee: ${feeAmount / 10000}%`
    );
  }

  const poolInfo = await Uniswap.getPoolInfo(poolContract);

  const tickSpacing = await poolContract.tickSpacing();
  const roundTick = Math.round(poolInfo.tick / tickSpacing) * tickSpacing;
  const initialTick = {
    index: roundTick,
    liquidityNet: BigInt(0).toString(),
    liquidityGross: BigInt(0).toString(),
  };
  const ticks = [new Tick(initialTick)];
  const tickDataProvider = new TickListDataProvider(ticks, tickSpacing);

  const sqrtPriceX96 = TickMath.getSqrtRatioAtTick(roundTick);

  const pool = new UniswapV3Pool(
    tokenToSwap,
    weth,
    feeAmount,
    sqrtPriceX96.toString(),
    poolInfo.liquidity.toString(),
    roundTick,
    tickDataProvider
  );

  const route = new Route([pool], tokenToSwap, weth);

  const inputAmount = CurrencyAmount.fromRawAmount(
    tokenToSwap,
    amount.toString()
  );
  const quote = await pool.getOutputAmount(inputAmount);
  const expectedOutputAmount = quote[0];

  const trade = Trade.createUncheckedTrade({
    route,
    inputAmount,
    outputAmount: expectedOutputAmount,
    tradeType: TradeType.EXACT_INPUT,
  });

  const slippageTolerance = new Percent(50, 10000);
  let minOut = BigNumber.from(
    trade.minimumAmountOut(slippageTolerance).quotient.toString()
  );

  if (minOut.lte(constants.Zero)) {
    minOut = amount.div(BigNumber.from('10000'));
  }

  const swapRouter = new Contract(uniswapV3Router, UniswapABI, signer);
  const recipient = await signer.getAddress();

  const currentBlock = await provider.getBlock('latest');
  const currentBlockTimestamp = currentBlock.timestamp;

  const signerAddress = await signer.getAddress();
  try {
    logger.debug(
      `Swapping to WETH for token: ${tokenToSwap.symbol}, amount: ${weiToDecimaled(amount, tokenToSwap.decimals)}`
    );
    const nonce = NonceTracker.getNonce(signer);
    const tx = await swapRouter.exactInputSingle(
      {
        tokenIn: tokenToSwap.address,
        tokenOut: weth.address,
        fee: feeAmount,
        recipient: recipient,
        deadline: currentBlockTimestamp + 60 * 60 * 60,
        amountIn: amount,
        amountOutMinimum: minOut,
        sqrtPriceLimitX96: ethers.constants.Zero,
      },
      { nonce }
    );
    await tx.wait();
    logger.info(
      `Swap to WETH successful for token: ${tokenToSwap.symbol}, amount: ${weiToDecimaled(amount, tokenToSwap.decimals)}`
    );
  } catch (error) {
    logger.error(`Swap to WETH failed for token: ${tokenAddress}`, error);
    NonceTracker.resetNonce(signer, signerAddress);
    throw error;
  }
}

export default Uniswap;
