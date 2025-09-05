// src/universal-router-module.ts
// FIXED: Now mirrors working SushiSwap patterns for decimal handling and conservative approach
import { Contract, BigNumber, Signer, providers, constants, ethers } from 'ethers';
import { logger } from './logging';
import { NonceTracker } from './nonce';
import { weiToDecimaled } from './utils';
import { getTokenFromAddress } from './uniswap';
import { convertWadToTokenDecimals, getDecimalsErc20 } from './erc20';

// ABIs
const ERC20_ABI = [
  'function allowance(address,address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)'
];

const PERMIT2_ABI = [
  'function approve(address token, address spender, uint160 amount, uint48 expiration)',
  'function allowance(address token, address owner, address spender) view returns (uint160 amount, uint48 expiration, uint48 nonce)'
];

const UNIVERSAL_ROUTER_ABI = [
  'function execute(bytes commands, bytes[] inputs, uint256 deadline) payable'
];

const POOL_FACTORY_ABI = [
  'function getPool(address tokenA, address tokenB, uint24 fee) view returns (address pool)'
];

// Command constants
const V3_SWAP_EXACT_IN = '0x00';

/**
 * FIXED: Swaps tokens using Uniswap's Universal Router with proper decimal handling
 * Now mirrors the working SushiSwap patterns for conservative operation
 */
export async function swapWithUniversalRouter(
  signer: Signer,
  tokenAddress: string,
  amount: BigNumber,
  targetTokenAddress: string,
  slippageBasisPoints: number,
  universalRouterAddress: string,
  permit2Address: string,
  feeTier: number,
  poolFactoryAddress: string,
) {
  
  // VALIDATION: Same as SushiSwap with additional factory validation
  if (!universalRouterAddress) {
    throw new Error('Universal Router address must be provided via configuration');
  }
  if (!feeTier) {
    throw new Error('Fee tier must be provided via configuration');
  }
  if (slippageBasisPoints === undefined) {
    throw new Error('Slippage must be provided via configuration');
  } 
  if (!permit2Address) {
    throw new Error('Permit2 address must be provided via configuration');
  }
  if (!signer || !tokenAddress || !amount) {
    throw new Error('Invalid parameters provided to swap');
  }
  if (!poolFactoryAddress) {
    throw new Error('poolFactoryAddress must be provided via configuration');
  }

  const provider = signer.provider;
  if (!provider) {
    throw new Error('No provider available, skipping swap');
  }

  const network = await provider.getNetwork();
  const chainId = network.chainId;
  const signerAddress = await signer.getAddress();

  logger.info(`Chain ID: ${chainId}, Signer: ${signerAddress}`);
  logger.info(`Using Universal Router at: ${universalRouterAddress}`);

  // Get token details - FIXED: Proper decimal handling like SushiSwap
  const tokenToSwap = await getTokenFromAddress(chainId, provider, tokenAddress);
  const targetToken = await getTokenFromAddress(chainId, provider, targetTokenAddress);

  if (tokenToSwap.address.toLowerCase() === targetToken.address.toLowerCase()) {
    logger.info('Tokens are identical, no swap necessary');
    return { success: true };
  }

  // FIXED: Get actual decimals from contracts (like SushiSwap)
  const inputDecimals = await getDecimalsErc20(signer, tokenAddress);
  const outputDecimals = await getDecimalsErc20(signer, targetTokenAddress);

  logger.debug(`Token decimals: ${tokenToSwap.symbol}=${inputDecimals}, ${targetToken.symbol}=${outputDecimals}`);

  // Get contract instances
  const tokenContract = new Contract(tokenAddress, ERC20_ABI, signer);
  const permit2Contract = new Contract(permit2Address, PERMIT2_ABI, signer);
  const universalRouter = new Contract(universalRouterAddress, UNIVERSAL_ROUTER_ABI, signer);
  const factoryContract = new Contract(poolFactoryAddress, POOL_FACTORY_ABI, provider);

  try {
    // STEP 1: Verify pool exists (from SushiSwap production pattern)
    const poolAddress = await factoryContract.getPool(tokenAddress, targetTokenAddress, feeTier);
    if (poolAddress === '0x0000000000000000000000000000000000000000') {
      logger.warn(`No direct Uniswap pool exists for ${tokenToSwap.symbol}/${targetToken.symbol} with fee ${feeTier}`);
      // Continue anyway as Universal Router may find a path through other pools
    } else {
      logger.info(`Found Uniswap pool at ${poolAddress} for ${tokenToSwap.symbol}/${targetToken.symbol}`);
    }

    // STEP 2: Check and approve Permit2 allowance (same as current but with better logging)
    const permit2Allowance = await tokenContract.allowance(signerAddress, permit2Address);
    logger.info(`Current Permit2 allowance: ${weiToDecimaled(permit2Allowance, inputDecimals)} ${tokenToSwap.symbol}`);
    
    if (permit2Allowance.lt(amount)) {
      logger.info(`Approving Permit2 to spend ${tokenToSwap.symbol}`);
      await NonceTracker.queueTransaction(signer, async (nonce) => {
        const approveTx = await tokenContract.approve(permit2Address, ethers.constants.MaxUint256, { nonce });
        logger.info(`Permit2 approval transaction sent: ${approveTx.hash}`);
        const receipt = await approveTx.wait();
        logger.info(`Permit2 approval confirmed!`);
        return receipt;
      });
    } else {
      logger.info(`Permit2 already has sufficient allowance for ${tokenToSwap.symbol}`);
    }
    
    // STEP 3: Check and approve Universal Router via Permit2 (same as current)
    const { amount: routerAllowance, expiration } = await permit2Contract.allowance(
      tokenAddress,
      signerAddress,
      universalRouterAddress
    );
    
    logger.info(`Current Universal Router allowance via Permit2: ${weiToDecimaled(routerAllowance, inputDecimals)} ${tokenToSwap.symbol} (expires: ${new Date(expiration * 1000).toLocaleString()})`);
    
    if (routerAllowance.lt(amount) || expiration <= Math.floor(Date.now() / 1000)) {
      logger.info(`Approving Universal Router via Permit2 for ${tokenToSwap.symbol}`);
      // Set expiration to 24 hours from now
      const newExpiration = Math.floor(Date.now() / 1000) + 86400;
      await NonceTracker.queueTransaction(signer, async (nonce) => {
        const permit2Tx = await permit2Contract.approve(
          tokenAddress,
          universalRouterAddress,
          amount,
          newExpiration,
          { nonce }
        );
        logger.info(`Universal Router approval transaction sent: ${permit2Tx.hash}`);
        const receipt = await permit2Tx.wait();
        logger.info(`Universal Router approval confirmed!`);
        return receipt;
      });
    } else {
      logger.info(`Universal Router already has sufficient allowance via Permit2 for ${tokenToSwap.symbol}`);
    }
    
    // STEP 4: FIXED: Conservative slippage calculation (mirrors SushiSwap pattern)
    // For LP reward swaps without quotes, use conservative approach
    const conservativeOutputRatio = (10000 - slippageBasisPoints) / 10000;
    const amountOutMin = amount.mul(Math.floor(conservativeOutputRatio * 10000)).div(10000);
    
    logger.info(`Input amount: ${weiToDecimaled(amount, inputDecimals)} ${tokenToSwap.symbol}`);
    logger.info(`Minimum output with ${slippageBasisPoints/100}% slippage: ${weiToDecimaled(amountOutMin, outputDecimals)} ${targetToken.symbol} (conservative estimate)`);
    
    // STEP 5: Prepare the swap command (same as current)
    logger.debug(
      `Swapping token: ${tokenToSwap.symbol}, amount: ${weiToDecimaled(amount, inputDecimals)} to ${targetToken.symbol}`
    );
    
    const commands = V3_SWAP_EXACT_IN; // Single command for V3_SWAP_EXACT_IN
    
    // Encode the path (tokenIn -> fee -> tokenOut)
    const path = ethers.utils.solidityPack(
      ['address', 'uint24', 'address'],
      [tokenAddress, feeTier, targetTokenAddress]
    );
    
    // Encode the inputs for V3_SWAP_EXACT_IN
    // Parameters: recipient, amountIn, amountOutMin, path, payerIsUser
    const inputs = [
      ethers.utils.defaultAbiCoder.encode(
        ['address', 'uint256', 'uint256', 'bytes', 'bool'],
        [signerAddress, amount, amountOutMin, path, true] // true means tokens come from msg.sender via Permit2
      )
    ];
    
    // STEP 6: Execute the swap (same gas strategy as SushiSwap)
    const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 minutes
    
    // Get gas price and estimate gas (mirrors SushiSwap pattern)
    const gasPrice = await provider.getGasPrice();
    const highGasPrice = gasPrice.mul(115).div(100); // 15% higher
    logger.info(`Using gas price: ${ethers.utils.formatUnits(highGasPrice, 'gwei')} gwei (15% higher than current)`);
    
    // Execute the swap using our queued transaction system (same as SushiSwap)
    const receipt = await NonceTracker.queueTransaction(signer, async (nonce) => {
      const swapTx = await universalRouter.execute(
        commands,
        inputs,
        deadline,
        {
          nonce,
          gasLimit: 1000000, // Generous gas limit for Universal Router
          gasPrice: highGasPrice
        }
      );
      
      logger.info(`Uniswap swap transaction sent: ${swapTx.hash}`);
      
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
      `Uniswap swap successful for token: ${tokenToSwap.symbol}, amount: ${weiToDecimaled(amount, inputDecimals)} to ${targetToken.symbol}`
    );
    
    return { success: true, receipt };
    
  } catch (error: any) {
    logger.error(`Uniswap swap failed for token: ${tokenAddress}: ${error}`);
    return { success: false, error: error.toString() };
  }
}