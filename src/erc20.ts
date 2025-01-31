import { Signer } from "@ajna-finance/sdk";
import { BigNumber, Contract, ContractReceipt, ContractTransaction, providers } from 'ethers';

export const ERC20_ABI = [
    'function name() public view returns (string)',
    'function symbol() public view returns (string)',
    'function decimals() public view returns (uint8)',
    'function totalSupply() public view returns (uint256)',
    'function balanceOf(address _owner) public view returns (uint256 balance)',
    'function transfer(address _to, uint256 _value) public returns (bool success)',
    'function transferFrom(address _from, address _to, uint256 _value) public returns (bool success)',
    'function approve(address _spender, uint256 _value) public returns (bool success)',
    'function allowance(address _owner, address _spender) public view returns (uint256 remaining)',
];

export async function approveErc20(
    signer: Signer,
    tokenAddress: string,
    spenderAddress: string,
    amount: BigNumber,
): Promise<ContractReceipt> {
    console.log(`Approving funds transfer token address:${tokenAddress} spender address:${spenderAddress} amount:${amount}`)
    const contract = new Contract(tokenAddress, ERC20_ABI, signer);
    const contractTx: ContractTransaction = await contract.approve(spenderAddress, amount);
    return await contractTx.wait();
}