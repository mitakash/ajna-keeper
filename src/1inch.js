"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.convertSwapApiResponseToDetailsBytes = exports.convertSwapApiResponseToDetails = exports.decodeSwapCalldata = void 0;
var ethers_1 = require("ethers");
// Had to modify ABI plucked from Etherscan to resolve:
// duplicate definition - ETHTransferFailed()
// duplicate definition - InvalidMsgValue()
var _1inch_genericrouter_abi_json_1 = __importDefault(require("./abis/1inch-genericrouter.abi.json"));
function decodeSwapCalldata(apiResponse) {
    console.log('API response:', apiResponse);
    var routerInterface = new ethers_1.ethers.utils.Interface(_1inch_genericrouter_abi_json_1.default);
    var decoded = routerInterface.decodeFunctionData('swap', apiResponse.data);
    return {
        aggregationExecutor: decoded.executor,
        swapDescription: decoded.desc,
        encodedCalls: decoded.data,
    };
}
exports.decodeSwapCalldata = decodeSwapCalldata;
function convertSwapApiResponseToDetails(apiResponse) {
    var swapCalldata = decodeSwapCalldata(apiResponse);
    console.log('Decoded swap calldata:', swapCalldata);
    return {
        aggregationExecutor: swapCalldata.aggregationExecutor,
        swapDescription: swapCalldata.swapDescription,
        opaqueData: swapCalldata.encodedCalls,
    };
}
exports.convertSwapApiResponseToDetails = convertSwapApiResponseToDetails;
function convertSwapApiResponseToDetailsBytes(apiResponse) {
    var details = convertSwapApiResponseToDetails(apiResponse);
    console.log('Details:', details);
    return ethers_1.ethers.utils.defaultAbiCoder.encode(['(address,(address,address,address,address,uint256,uint256,uint256),bytes)'], [Object.values(details)]);
}
exports.convertSwapApiResponseToDetailsBytes = convertSwapApiResponseToDetailsBytes;
//# sourceMappingURL=1inch.js.map