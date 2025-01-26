import { BigNumber, providers, Wallet } from 'ethers'
import { promises as fs } from 'fs'
import { password } from '@inquirer/prompts'
// import { getMulticall } from 'ethcall'

async function addAccountFromKeystore(
  keystorePath: string,
  provider: providers.JsonRpcProvider
): Promise<Wallet> {
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
    return undefined
  }
}

// Monkeypatch ethcall's multicall for chains unsupported by the ethcall compatible with AjnaSDK
export async function configureMulticall(provider: providers.JsonRpcProvider, chainConfig) {
  if ('multicallAddress' in chainConfig && 'multicallBlock' in chainConfig) {
    const chainId = (await provider.getNetwork()).chainId
    console.log('forcing multicall for chain', chainId, 'to', chainConfig.multicallAddress)
    const forceMulticall = (chainId: number) => {
      return {
        address: chainConfig.multicallAddress,
        block: chainConfig.multicallBlock,
      }
    }
    // FIXME: can't monkeypatch because the ethcall provider is not exported
    // ???getMulticall = forceMulticall
  }
}

export async function delay(seconds: number) {
  return new Promise(res => setTimeout(res, seconds * 1000))
}

export function priceToNumber(price: BigNumber) {
  return price.div(1e12).toNumber() / 1e6
}

export async function getProviderAndSigner(keystorePath: string, rpcUrl: string) {
  const provider = new providers.JsonRpcProvider(rpcUrl)
  const signer = await addAccountFromKeystore(keystorePath, provider)

  return { provider, signer }
}
