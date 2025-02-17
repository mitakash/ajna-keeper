import { abi as NonfungiblePositionManagerABI } from '@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json';
import { FeeAmount } from '@uniswap/v3-sdk';
import { BigNumber, Contract, ethers, Signer } from 'ethers';
import { getProvider } from './test-utils';

type AddLiquidityParams = {
  signer: Signer;
  tokenA: Contract;
  tokenB: Contract;
  amountA: BigNumber;
  amountB: BigNumber;
  fee: FeeAmount;
};

export async function addLiquidity({
  signer,
  tokenA,
  tokenB,
  amountA,
  amountB,
  fee,
}: AddLiquidityParams): Promise<number> {
  const POSITION_MANAGER_ADDRESS = '0xC36442b4a4522E871399CD717aBDD847Ab11FE88';
  const positionManager = new Contract(
    POSITION_MANAGER_ADDRESS,
    NonfungiblePositionManagerABI,
    signer
  );
  const provider = getProvider();

  const currentBlock = await provider.getBlock('latest');
  const currentBlockTimestamp = currentBlock.timestamp;

  const address = await signer.getAddress();

  const tx = await positionManager.mint(
    {
      token0: tokenA.address,
      token1: tokenB.address,
      fee,
      tickLower: -887220,
      tickUpper: 887220,
      amount0Desired: amountA,
      amount1Desired: amountB,
      amount0Min: ethers.utils.parseUnits('0.1', 8),
      amount1Min: ethers.utils.parseUnits('1', 18),
      recipient: address,
      deadline: currentBlockTimestamp + 60 * 60 * 60,
    },
    { gasLimit: 10000000 }
  );
  const receipt = await tx.wait();
  return receipt.status;
}
