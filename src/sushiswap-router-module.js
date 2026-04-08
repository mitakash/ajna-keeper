"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swapWithSushiswapRouter = void 0;
// src/sushiswap-router-module.ts
// Based on working production patterns from test-sushiswap-bypass-quoter.ts
var ethers_1 = require("ethers");
var logging_1 = require("./logging");
var nonce_1 = require("./nonce");
var utils_1 = require("./utils");
var uniswap_1 = require("./uniswap");
// ABIs - Based on working production test file
var ERC20_ABI = [
    'function allowance(address,address) view returns (uint256)',
    'function approve(address,uint256) returns (bool)',
    'function balanceOf(address) view returns (uint256)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)'
];
// USING: Working production ABIs
var SUSHI_ROUTER_ABI = [
    'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)',
    'function WETH9() external view returns (address)',
    'function factory() external view returns (address)'
];
var SUSHI_FACTORY_ABI = [
    'function getPool(address tokenA, address tokenB, uint24 fee) external view returns (address pool)'
];
/**
 * FIXED: Function name to match dex-router.ts import
 * ADDED: Factory address parameter (from production code)
 * REMOVED: Quoter logic (production code bypasses quoter)
 *
 * Swaps tokens using SushiSwap V3 Router - Direct swap approach
 * Based on proven working patterns from test-sushiswap-bypass-quoter.ts
 */
function swapWithSushiswapRouter(signer, tokenAddress, amount, targetTokenAddress, slippagePercentage, // dex-router passes percentage, not basis points
swapRouterAddress, quoterV2Address, // for interface compatibility but not used
feeTier, factoryAddress // Factory address from config
) {
    return __awaiter(this, void 0, void 0, function () {
        var provider, network, chainId, signerAddress, tokenToSwap, targetToken, tokenContract, routerContract, factoryContract, poolAddress, slippageBasisPoints, conservativeOutputRatio, minAmountOut, currentAllowance, deadline, swapParams_1, gasPrice, highGasPrice_1, receipt, error_1;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // VALIDATION: Same as current, but added factory validation
                    if (!swapRouterAddress) {
                        throw new Error('SushiSwap Router address must be provided via configuration');
                    }
                    if (!feeTier) {
                        throw new Error('Fee tier must be provided via configuration');
                    }
                    if (slippagePercentage === undefined) {
                        throw new Error('Slippage must be provided via configuration');
                    }
                    if (!signer || !tokenAddress || !amount) {
                        throw new Error('Invalid parameters provided to swap');
                    }
                    provider = signer.provider;
                    if (!provider) {
                        throw new Error('No provider available, skipping swap');
                    }
                    return [4 /*yield*/, provider.getNetwork()];
                case 1:
                    network = _a.sent();
                    chainId = network.chainId;
                    return [4 /*yield*/, signer.getAddress()];
                case 2:
                    signerAddress = _a.sent();
                    logging_1.logger.info("Chain ID: ".concat(chainId, ", Signer: ").concat(signerAddress));
                    logging_1.logger.info("Using SushiSwap Router at: ".concat(swapRouterAddress));
                    return [4 /*yield*/, (0, uniswap_1.getTokenFromAddress)(chainId, provider, tokenAddress)];
                case 3:
                    tokenToSwap = _a.sent();
                    return [4 /*yield*/, (0, uniswap_1.getTokenFromAddress)(chainId, provider, targetTokenAddress)];
                case 4:
                    targetToken = _a.sent();
                    if (tokenToSwap.address.toLowerCase() === targetToken.address.toLowerCase()) {
                        logging_1.logger.info('Tokens are identical, no swap necessary');
                        return [2 /*return*/, { success: true }];
                    }
                    tokenContract = new ethers_1.Contract(tokenAddress, ERC20_ABI, signer);
                    routerContract = new ethers_1.Contract(swapRouterAddress, SUSHI_ROUTER_ABI, signer);
                    // Factory check from production code
                    //const SUSHI_FACTORY = '0xCdBCd51a5E8728E0AF4895ce5771b7d17fF71959'; // Hemi factory address
                    // NEW: Uses config value with validation
                    if (!factoryAddress) {
                        throw new Error('SushiSwap factory address must be provided via configuration');
                    }
                    factoryContract = new ethers_1.Contract(factoryAddress, SUSHI_FACTORY_ABI, provider);
                    _a.label = 5;
                case 5:
                    _a.trys.push([5, 13, , 14]);
                    return [4 /*yield*/, factoryContract.getPool(tokenAddress, targetTokenAddress, feeTier)];
                case 6:
                    poolAddress = _a.sent();
                    if (poolAddress === '0x0000000000000000000000000000000000000000') {
                        throw new Error("No SushiSwap pool exists for ".concat(tokenToSwap.symbol, "/").concat(targetToken.symbol, " with fee ").concat(feeTier));
                    }
                    logging_1.logger.info("Found SushiSwap pool at ".concat(poolAddress, " for ").concat(tokenToSwap.symbol, "/").concat(targetToken.symbol));
                    slippageBasisPoints = slippagePercentage * 100;
                    conservativeOutputRatio = (10000 - slippageBasisPoints) / 10000;
                    minAmountOut = amount.mul(Math.floor(conservativeOutputRatio * 10000)).div(10000);
                    logging_1.logger.info("Input amount: ".concat((0, utils_1.weiToDecimaled)(amount, tokenToSwap.decimals), " ").concat(tokenToSwap.symbol));
                    logging_1.logger.info("Minimum output with ".concat(slippagePercentage, "% slippage: ").concat((0, utils_1.weiToDecimaled)(minAmountOut, targetToken.decimals), " ").concat(targetToken.symbol, " (conservative estimate)"));
                    return [4 /*yield*/, tokenContract.allowance(signerAddress, swapRouterAddress)];
                case 7:
                    currentAllowance = _a.sent();
                    logging_1.logger.info("Current SushiSwap router allowance: ".concat((0, utils_1.weiToDecimaled)(currentAllowance, tokenToSwap.decimals), " ").concat(tokenToSwap.symbol));
                    if (!currentAllowance.lt(amount)) return [3 /*break*/, 9];
                    logging_1.logger.info("Approving SushiSwap router to spend ".concat(tokenToSwap.symbol));
                    return [4 /*yield*/, nonce_1.NonceTracker.queueTransaction(signer, function (nonce) { return __awaiter(_this, void 0, void 0, function () {
                            var approveTx, receipt;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, tokenContract.approve(swapRouterAddress, ethers_1.ethers.constants.MaxUint256, { nonce: nonce })];
                                    case 1:
                                        approveTx = _a.sent();
                                        logging_1.logger.info("SushiSwap approval transaction sent: ".concat(approveTx.hash));
                                        return [4 /*yield*/, approveTx.wait()];
                                    case 2:
                                        receipt = _a.sent();
                                        logging_1.logger.info("SushiSwap approval confirmed!");
                                        return [2 /*return*/, receipt];
                                }
                            });
                        }); })];
                case 8:
                    _a.sent();
                    return [3 /*break*/, 10];
                case 9:
                    logging_1.logger.info("SushiSwap router already has sufficient allowance for ".concat(tokenToSwap.symbol));
                    _a.label = 10;
                case 10:
                    deadline = Math.floor(Date.now() / 1000) + 1800;
                    swapParams_1 = {
                        tokenIn: tokenAddress,
                        tokenOut: targetTokenAddress,
                        fee: feeTier,
                        recipient: signerAddress,
                        deadline: deadline,
                        amountIn: amount,
                        amountOutMinimum: minAmountOut,
                        sqrtPriceLimitX96: 0 // No price limit
                    };
                    logging_1.logger.debug('SushiSwap swap parameters:');
                    logging_1.logger.debug("   tokenIn: ".concat(swapParams_1.tokenIn));
                    logging_1.logger.debug("   tokenOut: ".concat(swapParams_1.tokenOut));
                    logging_1.logger.debug("   fee: ".concat(swapParams_1.fee));
                    logging_1.logger.debug("   amountIn: ".concat((0, utils_1.weiToDecimaled)(swapParams_1.amountIn, tokenToSwap.decimals)));
                    logging_1.logger.debug("   amountOutMinimum: ".concat((0, utils_1.weiToDecimaled)(swapParams_1.amountOutMinimum, targetToken.decimals)));
                    logging_1.logger.debug("   deadline: ".concat(new Date(swapParams_1.deadline * 1000).toLocaleString()));
                    return [4 /*yield*/, provider.getGasPrice()];
                case 11:
                    gasPrice = _a.sent();
                    highGasPrice_1 = gasPrice.mul(115).div(100);
                    logging_1.logger.info("Using gas price: ".concat(ethers_1.ethers.utils.formatUnits(highGasPrice_1, 'gwei'), " gwei (15% higher than current)"));
                    return [4 /*yield*/, nonce_1.NonceTracker.queueTransaction(signer, function (nonce) { return __awaiter(_this, void 0, void 0, function () {
                            var swapTx, timeoutPromise;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, routerContract.exactInputSingle(swapParams_1, {
                                            nonce: nonce,
                                            gasLimit: 800000,
                                            gasPrice: highGasPrice_1
                                        })];
                                    case 1:
                                        swapTx = _a.sent();
                                        logging_1.logger.info("SushiSwap transaction sent: ".concat(swapTx.hash));
                                        logging_1.logger.info("Waiting for transaction confirmation...");
                                        timeoutPromise = new Promise(function (_, reject) {
                                            return setTimeout(function () { return reject(new Error("Transaction confirmation timeout after 2 minutes")); }, 120000);
                                        });
                                        return [4 /*yield*/, Promise.race([
                                                swapTx.wait(),
                                                timeoutPromise
                                            ])];
                                    case 2: 
                                    // Race between confirmation and timeout
                                    return [2 /*return*/, _a.sent()];
                                }
                            });
                        }); })];
                case 12:
                    receipt = _a.sent();
                    logging_1.logger.info("Transaction confirmed: ".concat(receipt.transactionHash));
                    logging_1.logger.info("Gas used: ".concat(receipt.gasUsed.toString()));
                    logging_1.logger.info("SushiSwap swap successful for token: ".concat(tokenToSwap.symbol, ", amount: ").concat((0, utils_1.weiToDecimaled)(amount, tokenToSwap.decimals), " to ").concat(targetToken.symbol));
                    return [2 /*return*/, { success: true, receipt: receipt }];
                case 13:
                    error_1 = _a.sent();
                    logging_1.logger.error("SushiSwap swap failed for token: ".concat(tokenAddress, ": ").concat(error_1));
                    return [2 /*return*/, { success: false, error: error_1.toString() }];
                case 14: return [2 /*return*/];
            }
        });
    });
}
exports.swapWithSushiswapRouter = swapWithSushiswapRouter;
//# sourceMappingURL=sushiswap-router-module.js.map