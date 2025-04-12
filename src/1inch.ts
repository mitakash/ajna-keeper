import { ethers } from 'ethers';
import { BigNumber } from 'ethers';
// Had to modify ABI plucked from Etherscan to resolve:
// duplicate definition - ETHTransferFailed()
// duplicate definition - InvalidMsgValue()
import genericRouterABI from './abis/1inch-genericrouter.abi.json';
import { SwapDescriptionStructOutput } from '../typechain-types/contracts/AjnaKeeperTaker';

export interface SwapCalldata {
  aggregationExecutor: string;
  swapDescription: SwapDescriptionStructOutput;
  encodedCalls: string;
}

export function decodeSwapCalldata(apiResponse: any): SwapCalldata {
  const routerInterface = new ethers.utils.Interface(genericRouterABI)
  const decoded = routerInterface.decodeFunctionData('swap', apiResponse.data)
  return {
    aggregationExecutor: decoded.executor,
    swapDescription: decoded.desc,
    encodedCalls: decoded.data,
  };
}