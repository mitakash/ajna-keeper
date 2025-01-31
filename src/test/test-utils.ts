import { providers } from 'ethers';
import { HARDHAT_RPC_URL } from './test-config';

export const getProvider = () => (new providers.JsonRpcProvider(HARDHAT_RPC_URL));

export const resetHardhat = () => (getProvider().send('hardhat_reset', [{
      forking: {
        jsonRpcUrl: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
        blockNumber: 21731352
      },
    }],
  ));

export const setBalance = (address: string, balance: string) => (getProvider().send('hardhat_setBalance', [address, balance]));

export const getBalance = (address: string) => (getProvider().send('eth_getBalance', [address]));

export const impersonateAccount = (address: string) => (getProvider().send('hardhat_impersonateAccount', [address]));

export const getImpersonatedSigner = async (address: string) => {
  await impersonateAccount(address);
  const provider = getProvider();
  return provider.getSigner(address);
}