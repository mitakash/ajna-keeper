import { providers } from 'ethers';
import { HARDHAT_RPC_URL, MAINNET_CONFIG } from './test-config';
import { delay } from '../utils';
import '@nomiclabs/hardhat-ethers';

const POSITION_MANAGER_ADDRESS = '0xC36442b4a4522E871399CD717aBDD847Ab11FE88'; // Uniswap V3 NonfungiblePositionManager
export const getProvider = () => new providers.JsonRpcProvider(HARDHAT_RPC_URL);

export const resetHardhat = () =>
  getProvider().send('hardhat_reset', [
    {
      forking: {
        jsonRpcUrl: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
        blockNumber: MAINNET_CONFIG.BLOCK_NUMBER,
      },
    },
  ]);

export const setBalance = (address: string, balance: string) =>
  getProvider().send('hardhat_setBalance', [address, balance]);

export const getBalance = (address: string) =>
  getProvider().send('eth_getBalance', [address]);

export const impersonateAccount = (address: string) =>
  getProvider().send('hardhat_impersonateAccount', [address]);

export const impersonateSigner = async (address: string) => {
  await impersonateAccount(address);
  const provider = getProvider();
  return provider.getSigner(address);
};

export const mine = () => getProvider().send('evm_mine', []);

export const latestBlockTimestamp = async () => {
  const latestBlock = await getProvider().send('eth_getBlockByNumber', [
    'latest',
    false,
  ]);
  return parseInt(latestBlock.timestamp, 16);
};

export const increaseTime = async (seconds: number) => {
  const provider = getProvider();
  const currTimestamp = await latestBlockTimestamp();
  const nextTimestamp = (currTimestamp + seconds).toString();
  await getProvider().send('evm_setNextBlockTimestamp', [nextTimestamp]);
  await mine();
  return await latestBlockTimestamp();
};

export const waitForConditionToBeTrue = async (
  fn: () => Promise<boolean>,
  pollingTime: number = 0.2
) => {
  while (!(await fn())) {
    await delay(pollingTime);
  }
};
