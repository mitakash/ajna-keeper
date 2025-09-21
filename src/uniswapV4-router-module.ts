import { Contract, BigNumber, Signer, ethers } from 'ethers';
import { logger } from './logging';
import { NonceTracker } from './nonce';
import { weiToDecimaled } from './utils';
import { getTokenFromAddress } from './uniswap';
import { UniswapV4RouterOverrides } from './config-types';

const ERC20_ABI = [
  'function allowance(address,address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)'
];

// Your V4 adapter/router ABI (adjust if your function name/args differ)
const UNI_V4_ADAPTER_ABI = [
  `function swapExactIn(
    (address token0,address token1,uint24 fee,int24 tickSpacing,address hooks) poolKey,
    bool zeroForOne,
    uint256 amountIn,
    uint256 amountOutMinimum,
    uint160 sqrtPriceLimitX96,
    bytes hookData
  ) returns (int256 amount0Delta, int256 amount1Delta)`
];

export type UniV4PoolKey = {
  token0: string;
  token1: string;
  fee: number;
  tickSpacing: number;
  hooks: string;                 // 0x… (often zero)
  sqrtPriceLimitX96?: string;    // optional bound
};

/**
 * Swap via your Uniswap V4 adapter/router from the keeper wallet (off-chain),
 * mirroring sushiswap-router-module’s style.
 */
export async function swapWithUniswapV4Adapter(
  signer: Signer,
  tokenIn: string,
  amountIn: BigNumber,
  tokenOut: string,
  slippagePct: number,
  overrides: UniswapV4RouterOverrides,  // 👈 accept the object
  poolKey: UniV4PoolKey,
  recipient?: string,
  hookData: string = '0x'
)
{
  const routerAddress = overrides.router; // derive string
  const to = recipient ?? await signer.getAddress();

  if (!routerAddress) throw new Error('UniswapV4 router/adapter address is required');
  if (!slippagePct && slippagePct !== 0) throw new Error('Slippage percentage is required');
  if (!signer || !tokenIn || !tokenOut || !amountIn) throw new Error('Invalid parameters');

  const provider = signer.provider;
  if (!provider) throw new Error('No provider available');

  const { chainId } = await provider.getNetwork();
  const from = await signer.getAddress();

  const tokenInMeta  = await getTokenFromAddress(chainId, provider, tokenIn);
  const tokenOutMeta = await getTokenFromAddress(chainId, provider, tokenOut);

  if (tokenIn.toLowerCase() === tokenOut.toLowerCase()) {
    logger.info('Tokens identical; no swap needed');
    return { success: true };
  }

  // Build direction vs poolKey
  const zeroForOne =
    tokenIn.toLowerCase() === poolKey.token0.toLowerCase() &&
    tokenOut.toLowerCase() === poolKey.token1.toLowerCase();
  const oneForZero =
    tokenIn.toLowerCase() === poolKey.token1.toLowerCase() &&
    tokenOut.toLowerCase() === poolKey.token0.toLowerCase();

  if (!zeroForOne && !oneForZero) {
    throw new Error(`Token pair ${tokenIn}/${tokenOut} does not match poolKey ${poolKey.token0}/${poolKey.token1}`);
  }

  const adapter = new Contract(routerAddress, UNI_V4_ADAPTER_ABI, signer);
  const inCtr   = new Contract(tokenIn, ERC20_ABI, signer);

  // ---- Quote via callStatic (preferred) to compute minOut safely
  let minOut: BigNumber;
  try {
    const [amt0, amt1] = await adapter.callStatic.swapExactIn(
      {
        token0: poolKey.token0,
        token1: poolKey.token1,
        fee: poolKey.fee,
        tickSpacing: poolKey.tickSpacing,
        hooks: poolKey.hooks
      },
      zeroForOne,
      amountIn,
      0, // minOut = 0 for simulation
      poolKey.sqrtPriceLimitX96 ?? 0,
      hookData,
      { from }
    );
    const rawOut = zeroForOne ? BigNumber.from(amt1) : BigNumber.from(amt0);
    if (rawOut.lte(0)) throw new Error('Zero/negative output on simulation');
    // Apply slippage haircut
    const bps = Math.round(slippagePct * 100);        // 0.5% -> 50 bps
    minOut = rawOut.mul(10_000 - bps).div(10_000);
  } catch (e:any) {
    // Fallback: conservative minOut = (1 - slippage) * amountIn (only reasonable for near-par pairs)
    logger.warn(`UniV4 simulation failed (${e?.message}). Falling back to conservative minOut.`);
    const bps = Math.round(slippagePct * 100);
    minOut = amountIn.mul(10_000 - bps).div(10_000);
  }

  // ---- Allowance
  const allowance = await inCtr.allowance(from, routerAddress);
  if (allowance.lt(amountIn)) {
    logger.info(`Approving UniV4 adapter to spend ${tokenInMeta.symbol}`);
    await NonceTracker.queueTransaction(signer, async (nonce) => {
      const tx = await inCtr.approve(routerAddress, ethers.constants.MaxUint256, { nonce });
      logger.info(`Approval sent: ${tx.hash}`);
      return await tx.wait();
    });
  }

  // ---- Build and send swap
  const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 min
  const gasPrice = await provider.getGasPrice();
  const highGas  = gasPrice.mul(115).div(100);

  logger.debug(`UniV4 swap params:
    tokenIn=${tokenIn}
    tokenOut=${tokenOut}
    amountIn=${weiToDecimaled(amountIn, tokenInMeta.decimals)}
    minOut=${weiToDecimaled(minOut, tokenOutMeta.decimals)}
    fee=${poolKey.fee} tickSpacing=${poolKey.tickSpacing} hooks=${poolKey.hooks}`);

  const receipt = await NonceTracker.queueTransaction(signer, async (nonce) => {
    const tx = await adapter.swapExactIn(
      {
        token0: poolKey.token0,
        token1: poolKey.token1,
        fee: poolKey.fee,
        tickSpacing: poolKey.tickSpacing,
        hooks: poolKey.hooks
      },
      zeroForOne,
      amountIn,
      minOut,
      poolKey.sqrtPriceLimitX96 ?? 0,
      hookData,
      {
        nonce,
        gasLimit: 900_000,         // tune per adapter/hook complexity
        gasPrice: highGas
      }
    );
    logger.info(`UniV4 tx sent: ${tx.hash}`);
    return await tx.wait();
  });

  logger.info(`UniV4 swap confirmed: ${receipt.transactionHash}`);
  logger.info(
    `UniV4 swap: ${weiToDecimaled(amountIn, tokenInMeta.decimals)} ${tokenInMeta.symbol} -> ≥ ${weiToDecimaled(minOut, tokenOutMeta.decimals)} ${tokenOutMeta.symbol}`
  );

  return { success: true, receipt };
}
