import { BigNumber, providers, Wallet } from 'ethers'
import { promises as fs } from 'fs'
import { password } from '@inquirer/prompts'
import { FungiblePool } from '@ajna-finance/sdk'
import { KeeperConfig } from './config'

async function addAccountFromKeystore(
  keystorePath: string,
  provider: providers.JsonRpcProvider
): Promise<Wallet> {
  // TODO: connect actual wallet.
  let wallet = Wallet.createRandom()
  return wallet.connect(provider)

  // read the keystore file, confirming it exists
  const jsonKeystore = (await fs.readFile(keystorePath)).toString()

  const pswd = await password({
    message: 'Please enter your keystore password',
    mask: '*',
  })

  try {
    let wallet = Wallet.fromEncryptedJsonSync(jsonKeystore, pswd)
    return wallet.connect(provider)
  } catch (error) {
    console.error('Error decrypting keystore:', error)
    console.error('This keeper will not create transactions')
  }
}

export function overrideMulticall(fungiblePool: FungiblePool, chainConfig: KeeperConfig): void {
  if (chainConfig?.multicallAddress && chainConfig?.multicallBlock != undefined) {
    fungiblePool.ethcallProvider.multicall3 = {
      address: chainConfig.multicallAddress,
      block: chainConfig.multicallBlock
    }
  }
}

export async function delay(seconds: number) {
  return new Promise(res => setTimeout(res, seconds * 1000));
}

export function bigNumberToWad(price: BigNumber): number {
  return price.div(1e12).toNumber() / 1e6;
}

export function wadToBigNumber(price: number): BigNumber {
  return BigNumber.from(price * 1e6).mul(1e12);
}

export async function getProviderAndSigner(keystorePath: string, rpcUrl: string) {
  const provider = new providers.JsonRpcProvider(rpcUrl);
  const signer = await addAccountFromKeystore(keystorePath, provider);

  return { provider, signer };
}