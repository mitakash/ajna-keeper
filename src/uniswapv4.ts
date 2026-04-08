// src/uniswapV4-core.ts
/**
 * Uniswap V4 Core Types and Utilities
 * Based on working manual swap implementation
 */
import { ethers, BigNumber } from 'ethers';

// ============================================================================
// V4 Core Types
// ============================================================================

export interface Currency {
  addr: string;
}

export interface PoolKey {
  currency0: Currency;
  currency1: Currency;
  fee: number;
  tickSpacing: number;
  hooks: string;
}

export interface SwapParams {
  zeroForOne: boolean;
  amountSpecified: BigNumber;
  sqrtPriceLimitX96: BigNumber;
}

export interface BalanceDelta {
  amount0: BigNumber;
  amount1: BigNumber;
}

// ============================================================================
// Contract ABIs
// ============================================================================

// AUDIT FIX NEW-01: Corrected POOL_MANAGER_ABI - settle() takes a Currency (address) argument.
// V4 PoolManager signature: settle(Currency currency) external payable returns (uint256 paid)
// Currency is a UDVT over address, so ABI encodes as plain address.
// Also corrected: Currency in PoolKey encodes as address (UDVT), NOT tuple(address).
export const POOL_MANAGER_ABI = [
  'function unlock(bytes calldata data) external returns (bytes memory)',
  'function swap(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, tuple(bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96) params, bytes calldata hookData) external returns (int256)',
  'function take(address currency, address to, uint256 amount) external',
  'function settle(address currency) external payable returns (uint256)',
  'function sync(address currency) external',
];

export const STATE_VIEW_ABI = [
  'function getSlot0(bytes32 poolId) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)',
  'function getLiquidity(bytes32 poolId) external view returns (uint128 liquidity)',
];

export const ERC20_ABI = [
  'function allowance(address,address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
];

export const PERMIT2_ABI = [
  'function approve(address token, address spender, uint160 amount, uint48 expiration) external',
  'function allowance(address user, address token, address spender) external view returns (uint160 amount, uint48 expiration, uint48 nonce)',
];

export const UNIVERSAL_ROUTER_ABI = [
  'function execute(bytes commands, bytes[] inputs, uint256 deadline) payable',
  'function execute(bytes commands, bytes[] inputs) payable',
];

// ============================================================================
// Known Addresses (Base Mainnet)
// ============================================================================

export const V4_ADDRESSES = {
  BASE: {
    POOL_MANAGER: '0x498581FF718922C3f8E6A244956AF099B2652B2b',
    UNIVERSAL_ROUTER: '0x6fF5693b99212Da76ad316178A184AB56D299b43',
    STATE_VIEW: '0xa3c0c9b65bad0b08107aa264b0f3db444b867a71',
    PERMIT2: '0x000000000022D473030F116dDEE9F6B43aC78BA3',
  },
};

// Chain ID mapping
export const V4_CHAIN_ADDRESSES: Record<number, typeof V4_ADDRESSES.BASE> = {
  8453: V4_ADDRESSES.BASE, // Base mainnet
};

// ============================================================================
// Universal Router Commands
// ============================================================================

export const Commands = {
  PERMIT2_TRANSFER_FROM: 0x02,
  V4_SWAP: 0x10,
  // Add other commands as needed
};

// ============================================================================
// V4Router Actions (from v4-periphery)
// ============================================================================

export const Actions = {
  SWAP_EXACT_IN_SINGLE: 0x06,
  SWAP_EXACT_IN: 0x07,
  SWAP_EXACT_OUT_SINGLE: 0x08,
  SWAP_EXACT_OUT: 0x09,
  SETTLE: 0x0b,
  SETTLE_ALL: 0x0c,
  TAKE: 0x0e,
  TAKE_ALL: 0x0f,
  TAKE_PORTION: 0x10,
};

// ============================================================================
// Constants
// ============================================================================

export const MIN_SQRT_RATIO = BigNumber.from('4295128740');
export const MAX_SQRT_RATIO = BigNumber.from('1461446703485210103287273052203988822378723970341');
export const MAX_UINT160 = BigNumber.from('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF');
export const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

// ============================================================================
// Utility Functions
// ============================================================================

export class V4Utils {
  /**
   * Get V4 addresses for a specific chain
   */
  static getAddresses(chainId: number): typeof V4_ADDRESSES.BASE | null {
    return V4_CHAIN_ADDRESSES[chainId] || null;
  }

  /**
   * Generate V4 Pool ID from PoolKey
   * AUDIT FIX C-01: V4 Currency is a UDVT (type Currency is address), encodes as plain address
   * PoolKey encodes as: (address, address, uint24, int24, address) - NOT tuple(address)
   */
  static generatePoolId(poolKey: PoolKey): string {
    return ethers.utils.keccak256(
      ethers.utils.defaultAbiCoder.encode(
        ['tuple(address, address, uint24, int24, address)'],
        [[
          poolKey.currency0.addr,
          poolKey.currency1.addr,
          poolKey.fee,
          poolKey.tickSpacing,
          poolKey.hooks,
        ]],
      ),
    );
  }

  /**
   * Convert sqrtPriceX96 to human-readable price
   * Formula: price = (sqrtPriceX96 / 2^96)^2 * 10^(token0Decimals - token1Decimals)
   *
   * AUDIT FIX M-05: Use BigNumber integer arithmetic to avoid float precision loss.
   * sqrtPriceX96 can be up to 160 bits; parseFloat() only has ~53 bits of mantissa,
   * which causes significant precision loss for extreme price ratios.
   *
   * Approach: scale the intermediate BigNumber result to 18 decimal places of precision,
   * then convert to float only at the final step.
   */
  static sqrtPriceX96ToPrice(
    sqrtPriceX96: BigNumber,
    token0Decimals: number,
    token1Decimals: number,
    token0IsInput: boolean = true,
  ): number {
    // SCALE = 10^18 gives us 18 decimal places of fixed-point precision
    const SCALE = BigNumber.from(10).pow(18);
    // Q192 = (2^96)^2
    const Q192 = BigNumber.from(2).pow(192);

    // rawPriceScaled = sqrtPriceX96^2 * SCALE / Q192
    // Represents (token1 per token0 in smallest units) with 18 decimal precision
    // BigNumber handles arbitrary precision so no overflow risk here
    const rawPriceScaled = sqrtPriceX96.mul(sqrtPriceX96).mul(SCALE).div(Q192);

    // Adjust for decimal difference: multiply/divide by 10^|decimalDiff|
    const decimalDiff = token0Decimals - token1Decimals;
    let adjustedScaled: BigNumber;
    if (decimalDiff >= 0) {
      adjustedScaled = rawPriceScaled.mul(BigNumber.from(10).pow(decimalDiff));
    } else {
      adjustedScaled = rawPriceScaled.div(BigNumber.from(10).pow(-decimalDiff));
    }

    // Convert back to a float - precision is now acceptable since we've already
    // done the heavy lifting in BigNumber land. Final value is (price * 10^18).
    const priceFloat = parseFloat(ethers.utils.formatUnits(adjustedScaled, 18));

    // If token0 is input, return token1/token0 (how much token1 per token0)
    // If token1 is input, invert
    return token0IsInput ? priceFloat : (priceFloat > 0 ? 1 / priceFloat : 0);
  }

  /**
   * Calculate sqrt price limit for slippage protection
   */
  static calculateSqrtPriceLimitX96(zeroForOne: boolean): BigNumber {
    return zeroForOne ? MIN_SQRT_RATIO : MAX_SQRT_RATIO;
  }

  /**
   * Determine if swap is zeroForOne
   */
  static getZeroForOne(tokenIn: string, poolKey: PoolKey): boolean {
    return tokenIn.toLowerCase() === poolKey.currency0.addr.toLowerCase();
  }

  /**
   * Create Currency struct
   */
  static createCurrency(address: string): Currency {
    return { addr: address };
  }

  /**
   * Validate PoolKey structure
   */
  static validatePoolKey(poolKey: PoolKey): boolean {
    return !!(
      poolKey.currency0?.addr &&
      poolKey.currency1?.addr &&
      poolKey.fee !== undefined &&
      poolKey.tickSpacing !== undefined &&
      poolKey.hooks
    );
  }

  /**
   * Get tick spacing for fee tier
   */
  static getTickSpacingForFee(fee: number): number {
    const tickSpacings: Record<number, number> = {
      100: 1,
      500: 10,
      3000: 60,
      10000: 200,
    };
    return tickSpacings[fee] || 60;
  }
}

// ============================================================================
// Custom Errors
// ============================================================================

export class V4Error extends Error {
  constructor(message: string) {
    super(`V4Error: ${message}`);
    this.name = 'V4Error';
  }
}

export class V4SwapError extends V4Error {
  constructor(message: string) {
    super(`Swap failed: ${message}`);
    this.name = 'V4SwapError';
  }
}

export class V4QuoteError extends V4Error {
  constructor(message: string) {
    super(`Quote failed: ${message}`);
    this.name = 'V4QuoteError';
  }
}