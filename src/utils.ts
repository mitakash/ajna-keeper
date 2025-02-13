import { BigNumber, providers, Wallet } from 'ethers';
import { promises as fs } from 'fs';
import { password } from '@inquirer/prompts';
import { FungiblePool } from '@ajna-finance/sdk';
import { KeeperConfig } from './config-types';
import { logger } from './logging';

export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;
interface UtilsType {
  addAccountFromKeystore: (
    keystorePath: string,
    provider: providers.JsonRpcProvider
  ) => Promise<Wallet>;
  getProviderAndSigner: (
    keystorePath: string,
    rpcUrl: string
  ) => Promise<{ provider: providers.JsonRpcProvider; signer: Wallet }>;
  askPassword: () => Promise<string>;
}

let Utils: UtilsType;

export async function askPassword () {
  const pswd = await password({
    message: 'Please enter your keystore password',
    mask: '*',
  });

  return pswd;
};

export async function addAccountFromKeystore(
  keystorePath: string,
  provider: providers.JsonRpcProvider
): Promise<Wallet> {
  // read the keystore file, confirming it exists
  const jsonKeystore = (await fs.readFile(keystorePath)).toString();

  const pswd = await password({
    message: 'Please enter your keystore password',
    mask: '*',
  });

  try {
    let wallet = Wallet.fromEncryptedJsonSync(jsonKeystore, pswd);
    logger.info(`Loaded wallet with address: ${wallet.address}`);
    return wallet.connect(provider);
  } catch (error) {
    logger.error('Error decrypting keystore:', error);
    logger.error('This keeper will not create transactions');
    let wallet = Wallet.createRandom();
    return wallet.connect(provider);
  }
}

export function overrideMulticall(
  fungiblePool: FungiblePool,
  chainConfig: KeeperConfig
): void {
  if (
    chainConfig?.multicallAddress &&
    chainConfig?.multicallBlock != undefined
  ) {
    fungiblePool.ethcallProvider.multicall3 = {
      address: chainConfig.multicallAddress,
      block: chainConfig.multicallBlock,
    };
  }
}

export async function delay(seconds: number) {
  return new Promise((res) => setTimeout(res, seconds * 1000));
}

function bigToScientific(bn: BigNumber): {
  mantissa: number;
  exponent10: number;
} {
  const bnStr = bn.toString();
  const numbStart = bnStr.startsWith('-') ? 1 : 0;
  const mantissa = parseFloat(
    bnStr.slice(0, numbStart + 1) + '.' + bnStr.slice(numbStart + 1, 14)
  );
  const exponent10 = bnStr.length - (1 + numbStart);
  return { mantissa, exponent10 };
}

export function weiToDecimaled(
  bn: BigNumber,
  tokenDecimals: number = 18
): number {
  const scientific = bigToScientific(bn);
  scientific.exponent10 -= tokenDecimals;
  return parseFloat(scientific.mantissa + 'e' + scientific.exponent10);
}

export function decimaledToWei(
  dec: number,
  tokenDecimals: number = 18
): BigNumber {
  const scientificStr = dec.toExponential();
  const [mantissaStr, exponent10Str] = scientificStr
    .replace('.', '')
    .split('e');
  let weiStrLength = 1;
  if (mantissaStr.includes('.')) weiStrLength += 1;
  if (mantissaStr.startsWith('-')) weiStrLength += 1;
  const exponent10 = parseInt(exponent10Str) + tokenDecimals;
  weiStrLength += exponent10;
  const weiStr = mantissaStr.slice(0, weiStrLength).padEnd(weiStrLength, '0');
  return BigNumber.from(weiStr);
}

export function tokenChangeDecimals(
  tokenWei: BigNumber,
  currDecimals: number,
  targetDecimals: number = 18
) {
  const tokenWeiStr = tokenWei.toString();
  if (currDecimals < targetDecimals) {
    const zeroes = '0'.repeat(targetDecimals - currDecimals);
    return BigNumber.from(tokenWeiStr + zeroes);
  } else if (currDecimals > targetDecimals) {
    return BigNumber.from(tokenWeiStr.slice(0, targetDecimals - currDecimals));
  } else {
    return BigNumber.from(tokenWei.toString());
  }
}

export async function getProviderAndSigner(
  keystorePath: string,
  rpcUrl: string
) {
  const provider = new providers.JsonRpcProvider(rpcUrl);
  const signer = await Utils.addAccountFromKeystore(keystorePath, provider);

  return { provider, signer };
}

export async function arrayFromAsync<T>(
  gen: AsyncGenerator<T>
): Promise<Array<T>> {
  const result: Array<T> = [];
  for await (const elem of gen) {
    result.push(elem);
  }
  return result;
}

export default Utils = {
  addAccountFromKeystore,
  getProviderAndSigner,
  askPassword,
}