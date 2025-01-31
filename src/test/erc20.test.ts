import { providers, Wallet, Contract, BigNumber } from 'ethers';
import {Signer} from '@ajna-finance/sdk';
// import { approveErc20 } from '../erc20';
import { bigNumberToWad } from '../utils';
import { approveErc20 } from '../erc20';
import { resetHardhat, getImpersonatedSigner, setBalance } from './test-utils';
import {LOCAL_MAIN_NET_CONFIG} from './test-config';
import {expect} from 'chai';

const WETH_WHALE_ADDRESS = '0xf04a5cc80b1e94c69b48f5ee68a08cd2f09a7c3e';
const WETH_ABI = [
// From https://etherscan.io/token/0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2#code
  {"constant":true,"inputs":[{"name":"","type":"address"},{"name":"","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},
]

export async function getErc20Allowance(
  signer: Signer,
  tokenAddress: string,
  owner: string,
  spender: string,
): Promise<BigNumber> {
  const contract = new Contract(tokenAddress, WETH_ABI, signer);
  return await contract.allowance(owner, spender)
}

describe.only('approverErc20', () => {
  let provider: providers.JsonRpcProvider;

  before(async () => {
    await resetHardhat();
  });

  it('Can approve ERC20 transfer', async () => {
    const receiver = Wallet.fromMnemonic(LOCAL_MAIN_NET_CONFIG.USER1_MNEMONIC);
    const signer = await getImpersonatedSigner(WETH_WHALE_ADDRESS);
    await setBalance(WETH_WHALE_ADDRESS, '0x10000000000000');
    await approveErc20(signer, LOCAL_MAIN_NET_CONFIG.WSTETH_WETH_POOL.quoteTokenAddress, receiver.address, BigNumber.from("1000000000"));
    const allowance = await getErc20Allowance(signer, LOCAL_MAIN_NET_CONFIG.WSTETH_WETH_POOL.quoteTokenAddress, WETH_WHALE_ADDRESS, receiver.address);
    console.log("allowance:", allowance.toString())
    expect(allowance.eq(BigNumber.from("1000000000"))).to.be.true;
  });
});