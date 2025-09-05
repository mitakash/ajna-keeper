// src/sushiswap-router-module.ts
// Based on working production patterns from test-sushiswap-bypass-quoter.ts
import { Contract, BigNumber, Signer, providers, ethers } from 'ethers';
import { logger } from './logging';
import { NonceTracker } from './nonce';
import { weiToDecimaled } from './utils';
import { getTokenFromAddress } from './uniswap';

// ABIs - Based on working production test file
const ERC20_ABI = [
  'function allowance(address,address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)'
];


// USING: Working production ABIs
const SUSHI_ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
  'function WETH9() external view returns (address)',
  'function factory() external view returns (address)'
];

const SUSHI_FACTORY_ABI = [
  'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)'
];

/**
 * FIXED: Function name to match dex-router.ts import
 * ADDED: Factory address parameter (from production code)
 * REMOVED: Quoter logic (production code bypasses quoter)
 * 
 * Swaps tokens using SushiSwap V3 Router - Direct swap approach
 * Based on proven working patterns from test-sushiswap-bypass-quoter.ts
 */
export async function swapWithSushiswapRouter(
  signer: Signer,
  tokenAddress: string,
  amount: BigNumber,
  targetTokenAddress: string,
  slippagePercentage: number, // dex-router passes percentage, not basis points
  swapRouterAddress: string,
  quoterV2Address: string,     // for interface compatibility but not used
  feeTier: number,
  factoryAddress?: string  // Factory address from config
) {
  
  // VALIDATION: Same as current, but added factory validation
  if (!swapRouterAddress) {
    throw new Error('SushiSwap Router address must be provided via configuration');
  }
  if (!feeTier) {
    throw new Error('Fee tier must be provided via configuration');
  }
  if (slippagePercentage === undefined) {
    throw new Error('Slippage must be provided via configuration');
  } 
  if (!signer || !tokenAddress || !amount) {
    throw new Error('Invalid parameters provided to swap');
  }

  const provider = signer.provider;
  if (!provider) {
    throw new Error('No provider available, skipping swap');
  }

  const network = await provider.getNetwork();
  const chainId = network.chainId;
  const signerAddress = await signer.getAddress();

  logger.info(`Chain ID: ${chainId}, Signer: ${signerAddress}`);
  logger.info(`Using SushiSwap Router at: ${swapRouterAddress}`);

  // Get token details
  const tokenToSwap = await getTokenFromAddress(chainId, provider, tokenAddress);
  const targetToken = await getTokenFromAddress(chainId, provider, targetTokenAddress);

  if (tokenToSwap.address.toLowerCase() === targetToken.address.toLowerCase()) {
    logger.info('Tokens are identical, no swap necessary');
    return { success: true };
  }

  // Get contract instances - removed quoter, added factory check
  const tokenContract = new Contract(tokenAddress, ERC20_ABI, signer);
  const routerContract = new Contract(swapRouterAddress, SUSHI_ROUTER_ABI, signer);
  
  // Factory check from production code
  //const SUSHI_FACTORY = '0xCdBCd51a5E8728E0AF4895ce5771b7d17fF71959'; // Hemi factory address
  // NEW: Uses config value with validation
  if (!factoryAddress) {
    throw new Error('SushiSwap factory address must be provided via configuration');
  }  

  const factoryContract = new Contract(factoryAddress, SUSHI_FACTORY_ABI, provider);

  try {
    // STEP 1: Verify pool exists (from production code)
    const poolAddress = await factoryContract.getPool(tokenAddress, targetTokenAddress, feeTier);
    if (poolAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error(`No SushiSwap pool exists for ${tokenToSwap.symbol}/${targetToken.symbol} with fee ${feeTier}`);
    }
    logger.info(`Found SushiSwap pool at ${poolAddress} for ${tokenToSwap.symbol}/${targetToken.symbol}`);

 
    // ADDED: Conservative slippage calculation like production code
    
    // Convert percentage to basis points for internal calculation
    const slippageBasisPoints = slippagePercentage * 100;
    
    // PRODUCTION PATTERN: Use conservative approach without quoter
    // For swaps without quotes, use conservative minimum output calculation
    // This matches the pattern from test-sushiswap-bypass-quoter.ts
    const conservativeOutputRatio = (10000 - slippageBasisPoints) / 10000;
    const minAmountOut = amount.mul(Math.floor(conservativeOutputRatio * 10000)).div(10000);
    
    logger.info(`Input amount: ${weiToDecimaled(amount, tokenToSwap.decimals)} ${tokenToSwap.symbol}`);
    logger.info(`Minimum output with ${slippagePercentage}% slippage: ${weiToDecimaled(minAmountOut, targetToken.decimals)} ${targetToken.symbol} (conservative estimate)`);

    // STEP 2: Approve router if needed (same as current, but with NonceTracker)
    const currentAllowance = await tokenContract.allowance(signerAddress, swapRouterAddress);
    logger.info(`Current SushiSwap router allowance: ${weiToDecimaled(currentAllowance, tokenToSwap.decimals)} ${tokenToSwap.symbol}`);
    
    if (currentAllowance.lt(amount)) {
      logger.info(`Approving SushiSwap router to spend ${tokenToSwap.symbol}`);
      await NonceTracker.queueTransaction(signer, async (nonce) => {
        const approveTx = await tokenContract.approve(swapRouterAddress, ethers.constants.MaxUint256, { nonce });
        logger.info(`SushiSwap approval transaction sent: ${approveTx.hash}`);
        const receipt = await approveTx.wait();
        logger.info(`SushiSwap approval confirmed!`);
        return receipt;
      });
    } else {
      logger.info(`SushiSwap router already has sufficient allowance for ${tokenToSwap.symbol}`);
    }

    // STEP 3: Execute direct swap (matches production test exactly)
    const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 minutes
    
    const swapParams = {
      tokenIn: tokenAddress,
      tokenOut: targetTokenAddress,
      fee: feeTier,
      recipient: signerAddress,
      deadline: deadline,
      amountIn: amount,
      amountOutMinimum: minAmountOut, // Conservative minimum without quoter
      sqrtPriceLimitX96: 0 // No price limit
    };
    
    logger.debug('SushiSwap swap parameters:');
    logger.debug(`   tokenIn: ${swapParams.tokenIn}`);
    logger.debug(`   tokenOut: ${swapParams.tokenOut}`);
    logger.debug(`   fee: ${swapParams.fee}`);
    logger.debug(`   amountIn: ${weiToDecimaled(swapParams.amountIn, tokenToSwap.decimals)}`);
    logger.debug(`   amountOutMinimum: ${weiToDecimaled(swapParams.amountOutMinimum, targetToken.decimals)}`);
    logger.debug(`   deadline: ${new Date(swapParams.deadline * 1000).toLocaleString()}`);

    // PRODUCTION PATTERN: Gas price and execution logic from working test
    const gasPrice = await provider.getGasPrice();
    const highGasPrice = gasPrice.mul(115).div(100); // 15% higher
    logger.info(`Using gas price: ${ethers.utils.formatUnits(highGasPrice, 'gwei')} gwei (15% higher than current)`);
    
    // CRITICAL: Use NonceTracker like all other swap modules
    const receipt = await NonceTracker.queueTransaction(signer, async (nonce) => {
      const swapTx = await routerContract.exactInputSingle(
        swapParams,
        {
          nonce,
          gasLimit: 800000, // Conservative gas limit for SushiSwap
          gasPrice: highGasPrice
        }
      );
      
      logger.info(`SushiSwap transaction sent: ${swapTx.hash}`);
      
      logger.info(`Waiting for transaction confirmation...`);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Transaction confirmation timeout after 2 minutes")), 120000)
      );
      
      // Race between confirmation and timeout
      return await Promise.race([
        swapTx.wait(),
        timeoutPromise
      ]);
    });
    
    logger.info(`Transaction confirmed: ${receipt.transactionHash}`);
    logger.info(`Gas used: ${receipt.gasUsed.toString()}`);
    logger.info(
      `SushiSwap swap successful for token: ${tokenToSwap.symbol}, amount: ${weiToDecimaled(amount, tokenToSwap.decimals)} to ${targetToken.symbol}`
    );
    
    return { success: true, receipt };
    
  } catch (error: any) {
    logger.error(`SushiSwap swap failed for token: ${tokenAddress}: ${error}`);
    return { success: false, error: error.toString() };
  }
}
