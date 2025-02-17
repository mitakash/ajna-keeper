import {
  CurrencyAmount,
  Percent,
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
import { BigNumber, Contract, ethers, Signer } from 'ethers';
import JSBI from 'jsbi';
import ERC20_ABI from './abis/erc20.abi.json';
import { logger } from './logging';

const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

interface UniswapType {
  getPoolInfo: any;
  swapToWETH?: (
    signer: Signer,
    tokenToSwap: string,
    amount: BigNumber,
    feeAmount: FeeAmount,
    wethAddress: string
  ) => Promise<void>;
}

interface PoolInfo {
  sqrtPriceX96: BigNumber;
  liquidity: BigNumber;
  tick: number;
}

let Uniswap: UniswapType;

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

export async function swapToWETH(
  signer: Signer,
  tokenToSwap: string,
  amount: BigNumber,
  feeAmount: FeeAmount,
  wethAddress: string
) {
  if (!signer || !tokenToSwap || !amount || !feeAmount || !wethAddress) {
    throw new Error('Invalid parameters provided to swapToWETH');
  }
  const provider = signer.provider;
  if (!provider) {
    logger.warn('No provider available, skipping swap');
    return;
  }

  const network = await provider.getNetwork();
  const chainId = network.chainId;

  const tokenToSwapContract = new Contract(tokenToSwap, ERC20_ABI, signer);
  const tokenToSwapContractSymbol = await tokenToSwapContract.symbol();
  const tokenToSwapContractName = await tokenToSwapContract.name();
  const tokenToSwapContractDecimals = await tokenToSwapContract.decimals();

  if (
    !tokenToSwapContractSymbol ||
    !tokenToSwapContractName ||
    !tokenToSwapContractDecimals
  ) {
    logger.warn(`Couldn't get token info`);
  }

  let weth: Token;
  if (WETH9[chainId]) {
    weth = WETH9[chainId];
  } else {
    weth = new Token(chainId, wethAddress, 18, 'WETH', 'Wrapped Ether');
  }

  if (tokenToSwapContractSymbol.toLowerCase() === 'weth') {
    logger.info('Collected tokens are already WETH, no swap necessary');
    return;
  }

  const tokenToSwapToken = new Token(
    chainId,
    tokenToSwap,
    tokenToSwapContractDecimals,
    tokenToSwapContractSymbol,
    tokenToSwapContractName
  );

  try {
    const currentAllowance = await tokenToSwapContract.allowance(
      await signer.getAddress(),
      UNISWAP_V3_ROUTER
    );
    if (currentAllowance.lt(amount)) {
      await (
        await tokenToSwapContract.approve(UNISWAP_V3_ROUTER, amount)
      ).wait();
      logger.info(`Approval successful for token ${tokenToSwapToken.symbol}`);
    } else {
      logger.info(
        `Token ${tokenToSwapToken.symbol} already has sufficient allowance`
      );
    }
  } catch (error) {
    logger.error('Error approving transaction:', error);
  }

  const poolAddress = UniswapV3Pool.getAddress(
    tokenToSwapToken,
    weth,
    FeeAmount.MEDIUM
  );

  const poolContract = new Contract(
    poolAddress,
    IUniswapV3PoolABI.abi,
    provider
  );

  try {
    await poolContract.slot0();
  } catch {
    logger.info(
      `Pool does not exist for ${tokenToSwapToken.symbol}/${weth.symbol}, skipping swap`
    );
    return;
  }

  const poolInfo = await Uniswap.getPoolInfo(poolContract);

  const tickSpacing = await poolContract.tickSpacing();
  const roundTick = Math.round(poolInfo.tick / tickSpacing) * tickSpacing;
  const initialTick = {
    index: roundTick,
    liquidityNet: JSBI.BigInt(0),
    liquidityGross: JSBI.BigInt(0),
  };
  const ticks = [new Tick(initialTick)];
  const tickDataProvider = new TickListDataProvider(ticks, tickSpacing);

  const sqrtPriceX96 = TickMath.getSqrtRatioAtTick(roundTick);

  const pool = new UniswapV3Pool(
    tokenToSwapToken,
    weth,
    feeAmount,
    sqrtPriceX96.toString(),
    poolInfo.liquidity.toString(),
    roundTick,
    tickDataProvider
  );

  const route = new Route([pool], tokenToSwapToken, weth);

  const quote = await pool.getOutputAmount(
    CurrencyAmount.fromRawAmount(tokenToSwapToken, amount.toString())
  );
  const expectedOutputAmount = quote[0];

  const trade = Trade.createUncheckedTrade({
    route,
    inputAmount: CurrencyAmount.fromRawAmount(
      tokenToSwapToken,
      amount.toString()
    ),
    outputAmount: expectedOutputAmount,
    tradeType: TradeType.EXACT_INPUT,
  });

  const slippageTolerance = new Percent(50, 10000);
  let minOut = BigNumber.from(
    trade.minimumAmountOut(slippageTolerance).quotient.toString()
  );

  if (minOut.lte(BigNumber.from('0'))) {
    minOut = amount.mul(BigNumber.from('1')).div(BigNumber.from('10000'));
  }

  const swapRouter = new Contract(UNISWAP_V3_ROUTER, UniswapABI, signer);
  const recipient = await signer.getAddress();

  const currentBlock = await provider.getBlock('latest');
  const currentBlockTimestamp = currentBlock.timestamp;

  try {
    const tx = await swapRouter.exactInputSingle(
      {
        tokenIn: tokenToSwapToken.address,
        tokenOut: weth.address,
        fee: feeAmount,
        recipient: recipient,
        deadline: currentBlockTimestamp + 60 * 60 * 60,
        amountIn: amount,
        amountOutMinimum: minOut,
        sqrtPriceLimitX96: ethers.constants.Zero,
      },
      { gasLimit: ethers.utils.hexlify(500000) }
    );
    await tx.wait();
    logger.info(`Swap to WETH successful: ${tx.hash}`);
  } catch (swapError) {
    if (swapError instanceof Error) {
      logger.warn(`Swap to WETH failed: ${swapError.message}`);
    } else {
      logger.warn(`Swap to WETH failed: ${String(swapError)}`);
    }
  }
}

export default Uniswap = {
  getPoolInfo,
  swapToWETH,
};
