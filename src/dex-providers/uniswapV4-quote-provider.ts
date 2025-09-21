import { ethers, BigNumber, Signer } from 'ethers';
import { logger } from '../logging';
import { getDecimalsErc20 } from '../erc20';

/** ---------------------------
 *  Minimal ABIs / Interfaces
 *  ---------------------------
 */

/** Your Uniswap V4 adapter/router ABI: simulate swaps via callStatic */
const UNI_V4_ADAPTER_ABI = [
  // Adjust the function name/signature if your adapter differs
  `function swapExactIn(
    (address token0,address token1,uint24 fee,int24 tickSpacing,address hooks) poolKey,
    bool zeroForOne,
    uint256 amountIn,
    uint256 amountOutMinimum,
    uint160 sqrtPriceLimitX96,
    bytes hookData
  ) returns (int256 amount0Delta, int256 amount1Delta)`,
];

// Minimal ABIs — keep both so we can try quote() first, then fallback to callStatic.swap()
const V4_QUOTER_ABI = [
    // Pure/view quote path (preferred if your adapter exposes it)
    'function quoteExactInputSingle((address token0,address token1,uint24 fee,int24 tickSpacing,address hooks,uint160 sqrtPriceLimitX96), uint256 amountIn, bytes hookData) external view returns (uint256 amountOut)',
    'function poolManager() external view returns (address)'
  ];


  const V4_ROUTER_ABI = [
    // Fallback: same struct, simulate the swap (no state change)
    'function exactInputSingle((address token0,address token1,uint24 fee,int24 tickSpacing,address hooks,uint160 sqrtPriceLimitX96), uint256 amountIn, uint256 amountOutMinimum, address recipient, bytes hookData) external returns (uint256 amountOut)',
    'function poolManager() external view returns (address)'
  ];

  

export type UniV4PoolKey = {
  token0: string;
  token1: string;
  fee: number;           // e.g. 3000
  tickSpacing: number;   // e.g. 60
  hooks: string;         // often 0x00...00
  sqrtPriceLimitX96?: string; // optional bound
};

export interface UniswapV4QuoteConfig {
  router: string;                         // V4 adapter/router you will call
  defaultSlippage: number;                // % (e.g., 0.5 for 0.5%)
  pools: Record<string, UniV4PoolKey>;    // keyed by a pair name like "WETH-USDC"
}

/** Aligns with your Sushi provider’s return shape */
interface QuoteResult {
  success: boolean;
  dstAmount?: BigNumber;
  error?: string;
  gasEstimate?: BigNumber; // optional; we can’t easily estimate here, kept for parity
}

export class UniswapV4QuoteProvider {
  private signer: Signer;
  private config: UniswapV4QuoteConfig;
  private adapter: ethers.Contract;
  private isInitialized = false;

  constructor(signer: Signer, config: UniswapV4QuoteConfig) {
    this.signer = signer;
    this.config = config;
    this.adapter = new ethers.Contract(config.router, UNI_V4_ADAPTER_ABI, signer);
  }

  /** Ensure router exists on-chain */
  async initialize(): Promise<boolean> {
    if (this.isInitialized) return true;

    try {
      const code = await this.signer.provider!.getCode(this.config.router);
      if (code === '0x') {
        logger.warn(`UniswapV4 adapter/router not found at ${this.config.router}`);
        return false;
      }
      this.isInitialized = true;
      return true;
    } catch (err) {
      logger.error(`Failed to initialize UniswapV4QuoteProvider: ${err}`);
      return false;
    }
  }

  isAvailable(): boolean {
    return this.isInitialized;
  }

  getRouterAddress(): string {
    return this.config.router;
  }

  /**
   * Look up a pool key from config by label (e.g. "WETH-USDC").
   * You can also build this dynamically per token pair in your orchestration layer if preferred.
   */
  getPoolKey(label: string): UniV4PoolKey | undefined {
    return this.config.pools[label];
  }

  private toPoolKeyStruct(key: UniV4PoolKey) {
    return {
      token0: key.token0,
      token1: key.token1,
      fee: key.fee,
      tickSpacing: key.tickSpacing,
      hooks: key.hooks,
      sqrtPriceLimitX96: key.sqrtPriceLimitX96
        ? ethers.BigNumber.from(key.sqrtPriceLimitX96)
        : ethers.constants.Zero,
    };
  }
  
  private findPoolKey(tokenIn: string, tokenOut: string): UniV4PoolKey | undefined {
    const entries = Object.values(this.config.pools || {}) as UniV4PoolKey[];
    return entries.find((k) => {
      const a = k.token0.toLowerCase(), b = k.token1.toLowerCase();
      const x = tokenIn.toLowerCase(),  y = tokenOut.toLowerCase();
      // same pool supports both directions; we just need the correct key
      return (a === x && b === y) || (a === y && b === x);
    });
  }

  /**
   * Quote exact input using callStatic on your V4 adapter.
   * We pass amountOutMinimum = 0 and read the returned signed deltas.
   *
   * IMPORTANT:
   * - For zeroForOne (token0 -> token1), adapter typically returns:
   *     amount0Delta = -amountIn  (negative)
   *     amount1Delta = +amountOut (positive)
   * - For oneForZero (token1 -> token0), the signs flip.
   */
  async getQuoteExactIn(
    amountIn: BigNumber,
    tokenIn: string,
    tokenOut: string,
    poolKeyLabel: string,
    hookData: string = '0x',
    overrideSqrtPriceLimitX96?: string
  ): Promise<QuoteResult> {
    try {
      if (!this.isInitialized) {
        const ok = await this.initialize();
        if (!ok) return { success: false, error: 'Quote provider not available' };
      }

      const pk = this.config.pools[poolKeyLabel];
      if (!pk) return { success: false, error: `PoolKey '${poolKeyLabel}' not configured` };

      // Determine direction vs poolKey order
      const zeroForOne = tokenIn.toLowerCase() === pk.token0.toLowerCase()
                      && tokenOut.toLowerCase() === pk.token1.toLowerCase();

      const oneForZero = tokenIn.toLowerCase() === pk.token1.toLowerCase()
                      && tokenOut.toLowerCase() === pk.token0.toLowerCase();

      if (!zeroForOne && !oneForZero) {
        return { success: false, error: `Token pair ${tokenIn}/${tokenOut} does not match poolKey ${pk.token0}/${pk.token1}` };
      }

      const sqrtPriceLimitX96 = overrideSqrtPriceLimitX96 ?? pk.sqrtPriceLimitX96 ?? '0';

      // Simulate swap via callStatic. We set minOut = 0 for quoting.
      const txData = [
        { token0: pk.token0, token1: pk.token1, fee: pk.fee, tickSpacing: pk.tickSpacing, hooks: pk.hooks },
        zeroForOne,                               // direction
        amountIn,                                 // exact input
        BigNumber.from(0),                        // minOut = 0 (quote only)
        sqrtPriceLimitX96,                        // optional price bound
        hookData
      ] as const;

      // Use callStatic to avoid sending a tx; pass from to mimic real caller if needed
      const fromAddr = await this.signer.getAddress();
      const [amount0Delta, amount1Delta]: [BigNumber, BigNumber] =
        await this.adapter.callStatic.swapExactIn(...txData, { from: fromAddr });

      // Parse signed deltas into a positive output amount
      // zeroForOne: input=token0 (amount0Delta negative), output=token1 (amount1Delta positive)
      // oneForZero: input=token1 (amount1Delta negative), output=token0 (amount0Delta positive)
      let out: BigNumber;
      if (zeroForOne) {
        // expect amount1Delta > 0
        out = BigNumber.from(amount1Delta.toString());
      } else {
        // oneForZero path: expect amount0Delta > 0
        out = BigNumber.from(amount0Delta.toString());
      }

      if (out.lte(0)) {
        return { success: false, error: 'Zero or negative output from UniV4 simulation' };
      }

      // (Optional) decimals + log — parity with your Sushi provider
      const inDec = await getDecimalsErc20(this.signer, tokenIn);
      const outDec = await getDecimalsErc20(this.signer, tokenOut);
      logger.debug(
        `UniV4 quote success: ${ethers.utils.formatUnits(amountIn, inDec)} in -> ${ethers.utils.formatUnits(out, outDec)} out`
      );

      return { success: true, dstAmount: out };
    } catch (error: any) {
      logger.debug(`Uniswap V4 quote failed: ${error.message || error}`);
      // Common revert parsing
      if (error.message?.includes('INSUFFICIENT_LIQUIDITY')) {
        return { success: false, error: 'Insufficient liquidity in UniV4 pool' };
      } else if (error.message?.includes('revert')) {
        return { success: false, error: `UniV4 simulation reverted: ${error.reason || error.message}` };
      } else {
        return { success: false, error: `UniV4 quote error: ${error.message || String(error)}` };
      }
    }
  }

  /**
   * Convenience: compute a market price = output per 1 unit input
   * Mirrors your Sushi provider so downstream logic stays the same.
   */
   async getMarketPrice(
    amountIn: BigNumber,
    tokenIn: string,
    tokenOut: string,
    tokenInDecimals: number,
    tokenOutDecimals: number,
    poolKey?: UniV4PoolKey
  ): Promise<{ success: boolean; price?: number; error?: string }> {
    const quote = await this.getQuote(amountIn, tokenIn, tokenOut, poolKey);
    if (!quote.success || !quote.dstAmount) return { success: false, error: quote.error };
    const inAmt  = Number(ethers.utils.formatUnits(amountIn, tokenInDecimals));
    const outAmt = Number(ethers.utils.formatUnits(quote.dstAmount, tokenOutDecimals));
    return inAmt > 0 ? { success: true, price: outAmt / inAmt } : { success: false, error: 'Invalid input' };
  }
  
  async getQuote(
    amountIn: BigNumber,
    tokenIn: string,
    tokenOut: string,
    poolKey?: UniV4PoolKey
  ): Promise<QuoteResult> {
    try {
      // Resolve pool key
      const key = poolKey ?? this.findPoolKey(tokenIn, tokenOut);
      if (!key) {
        return { success: false, error: 'No Uniswap V4 poolKey found for pair' };
      }
  
      if (!this.config.router) {
        return { success: false, error: 'Missing Uniswap V4 router/adapter address in config' };
      }
  
      const provider = this.signer.provider!;
      const code = await provider.getCode(this.config.router);
      if (code === '0x') {
        return { success: false, error: `Router not a contract: ${this.config.router}` };
      }
  
      const keyStruct = this.toPoolKeyStruct(key);
      const hookData = '0x';
  
      // 1) Try a pure/view quoter if available
      let amountOut: BigNumber | undefined;
      try {
        const quoter = new ethers.Contract(this.config.router, V4_QUOTER_ABI, this.signer);
        amountOut = await quoter.quoteExactInputSingle(keyStruct, amountIn, hookData);
      } catch {
        // ignore; many adapters won’t expose a pure quoter
      }
  
      // 2) Fallback: simulate the swap via callStatic on exactInputSingle
      if (!amountOut) {
        const router = new ethers.Contract(this.config.router, V4_ROUTER_ABI, this.signer);
        const recipient = await this.signer.getAddress();
        amountOut = await router.callStatic.exactInputSingle(
          keyStruct,
          amountIn,
          0,           // amountOutMinimum (0 for quote)
          recipient,   // unused for callStatic, but required by ABI
          hookData
        );
      }
  
      if (!amountOut || amountOut.isZero()) {
        return { success: false, error: 'Zero output returned by V4 quote' };
      }
  
      return { success: true, dstAmount: amountOut };
  
    } catch (e: any) {
      // common decode for revert messages
      const msg =
        e?.error?.message ||
        e?.reason ||
        e?.message ||
        'Uniswap V4 quote failed';
      return { success: false, error: msg };
    }
  }

  /**
   * Gas estimate placeholder for parity with Sushi provider.
   * For V4, realistic gas depends on hooks/tick crosses; we typically rely on router estimates
   * during *real* execution. Here we just return undefined.
   */
  async estimateSwapGas(): Promise<BigNumber | undefined> {
    return undefined;
  }
}