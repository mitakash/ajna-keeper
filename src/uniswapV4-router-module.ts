// src/uniswapV4-router-module.ts
import { BigNumber, Signer, ethers, Contract } from 'ethers';
import { UniV4PoolKey } from './config-types';
import { logger } from './logging';
import { NonceTracker } from './nonce';

const ERC20_ABI = [
  'function allowance(address,address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)'
];

// Universal Router ABI for V4
const UNIVERSAL_ROUTER_ABI = [
  'function execute(bytes commands, bytes[] inputs, uint256 deadline) payable returns (bytes[] memory)'
];

// V4 command
const V4_SWAP = '0x10';

export async function swapWithUniswapV4Adapter(
  signer: Signer,
  tokenIn: string,
  amountIn: BigNumber,
  tokenOut: string,
  slippagePct: number,
  routerAddress: string,
  poolKey: UniV4PoolKey,
  to: string,
  hookData: string = '0x'
): Promise<{ success: boolean; receipt?: ethers.providers.TransactionReceipt; error?: string }> {
  
  if (!routerAddress) throw new Error('UniswapV4 router address is required');

  const provider = signer.provider!;
  const addr = await signer.getAddress();

  logger.info(`Using Uniswap V4 Universal Router at: ${routerAddress}`);

  // Get token contracts
  const tokenInContract = new Contract(tokenIn, ERC20_ABI, signer);
  const tokenOutContract = new Contract(tokenOut, ERC20_ABI, signer);
  const router = new Contract(routerAddress, UNIVERSAL_ROUTER_ABI, signer);

  try {
    // Get decimals
    const inDec = await tokenInContract.decimals();
    const outDec = await tokenOutContract.decimals();

    logger.debug(`Token decimals: ${tokenIn}=${inDec}, ${tokenOut}=${outDec}`);

    // Calculate minimum output with slippage
    const slippageBasisPoints = slippagePct * 100;
    const minOut = amountIn.mul(10000 - slippageBasisPoints).div(10000);

    logger.info(`Swap: ${ethers.utils.formatUnits(amountIn, inDec)} → min ${ethers.utils.formatUnits(minOut, outDec)}`);

    // Approve router if needed
    const allowance: BigNumber = await tokenInContract.allowance(addr, routerAddress);
    if (allowance.lt(amountIn)) {
      logger.info('Approving Universal Router...');
      const approveTx = await tokenInContract.approve(routerAddress, ethers.constants.MaxUint256);
      await approveTx.wait();
      logger.info('Approval confirmed');
    }

    // Encode PoolKey for V4
    const encodedPoolKey = ethers.utils.defaultAbiCoder.encode(
      ['tuple(address,address,uint24,int24,address)'],
      [[poolKey.token0, poolKey.token1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]]
    );

    // Prepare V4 swap input
    const swapInput = ethers.utils.defaultAbiCoder.encode(
      ['address', 'uint256', 'uint256', 'bytes', 'bool'],
      [
        to,                  // recipient
        amountIn,           // amountIn
        minOut,             // amountOutMinimum
        encodedPoolKey,     // poolKey
        false               // payerIsUser (false = router handles it)
      ]
    );

    const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 minutes
    const commands = V4_SWAP;
    const inputs = [swapInput];

    logger.info('Executing V4 swap via Universal Router...');

    const gasPrice = await provider.getGasPrice();
    const tx = await router.execute(
      commands,
      inputs,
      deadline,
      { gasLimit: 800000, gasPrice: gasPrice.mul(115).div(100) }
    );

    logger.info(`Transaction sent: ${tx.hash}`);
    const receipt = await tx.wait();
    logger.info(`Swap confirmed! Gas used: ${receipt.gasUsed.toString()}`);

    return { success: true, receipt };

  } catch (error: any) {
    logger.error(`V4 swap failed: ${error.message}`);
    return { success: false, error: error.toString() };
  }
}