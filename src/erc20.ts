import { Signer, SignerOrProvider } from '@ajna-finance/sdk';
import { BigNumber, Contract, ethers } from 'ethers';
import Erc20Abi from './abis/erc20.abi.json';
import { NonceTracker } from './nonce';
import { TransactionResponse } from '@ethersproject/abstract-provider';

// TODO: Remove caching. This performance improvement is not worth the complexity.
const cachedDecimals: Map<string, number> = new Map(); // Map of address to int decimals.
export async function getDecimalsErc20(
  signer: SignerOrProvider,
  tokenAddress: string
) {
  if (!cachedDecimals.has(tokenAddress)) {
    const decimals = await _getDecimalsErc20(signer, tokenAddress);
    cachedDecimals.set(tokenAddress, decimals);
  }
  return cachedDecimals.get(tokenAddress)!;
}

async function _getDecimalsErc20(
  signer: SignerOrProvider,
  tokenAddress: string
) {
  const contract = new Contract(tokenAddress, Erc20Abi, signer);
  const decimals = await contract.decimals();
  return decimals;
}

export async function getBalanceOfErc20(
  signer: Signer,
  tokenAddress: string
): Promise<BigNumber> {
  const contract = new Contract(tokenAddress, Erc20Abi, signer);
  const ownerAddress = await signer.getAddress();
  return await contract.balanceOf(ownerAddress);
}

export async function getAllowanceOfErc20(
  signer: Signer,
  tokenAddress: string,
  allowedAddress: string
): Promise<BigNumber> {
  const contract = new Contract(tokenAddress, Erc20Abi, signer);
  const signerAddress = await signer.getAddress();
  return await contract.allowance(signerAddress, allowedAddress);
}


export async function approveErc20(
  signer: Signer, 
  tokenAddress: string, 
  allowedAddress: string, 
  amount: BigNumber) {
  return await NonceTracker.queueTransaction(signer, async (nonce: number) => {
    const contractUnconnected = new Contract(tokenAddress, Erc20Abi, signer);
    const contract = contractUnconnected.connect(signer);
    const tx = await contract.approve(allowedAddress, amount, { nonce: nonce.toString() });
    return await tx.wait();
  });
}

export async function transferErc20(
  signer: Signer,
  tokenAddress: string,
  recipient: string,
  amount: BigNumber
) {
  return await NonceTracker.queueTransaction(signer, async (nonce: number) => {
    const contractUnconnected = new Contract(tokenAddress, Erc20Abi, signer);
    const contract = contractUnconnected.connect(signer);
    const tx = await contract.transfer(recipient, amount, { 
      nonce: nonce.toString() 
    });
    return await tx.wait();
  });
}


/**
 * Convert from WAD (18 decimals) to token's native decimals
 * Use: When passing Ajna amounts to external DEXs
 * Example: convertWadToTokenDecimals(collateral, 6) for USDC
 */
export function convertWadToTokenDecimals(
  wadAmount: BigNumber,
  tokenDecimals: number
): BigNumber {
  if (tokenDecimals === 18) {
    return wadAmount; // No conversion needed
  }

  if (tokenDecimals < 18) {
    // Scale down: divide by 10^(18 - tokenDecimals)
    const divisor = ethers.BigNumber.from(10).pow(18 - tokenDecimals);
    return wadAmount.div(divisor);
  } else {
    // Scale up: multiply by 10^(tokenDecimals - 18)
    const multiplier = ethers.BigNumber.from(10).pow(tokenDecimals - 18);
    return wadAmount.mul(multiplier);
  }
}

/**
 * Convert from token's native decimals to WAD (18 decimals)
 * Use: When passing DEX results back to Ajna
 */
export function convertTokenDecimalsToWad(
  tokenAmount: BigNumber,
  tokenDecimals: number
): BigNumber {
  if (tokenDecimals === 18) {
    return tokenAmount; // No conversion needed
  }

  if (tokenDecimals < 18) {
    // Scale up: multiply by 10^(18 - tokenDecimals)
    const multiplier = ethers.BigNumber.from(10).pow(18 - tokenDecimals);
    return tokenAmount.mul(multiplier);
  } else {
    // Scale down: divide by 10^(tokenDecimals - 18)
    const divisor = ethers.BigNumber.from(10).pow(tokenDecimals - 18);
    return tokenAmount.div(divisor);
  }
}
