import { ethers } from 'ethers';
import { BigNumber } from 'ethers';
// Had to modify ABI to resolve:
// duplicate definition - ETHTransferFailed()
// duplicate definition - InvalidMsgValue()
import genericRouterABI from './abis/1inch-genericrouter.abi.json';

export interface SwapDescription {
  sourceToken: string;
  destinationToken: string
  sourceReceiver: string;
  destinationReceiver: string;
  amount: BigNumber;
  minReturnAmount: BigNumber;
  flags: BigNumber;
}

export interface SwapCalldata {
  aggregationExecutor: string;
  swapDescription: SwapDescription;
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