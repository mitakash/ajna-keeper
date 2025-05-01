import { ethers } from 'ethers';
import { BigNumber } from 'ethers';
// Had to modify ABI plucked from Etherscan to resolve:
// duplicate definition - ETHTransferFailed()
// duplicate definition - InvalidMsgValue()
import genericRouterABI from './abis/1inch-genericrouter.abi.json';
import { AjnaKeeperTaker, SwapDescriptionStructOutput } from '../typechain-types/contracts/AjnaKeeperTaker';

export interface SwapCalldata {
  aggregationExecutor: string;
  swapDescription: SwapDescriptionStructOutput;
  encodedCalls: string;
}

function decodeSwapCalldata(apiResponse: any): SwapCalldata {
  console.log('API response:', apiResponse);
  const routerInterface = new ethers.utils.Interface(genericRouterABI);
  const decoded = routerInterface.decodeFunctionData('swap', apiResponse.data)
  return {
    aggregationExecutor: decoded.executor,
    swapDescription: decoded.desc,
    encodedCalls: decoded.data,
  };
}

function convertSwapApiResponseToDetails(
  apiResponse: any,
): AjnaKeeperTaker.OneInchSwapDetailsStruct {
  const swapCalldata: SwapCalldata = decodeSwapCalldata(apiResponse);
  console.log('Decoded swap calldata:', swapCalldata);
  return {
    aggregationExecutor: swapCalldata.aggregationExecutor,
    swapDescription: swapCalldata.swapDescription,
    opaqueData: swapCalldata.encodedCalls,
  };
}

export function convertSwapApiResponseToDetailsBytes(
  apiResponse: any,
): string {
  const details = convertSwapApiResponseToDetails(apiResponse);
  console.log('Details:', details);
  return ethers.utils.defaultAbiCoder.encode(
    ['(address,(address,address,address,address,uint256,uint256,uint256),bytes)'],
    [Object.values(details)],
  );
}
