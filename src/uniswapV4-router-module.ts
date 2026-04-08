// src/uniswapV4-router-module.ts
/**
 * Uniswap V4 Router Module
 * Handles V4 swaps via Universal Router with Permit2
 */
import { BigNumber, Signer, ethers, Contract } from 'ethers';
import { UniV4PoolKey } from './config-types';
import { logger } from './logging';
import { NonceTracker } from './nonce';
import { UniswapV4QuoteProvider } from './dex-providers/uniswapV4-quote-provider';
import {
  Commands,
  Actions,
  ERC20_ABI,
  PERMIT2_ABI,
  UNIVERSAL_ROUTER_ABI,
  MAX_UINT160,
  V4_CHAIN_ADDRESSES,
  V4SwapError,
} from './uniswapv4';

export interface SwapResult {
  success: boolean;
  receipt?: ethers.providers.TransactionReceipt;
  error?: string;
}

/**
 * AUDIT FIX H-01: Normalize poolKey so currency0 < currency1 (V4 requirement)
 * V4 requires tokens to be in lexicographic order for pool ID derivation
 */
function normalizePoolKey(poolKey: UniV4PoolKey): UniV4PoolKey {
  const t0 = poolKey.token0.toLowerCase();
  const t1 = poolKey.token1.toLowerCase();

  if (t0 < t1) {
    return poolKey; // Already normalized
  }

  // Swap tokens to normalize
  return {
    token0: poolKey.token1,
    token1: poolKey.token0,
    fee: poolKey.fee,
    tickSpacing: poolKey.tickSpacing,
    hooks: poolKey.hooks,
    sqrtPriceLimitX96: poolKey.sqrtPriceLimitX96,
  };
}

/**
 * Encode V4 swap command for Universal Router
 *
 * Flow:
 * 1. Command 1: PERMIT2_TRANSFER_FROM (0x02) - Transfer tokens to router
 * 2. Command 2: V4_SWAP (0x10) - Execute swap
 * 3. V4_SWAP Actions: SWAP_EXACT_IN_SINGLE (0x06), SETTLE_ALL (0x0c), TAKE_ALL (0x0f)
 * 4. Params: transfer params, swap tuple, currencyIn/amountIn, currencyOut/minAmountOut
 */
function encodeV4SwapCommand(
  poolKey: UniV4PoolKey,
  zeroForOne: boolean,
  amountIn: BigNumber,
  minAmountOut: BigNumber,
  hookData: string = '0x',
): { commands: string; inputs: string[] } {
  // 1. Universal Router commands: PERMIT2_TRANSFER_FROM then V4_SWAP
  const commands = ethers.utils.hexlify([Commands.PERMIT2_TRANSFER_FROM, Commands.V4_SWAP]);

  // 2. Determine currencies based on swap direction
  const currencyIn = zeroForOne ? poolKey.token0 : poolKey.token1;
  const currencyOut = zeroForOne ? poolKey.token1 : poolKey.token0;

  // 3. Build PERMIT2_TRANSFER_FROM input
  const permit2TransferInput = ethers.utils.defaultAbiCoder.encode(
    ['address', 'uint256'],
    [currencyIn, amountIn],
  );

  // 4. Actions sequence for V4_SWAP
  const actions = ethers.utils.hexlify([
    Actions.SWAP_EXACT_IN_SINGLE,
    Actions.SETTLE_ALL,
    Actions.TAKE_ALL,
  ]);

  // 5. Build params for each V4 action
  const params: string[] = new Array(3);

  // Action 0: SWAP_EXACT_IN_SINGLE
  // AUDIT FIX C-02: V4 Currency is a UDVT, encodes as plain address NOT tuple(address)
  params[0] = ethers.utils.defaultAbiCoder.encode(
    [
      'tuple(' +
        'tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) poolKey,' +
        'bool zeroForOne,' +
        'uint128 amountIn,' +
        'uint128 amountOutMinimum,' +
        'bytes hookData' +
        ')',
    ],
    [
      [
        [poolKey.token0, poolKey.token1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
        zeroForOne,
        amountIn,
        minAmountOut,
        hookData,
      ],
    ],
  );

  // Action 1: SETTLE_ALL (currencyIn, amountIn)
  params[1] = ethers.utils.defaultAbiCoder.encode(
    ['address', 'uint256'],
    [currencyIn, amountIn],
  );

  // Action 2: TAKE_ALL (currencyOut, minAmountOut)
  // Note: TAKE_ALL recipient is implicitly the transaction sender (msg.sender)
  params[2] = ethers.utils.defaultAbiCoder.encode(
    ['address', 'uint256'],
    [currencyOut, minAmountOut],
  );

  // 6. Encode V4_SWAP input
  const v4SwapInput = ethers.utils.defaultAbiCoder.encode(
    ['bytes', 'bytes[]'],
    [actions, params],
  );

  return { commands, inputs: [permit2TransferInput, v4SwapInput] };
}

/**
 * Ensure Permit2 approval for token
 */
async function ensurePermit2Approval(
  signer: Signer,
  tokenAddress: string,
  amount: BigNumber,
  permit2Address: string,
): Promise<void> {
  const signerAddress = await signer.getAddress();
  const tokenContract = new Contract(tokenAddress, ERC20_ABI, signer);

  const allowance = await tokenContract.allowance(signerAddress, permit2Address);

  if (allowance.lt(amount)) {
    logger.info(`Approving Permit2 for ${tokenAddress.slice(0, 8)}...`);
    await NonceTracker.queueTransaction(signer, async (nonce: number) => {
      const tx = await tokenContract.approve(permit2Address, ethers.constants.MaxUint256, {
        nonce,
      });
      return await tx.wait();
    });
    logger.info('✅ Permit2 approval confirmed');
  }
}

/**
 * Ensure Universal Router approval via Permit2
 */
async function ensureRouterApproval(
  signer: Signer,
  tokenAddress: string,
  amount: BigNumber,
  routerAddress: string,
  permit2Address: string,
): Promise<void> {
  const signerAddress = await signer.getAddress();
  const permit2 = new Contract(permit2Address, PERMIT2_ABI, signer);

  const allowanceResult = await permit2.allowance(signerAddress, tokenAddress, routerAddress);

  const currentAmount = allowanceResult[0];
  const currentExpiration = allowanceResult[1];

  if (currentAmount.lt(amount) || currentExpiration < Math.floor(Date.now() / 1000)) {
    logger.info('Approving Universal Router via Permit2...');
    const expiration = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60; // 30 days

    await NonceTracker.queueTransaction(signer, async (nonce: number) => {
      const tx = await permit2.approve(tokenAddress, routerAddress, MAX_UINT160, expiration, {
        nonce,
      });
      return await tx.wait();
    });
    logger.info('✅ Universal Router approval via Permit2 confirmed');
  }
}

/**
 * Main swap function for Uniswap V4
 */
export async function swapWithUniswapV4(
  signer: Signer,
  tokenIn: string,
  amountIn: BigNumber,
  tokenOut: string,
  slippagePct: number,
  poolKey: UniV4PoolKey,
  to: string,
  poolManagerAddress?: string,
  universalRouterAddress?: string,
  permit2Address?: string, // AUDIT FIX M-02: Allow config permit2 instead of hardcoded
  hookData: string = '0x',
): Promise<SwapResult> {
  const chainId = await signer.getChainId();
  const signerAddress = await signer.getAddress();
  const provider = signer.provider!;

  // Get V4 addresses (use config overrides if provided)
  const addresses = V4_CHAIN_ADDRESSES[chainId];
  if (!addresses && !poolManagerAddress) {
    return { success: false, error: `V4 not supported on chain ${chainId}` };
  }

  const poolManager = poolManagerAddress || addresses?.POOL_MANAGER;
  const universalRouter = universalRouterAddress || addresses?.UNIVERSAL_ROUTER;
  // AUDIT FIX M-02: Use config permit2 if provided, otherwise fall back to chain defaults
  const permit2 = permit2Address || addresses?.PERMIT2;

  if (!poolManager || !universalRouter || !permit2) {
    return { success: false, error: `V4 addresses not configured for chain ${chainId}` };
  }

  logger.info(`V4 Swap: Using Universal Router at ${universalRouter}`);

  // AUDIT FIX H-01: Normalize poolKey to ensure currency0 < currency1
  const normalizedPoolKey = normalizePoolKey(poolKey);

  try {
    // Get token info
    const tokenInContract = new Contract(tokenIn, ERC20_ABI, signer);
    const inDecimals = await tokenInContract.decimals();
    const inDecNumber = typeof inDecimals === 'number' ? inDecimals : inDecimals.toNumber();

    logger.debug(
      `V4 Swap: ${ethers.utils.formatUnits(amountIn, inDecNumber)} ${tokenIn.slice(0, 8)}... → ${tokenOut.slice(0, 8)}...`,
    );

    // Determine swap direction (using normalized poolKey)
    const zeroForOne = tokenIn.toLowerCase() === normalizedPoolKey.token0.toLowerCase();
    logger.debug(`Swap direction: zeroForOne=${zeroForOne}`);

    // Step 1: Approve Permit2
    await ensurePermit2Approval(signer, tokenIn, amountIn, permit2);

    // Step 2: Approve Universal Router via Permit2
    await ensureRouterApproval(signer, tokenIn, amountIn, universalRouter, permit2);

    // Step 3: Get quote from pool
    const quoteProvider = new UniswapV4QuoteProvider(signer, {
      poolManager,
      defaultSlippage: slippagePct,
      pools: {},
    });

    await quoteProvider.initialize();

    const quoteResult = await quoteProvider.getQuote(amountIn, tokenIn, tokenOut, normalizedPoolKey);

    let minAmountOut: BigNumber;
    if (quoteResult.success && quoteResult.dstAmount) {
      // Apply slippage to quoted amount
      minAmountOut = quoteResult.dstAmount.mul(10000 - slippagePct * 100).div(10000);

      const tokenOutContract = new Contract(tokenOut, ERC20_ABI, signer);
      const outDecimals = await tokenOutContract.decimals();
      const outDecNumber = typeof outDecimals === 'number' ? outDecimals : outDecimals.toNumber();

      logger.info(
        `💰 Expected output: ~${ethers.utils.formatUnits(quoteResult.dstAmount, outDecNumber)} ${tokenOut.slice(0, 8)}...`,
      );
    } else {
      // AUDIT FIX M-01: Don't use nonsensical fallback - fail if quote unavailable
      // Using amountIn as minAmountOut makes no sense for different tokens
      logger.error(`V4 quote failed: ${quoteResult.error}`);
      return { success: false, error: `Quote failed: ${quoteResult.error}` };
    }

    logger.debug(`Amount in: ${amountIn.toString()}`);
    logger.debug(`Min amount out: ${minAmountOut.toString()}`);

    // Step 4: Encode V4 swap command (using normalized poolKey)
    const { commands, inputs } = encodeV4SwapCommand(
      normalizedPoolKey,
      zeroForOne,
      amountIn,
      minAmountOut,
      hookData,
    );

    logger.debug(`Commands: ${commands}`);
    logger.debug(`Inputs length: ${inputs.length}`);

    // Step 5: Execute swap via Universal Router
    const router = new Contract(universalRouter, UNIVERSAL_ROUTER_ABI, signer);

    // Set deadline to 20 minutes from now
    const deadline = Math.floor(Date.now() / 1000) + 1200;

    logger.info('Executing V4 swap via Universal Router...');

    // Estimate gas
    let gasEstimate: BigNumber;
    try {
      gasEstimate = await router.estimateGas['execute(bytes,bytes[],uint256)'](
        commands,
        inputs,
        deadline,
        { from: signerAddress, value: 0 },
      );
      logger.debug(`Estimated gas: ${gasEstimate.toString()}`);
    } catch (gasError: any) {
      logger.error(`Gas estimation failed: ${gasError.message}`);
      throw new V4SwapError(`Gas estimation failed: ${gasError.message}`);
    }

    // Add 30% gas buffer
    const gasLimit = gasEstimate.mul(130).div(100);
    const gasPrice = await provider.getGasPrice();
    const adjustedGasPrice = gasPrice.mul(115).div(100);

    logger.debug(`Gas limit: ${gasLimit.toString()}, Gas price: ${adjustedGasPrice.toString()}`);

    // Execute swap
    const receipt = await NonceTracker.queueTransaction(signer, async (nonce: number) => {
      const txResponse = await router['execute(bytes,bytes[],uint256)'](commands, inputs, deadline, {
        gasLimit,
        gasPrice: adjustedGasPrice,
        nonce,
        value: 0,
      });
      return await txResponse.wait();
    });

    logger.info(`✅ V4 swap successful! Tx: ${receipt.transactionHash}`);
    logger.info(`   Gas used: ${receipt.gasUsed.toString()}`);

    return { success: true, receipt };
  } catch (error: any) {
    logger.error(`❌ V4 swap failed: ${error.message}`);

    if (error.message.includes('INSUFFICIENT_LIQUIDITY')) {
      return { success: false, error: 'Pool has insufficient liquidity' };
    }
    if (error.message.includes('PRICE')) {
      return { success: false, error: 'Price moved beyond limits' };
    }

    return { success: false, error: error.message || error.toString() };
  }
}

/**
 * Simplified adapter function that matches your DexRouter interface
 */
export async function swapWithUniswapV4Adapter(
  signer: Signer,
  tokenIn: string,
  amountIn: BigNumber,
  tokenOut: string,
  slippagePct: number,
  routerAddress: string, // Universal Router
  poolKey: UniV4PoolKey,
  to: string,
  permit2Address?: string, // AUDIT FIX M-02: Allow config permit2
  hookData: string = '0x',
): Promise<SwapResult> {
  return swapWithUniswapV4(
    signer,
    tokenIn,
    amountIn,
    tokenOut,
    slippagePct,
    poolKey,
    to,
    undefined, // Auto-detect PoolManager
    routerAddress, // Universal Router
    permit2Address, // AUDIT FIX M-02: Pass through permit2 from config
    hookData,
  );
}