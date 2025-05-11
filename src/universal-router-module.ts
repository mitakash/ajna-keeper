// src/universal-router-module.ts
import { Contract, BigNumber, Signer, providers, constants, ethers } from 'ethers';
import { logger } from './logging';
import { NonceTracker } from './nonce';
import { weiToDecimaled } from './utils';
import { getTokenFromAddress } from './uniswap';

// ABIs
const ERC20_ABI = [
  'function allowance(address,address) view returns (uint256)',
  'function approve(address,uint256) returns (bool)'
];

const PERMIT2_ABI = [
  'function approve(address token, address spender, uint160 amount, uint48 expiration)',
  'function allowance(address token, address owner, address spender) view returns (uint160 amount, uint48 expiration, uint48 nonce)'
];

const UNIVERSAL_ROUTER_ABI = [
  'function execute(bytes commands, bytes[] inputs, uint256 deadline) payable'
];

// Command constants
const V3_SWAP_EXACT_IN = '0x00';

/**
 * Swaps tokens using Uniswap's Universal Router with Permit2
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

  // Get token details
  const tokenToSwap = await getTokenFromAddress(chainId, provider, tokenAddress);
  const targetToken = await getTokenFromAddress(chainId, provider, targetTokenAddress);

  if (tokenToSwap.address.toLowerCase() === targetToken.address.toLowerCase()) {
    logger.info('Tokens are identical, no swap necessary');
    return { success: true };
  }

  // Get contract instances
  const tokenContract = new Contract(tokenAddress, ERC20_ABI, signer);
  const permit2Contract = new Contract(permit2Address, PERMIT2_ABI, signer);
  const universalRouter = new Contract(universalRouterAddress, UNIVERSAL_ROUTER_ABI, signer);

  try {
    // Step 1: Check and approve Permit2 allowance
    const permit2Allowance = await tokenContract.allowance(signerAddress, permit2Address);
    logger.info(`Current Permit2 allowance: ${weiToDecimaled(permit2Allowance, tokenToSwap.decimals)} ${tokenToSwap.symbol}`);
    
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
    
    // Step 2: Check and approve Universal Router via Permit2
    const { amount: routerAllowance, expiration } = await permit2Contract.allowance(
      tokenAddress,
      signerAddress,
      universalRouterAddress
    );
    
    logger.info(`Current Universal Router allowance via Permit2: ${weiToDecimaled(routerAllowance, tokenToSwap.decimals)} ${tokenToSwap.symbol} (expires: ${new Date(expiration * 1000).toLocaleString()})`);
    
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
    
    // Step 3: Check if pool exists
    let poolExists = true;
    try {
      const factory = poolFactoryAddress;	    
      const factoryAbi = ['function getPool(address tokenA, address tokenB, uint24 fee) view returns (address pool)'];
      const factoryContract = new Contract(factory, factoryAbi, provider);
      
      const poolAddress = await factoryContract.getPool(tokenAddress, targetTokenAddress, feeTier);
      if (poolAddress === '0x0000000000000000000000000000000000000000') {
        poolExists = false;
        logger.warn(`No direct pool exists for ${tokenToSwap.symbol}/${targetToken.symbol} with fee ${feeTier/10000}%`);
        // We'll continue anyway as the universal router may find a path
      } else {
        logger.info(`Found pool at ${poolAddress}`);
      }
    } catch (error: any) {
      logger.warn(`Could not verify pool: ${error.message}`);
    }
    
    // Step 4: Prepare the swap command
    logger.debug(
      `Swapping token: ${tokenToSwap.symbol}, amount: ${weiToDecimaled(amount, tokenToSwap.decimals)} to ${targetToken.symbol}`
    );
    
    const commands = V3_SWAP_EXACT_IN; // Single command for V3_SWAP_EXACT_IN
    
    // Encode the path (tokenIn -> fee -> tokenOut)
    const path = ethers.utils.solidityPack(
      ['address', 'uint24', 'address'],
      [tokenAddress, feeTier, targetTokenAddress]
    );
    
    // Calculate minimum out with slippage
    const amountOutMin = amount.mul(10000 - slippageBasisPoints).div(10000);
    logger.info(`Minimum output amount with ${slippageBasisPoints/100}% slippage: ${weiToDecimaled(amountOutMin, targetToken.decimals)} ${targetToken.symbol}`);
    
    // Encode the inputs for V3_SWAP_EXACT_IN
    // Parameters: recipient, amountIn, amountOutMin, path, payerIsUser
    const inputs = [
      ethers.utils.defaultAbiCoder.encode(
        ['address', 'uint256', 'uint256', 'bytes', 'bool'],
        [signerAddress, amount, amountOutMin, path, true] // true means tokens come from msg.sender via Permit2
      )
    ];
    
    // Step 5: Execute the swap
    const deadline = Math.floor(Date.now() / 1000) + 1800; // 30 minutes
    
    // Get gas price and estimate gas
    const gasPrice = await provider.getGasPrice();
    const highGasPrice = gasPrice.mul(115).div(100); // 15% higher
    logger.info(`Using gas price: ${ethers.utils.formatUnits(highGasPrice, 'gwei')} gwei (15% higher than current)`);
    
    // Execute the swap using our queued transaction system
    const receipt = await NonceTracker.queueTransaction(signer, async (nonce) => {
      const swapTx = await universalRouter.execute(
        commands,
        inputs,
        deadline,
        {
          nonce,
          gasLimit: 1000000, // Generous gas limit
          gasPrice: highGasPrice
        }
      );
      
      logger.info(`Swap transaction sent: ${swapTx.hash}`);
      
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
      `Swap successful for token: ${tokenToSwap.symbol}, amount: ${weiToDecimaled(amount, tokenToSwap.decimals)} to ${targetToken.symbol}`
    );
    
    return { success: true, receipt };
  } catch (error: any) {
    logger.error(`Swap failed for token: ${tokenAddress}: ${error}`);
    // No need to manually reset nonce as our queueTransaction does this automatically on error
    return { success: false, error: error.toString() };
  }
}
