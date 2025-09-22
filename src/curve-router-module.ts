// src/curve-router-module.ts
// Simplified Curve integration for Base L2 - follows sushiswap-router-module.ts patterns
import { Contract, BigNumber, Signer, providers, ethers } from 'ethers';
import { logger } from './logging';
import { NonceTracker } from './nonce';
import { weiToDecimaled } from './utils';
import { getTokenFromAddress } from './uniswap';
import { CurvePoolType } from './config-types';

// ABIs - Based on working test scripts
const ERC20_ABI = [
  'function allowance(address,address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)'
];

// StableSwap ABI (int128 indices) - from curve-swap-base-4pool.ts
const STABLESWAP_ABI = [
  'function coins(uint256 i) external view returns (address)',
  'function balances(uint256 i) external view returns (uint256)',
  'function get_dy(int128 i, int128 j, uint256 dx) external view returns (uint256)',
  'function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external returns (uint256)',
  'function fee() external view returns (uint256)',
];

// CryptoSwap ABI (uint256 indices) - from curve-swap-tricrypto.ts
const CRYPTOSWAP_ABI = [
  'function coins(uint256 i) external view returns (address)',
  'function balances(uint256 i) external view returns (uint256)',
  'function get_dy(uint256 i, uint256 j, uint256 dx) external view returns (uint256)',
  'function exchange(uint256 i, uint256 j, uint256 dx, uint256 min_dy, bool use_eth, address receiver) payable returns (uint256)',
  'function fee() external view returns (uint256)',
];

/**
 * Swaps tokens using Curve pools - Simplified for Base L2
 * Based on sushiswap-router-module.ts patterns and working curve test scripts
 */
export async function swapWithCurveRouter(
  signer: Signer,
  tokenAddress: string,
  amount: BigNumber,
  targetTokenAddress: string,
  slippagePercentage: number, // dex-router passes percentage, not basis points
  poolAddress: string,
  poolType: CurvePoolType,
  defaultSlippage?: number
) {
  
  // VALIDATION: Same pattern as SushiSwap module
  if (!poolAddress) {
    throw new Error('Curve pool address must be provided via configuration');
  }
  if (!poolType) {
    throw new Error('Pool type must be provided via configuration');
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
  logger.info(`Using Curve pool at: ${poolAddress} (type: ${poolType})`);

  // Get token details - same pattern as SushiSwap
  const tokenToSwap = await getTokenFromAddress(chainId, provider, tokenAddress);
  const targetToken = await getTokenFromAddress(chainId, provider, targetTokenAddress);

  if (tokenToSwap.address.toLowerCase() === targetToken.address.toLowerCase()) {
    logger.info('Tokens are identical, no swap necessary');
    return { success: true };
  }

  // SIMPLIFIED: On Base L2, all tokens are ERC20s - no ETH/WETH conversion needed
  const tokenInForLookup = tokenAddress;
  const tokenOutForLookup = targetTokenAddress;

  // Get contract instances with ABI selection based on pool type
  const tokenContract = new Contract(tokenAddress, ERC20_ABI, signer);
  
  // ABI selection pattern from test scripts
  const poolAbi = poolType === CurvePoolType.STABLE ? STABLESWAP_ABI : CRYPTOSWAP_ABI;
  const poolContract = new Contract(poolAddress, poolAbi, signer);

  try {
    // STEP 1: Discover token indices (pattern from test scripts)
    let tokenInIndex: number | undefined;
    let tokenOutIndex: number | undefined;

    for (let i = 0; i < 8; i++) {
      try {
        const tokenAddr = await poolContract.coins(i);
        if (tokenAddr.toLowerCase() === tokenInForLookup.toLowerCase()) tokenInIndex = i;
        if (tokenAddr.toLowerCase() === tokenOutForLookup.toLowerCase()) tokenOutIndex = i;
      } catch (e) {
        break; // No more tokens in pool
      }
    }

    if (tokenInIndex === undefined || tokenOutIndex === undefined) {
      throw new Error(`Token indices not found in pool. Cannot proceed with swap.`);
    }

    logger.info(`Found token indices: ${tokenToSwap.symbol}@${tokenInIndex}, ${targetToken.symbol}@${tokenOutIndex}`);

    // STEP 2: Get quote using pool-specific ABI (pattern from test scripts)
    logger.info(`Requesting quote for ${weiToDecimaled(amount, tokenToSwap.decimals)} ${tokenToSwap.symbol}...`);
    
    let minAmountOut: BigNumber;
    if (poolType === CurvePoolType.STABLE) {
      // StableSwap uses int128 indices
      minAmountOut = await poolContract.get_dy(tokenInIndex, tokenOutIndex, amount);
    } else {
      // CryptoSwap uses uint256 indices  
      minAmountOut = await poolContract.get_dy(tokenInIndex, tokenOutIndex, amount);
    }

    const minAmountOutFormatted = weiToDecimaled(minAmountOut, targetToken.decimals);
    
    // STEP 3: Conservative slippage calculation (same as SushiSwap pattern)
    const slippageBasisPoints = slippagePercentage * 100;
    const conservativeOutputRatio = (10000 - slippageBasisPoints) / 10000;
    const minAmountOutWithSlippage = minAmountOut.mul(Math.floor(conservativeOutputRatio * 10000)).div(10000);
    const minAmountOutWithSlippageFormatted = weiToDecimaled(minAmountOutWithSlippage, targetToken.decimals);

    logger.info(`Quote received: ~${minAmountOutFormatted} ${targetToken.symbol}`);
    logger.info(`Minimum output with ${slippagePercentage}% slippage: ${minAmountOutWithSlippageFormatted} ${targetToken.symbol}`);

    // STEP 4: Approve token spending (same pattern as SushiSwap, simplified for L2)
    const currentAllowance = await tokenContract.allowance(signerAddress, poolAddress);
    logger.info(`Current Curve pool allowance: ${weiToDecimaled(currentAllowance, tokenToSwap.decimals)} ${tokenToSwap.symbol}`);
    
    if (currentAllowance.lt(amount)) {
      logger.info(`Approving Curve pool to spend ${tokenToSwap.symbol}`);
      await NonceTracker.queueTransaction(signer, async (nonce) => {
        const approveTx = await tokenContract.approve(poolAddress, ethers.constants.MaxUint256, { nonce });
        logger.info(`Curve approval transaction sent: ${approveTx.hash}`);
        const receipt = await approveTx.wait();
        logger.info(`Curve approval confirmed!`);
        return receipt;
      });
    } else {
      logger.info(`Curve pool already has sufficient allowance for ${tokenToSwap.symbol}`);
    }

    // STEP 5: Execute swap with pool-specific parameters (pattern from test scripts)
    logger.info(`Executing swap on Curve ${poolType} pool...`);
    
    // Gas pricing strategy (same as SushiSwap)
    const gasPrice = await provider.getGasPrice();
    const highGasPrice = gasPrice.mul(115).div(100); // 15% higher
    logger.info(`Using gas price: ${ethers.utils.formatUnits(highGasPrice, 'gwei')} gwei (15% higher than current)`);

    // Execute swap using NonceTracker (same pattern as SushiSwap)
    const receipt = await NonceTracker.queueTransaction(signer, async (nonce) => {
      let swapTx;
      
      if (poolType === CurvePoolType.STABLE) {
        // StableSwap exchange: exchange(int128 i, int128 j, uint256 dx, uint256 min_dy)
        swapTx = await poolContract.exchange(
          tokenInIndex,
          tokenOutIndex,
          amount,
          minAmountOutWithSlippage,
          {
            nonce,
            gasLimit: 800000, // Conservative gas limit 
            gasPrice: highGasPrice
            // No value parameter needed on L2
          }
        );
      } else {
        // CryptoSwap exchange: exchange(uint256 i, uint256 j, uint256 dx, uint256 min_dy, bool use_eth, address receiver)
        swapTx = await poolContract.exchange(
          tokenInIndex,
          tokenOutIndex,
          amount,
          minAmountOutWithSlippage,
          false, // use_eth = false on L2 (everything is ERC20)
          signerAddress, // receiver
          {
            nonce,
            gasLimit: 800000, // Conservative gas limit
            gasPrice: highGasPrice
            // No value parameter needed on L2
          }
        );
      }
      
      logger.info(`Curve transaction sent: ${swapTx.hash}`);
      
      logger.info(`Waiting for transaction confirmation...`);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Transaction confirmation timeout after 2 minutes")), 120000)
      );
      
      // Race between confirmation and timeout (same pattern as SushiSwap)
      return await Promise.race([
        swapTx.wait(),
        timeoutPromise
      ]);
    });
    
    logger.info(`Transaction confirmed: ${receipt.transactionHash}`);
    logger.info(`Gas used: ${receipt.gasUsed.toString()}`);
    logger.info(
      `Curve swap successful for token: ${tokenToSwap.symbol}, amount: ${weiToDecimaled(amount, tokenToSwap.decimals)} to ${targetToken.symbol}`
    );
    
    return { success: true, receipt };
    
  } catch (error: any) {
    logger.error(`Curve swap failed for token: ${tokenAddress}: ${error}`);
    return { success: false, error: error.toString() };
  }
}