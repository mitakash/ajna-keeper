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
  Trade,
  Pool as UniswapV3Pool,
} from '@uniswap/v3-sdk';
import { BigNumber, Contract, ethers, providers, Signer } from 'ethers';
import { getDecimalsErc20 } from './erc20';
import { logger } from './logging';

const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

interface PoolInfo {
  sqrtPriceX96: BigNumber;
  liquidity: BigNumber;
  tick: number;
}

export async function getPoolInfo(
  provider: providers.JsonRpcProvider,
  nativeToken: Token,
  erc20Token: Token,
  feeAmt: FeeAmount,
  poolContract?: Contract
): Promise<PoolInfo> {
  const poolAddress = UniswapV3Pool.getAddress(nativeToken, erc20Token, feeAmt);

  const contract =
    poolContract ?? new Contract(poolAddress, IUniswapV3PoolABI.abi, provider);

  const balance = await provider.getBalance(poolAddress);

  logger.info('Fetching liquidity and slot0...');
  const [liquidity, slot0] = await Promise.all([
    contract.liquidity(),
    contract.slot0(),
  ]);
  logger.info(
    'Liquidity:',
    liquidity.toString(),
    'Slot0:',
    slot0[0].toString()
  );

  return {
    liquidity,
    sqrtPriceX96: slot0[0],
    tick: slot0[1],
  };
}

export async function exchangeForNative(
  signer: Signer,
  erc20Address: string,
  fee: FeeAmount,
  amount: string,
  poolContract: Contract
) {
  if (!signer || !erc20Address || !fee || !amount || !poolContract) {
    throw new Error('Invalid parameters provided to exchangeForNative');
  }
  const provider = signer.provider as providers.JsonRpcProvider;

  if (!provider) {
    throw new Error('Signer does not have an associated provider');
  }

  const network = await provider.getNetwork();
  const { chainId } = network;

  if (!chainId) {
    throw new Error('Could not determine chain ID');
  }

  const decimals = await getDecimalsErc20(signer, erc20Address);

  const erc20Token = new Token(chainId, erc20Address, decimals);

  const wethAddress = WETH9[chainId]?.address;
  if (!wethAddress) {
    throw new Error('WETH address not found for chain ID');
  }

  const nativeToken = new Token(
    chainId,
    wethAddress,
    18,
    'WETH',
    'Wrapped Ether'
  );

  const poolInfo = await getPoolInfo(
    provider,
    nativeToken,
    erc20Token,
    fee,
    poolContract
  );

  if (poolInfo.liquidity.isZero()) {
    throw new Error("There isn't enough liquidity");
  }

  const pool = new UniswapV3Pool(
    erc20Token,
    nativeToken,
    fee,
    poolInfo.sqrtPriceX96.toString(),
    poolInfo.liquidity.toString(),
    poolInfo.tick
  );

  const route = new Route([pool], erc20Token, nativeToken);
  const trade = Trade.createUncheckedTrade({
    route,
    inputAmount: CurrencyAmount.fromRawAmount(erc20Token, amount.toString()),
    outputAmount: CurrencyAmount.fromRawAmount(
      nativeToken,
      poolInfo.sqrtPriceX96.toString()
    ),
    tradeType: TradeType.EXACT_INPUT,
  });

  const slippageTolerance = new Percent(5, 100);
  const minOut = BigNumber.from(
    trade.minimumAmountOut(slippageTolerance).quotient.toString()
  );

  const swapRouter = new Contract(UNISWAP_V3_ROUTER, UniswapABI, signer);

  const recipient = await signer.getAddress();
  if (!recipient) {
    throw new Error('Could not retrieve signer address');
  }

  const tx = await swapRouter.exactInputSingle({
    tokenIn: erc20Token.address,
    tokenOut: nativeToken.address,
    fee,
    recipient: recipient,
    deadline: Math.floor(Date.now() / 1000) + 60 * 5,
    amountIn: BigNumber.from(amount),
    amountOutMinimum: minOut,
    sqrtPriceLimitX96: poolInfo.sqrtPriceX96,
  });

  const receipt = await tx.wait();
  if (receipt.status !== 1) {
    throw new Error('Transaction failed');
  }

  logger.info(`Swap successful: ${tx.hash}`);
}
