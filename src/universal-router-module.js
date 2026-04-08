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
exports.swapWithUniversalRouter = void 0;
// src/universal-router-module.ts
// FIXED: Now mirrors working SushiSwap patterns for decimal handling and conservative approach
var ethers_1 = require("ethers");
var logging_1 = require("./logging");
var nonce_1 = require("./nonce");
var utils_1 = require("./utils");
var uniswap_1 = require("./uniswap");
var erc20_1 = require("./erc20");
// ABIs
var ERC20_ABI = [
    'function allowance(address,address) view returns (uint256)',
    'function approve(address,uint256) returns (bool)',
    'function balanceOf(address) view returns (uint256)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)'
];
var PERMIT2_ABI = [
    'function approve(address token, address spender, uint160 amount, uint48 expiration)',
    'function allowance(address token, address owner, address spender) view returns (uint160 amount, uint48 expiration, uint48 nonce)'
];
var UNIVERSAL_ROUTER_ABI = [
    'function execute(bytes commands, bytes[] inputs, uint256 deadline) payable'
];
var POOL_FACTORY_ABI = [
    'function getPool(address tokenA, address tokenB, uint24 fee) view returns (address pool)'
];
// Command constants
var V3_SWAP_EXACT_IN = '0x00';
/**
 * FIXED: Swaps tokens using Uniswap's Universal Router with proper decimal handling
 * Now mirrors the working SushiSwap patterns for conservative operation
 */
function swapWithUniversalRouter(signer, tokenAddress, amount, targetTokenAddress, slippageBasisPoints, universalRouterAddress, permit2Address, feeTier, poolFactoryAddress) {
    return __awaiter(this, void 0, void 0, function () {
        var provider, network, chainId, signerAddress, tokenToSwap, targetToken, inputDecimals, outputDecimals, tokenContract, permit2Contract, universalRouter, factoryContract, poolAddress, permit2Allowance, _a, routerAllowance, expiration, newExpiration_1, conservativeOutputRatio, amountOutMin, commands_1, path, inputs_1, deadline_1, gasPrice, highGasPrice_1, receipt, error_1;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    // VALIDATION: Same as SushiSwap with additional factory validation
                    if (!universalRouterAddress) {
                        throw new Error('Universal Router address must be provided via configuration');
                    }
                    if (!feeTier) {
                        throw new Error('Fee tier must be provided via configuration');
                    }
                    if (slippageBasisPoints === undefined) {
                        throw new Error('Slippage must be provided via configuration');
                    }
                    if (!permit2Address) {
                        throw new Error('Permit2 address must be provided via configuration');
                    }
                    if (!signer || !tokenAddress || !amount) {
                        throw new Error('Invalid parameters provided to swap');
                    }
                    if (!poolFactoryAddress) {
                        throw new Error('poolFactoryAddress must be provided via configuration');
                    }
                    provider = signer.provider;
                    if (!provider) {
                        throw new Error('No provider available, skipping swap');
                    }
                    return [4 /*yield*/, provider.getNetwork()];
                case 1:
                    network = _b.sent();
                    chainId = network.chainId;
                    return [4 /*yield*/, signer.getAddress()];
                case 2:
                    signerAddress = _b.sent();
                    logging_1.logger.info("Chain ID: ".concat(chainId, ", Signer: ").concat(signerAddress));
                    logging_1.logger.info("Using Universal Router at: ".concat(universalRouterAddress));
                    return [4 /*yield*/, (0, uniswap_1.getTokenFromAddress)(chainId, provider, tokenAddress)];
                case 3:
                    tokenToSwap = _b.sent();
                    return [4 /*yield*/, (0, uniswap_1.getTokenFromAddress)(chainId, provider, targetTokenAddress)];
                case 4:
                    targetToken = _b.sent();
                    if (tokenToSwap.address.toLowerCase() === targetToken.address.toLowerCase()) {
                        logging_1.logger.info('Tokens are identical, no swap necessary');
                        return [2 /*return*/, { success: true }];
                    }
                    return [4 /*yield*/, (0, erc20_1.getDecimalsErc20)(signer, tokenAddress)];
                case 5:
                    inputDecimals = _b.sent();
                    return [4 /*yield*/, (0, erc20_1.getDecimalsErc20)(signer, targetTokenAddress)];
                case 6:
                    outputDecimals = _b.sent();
                    logging_1.logger.debug("Token decimals: ".concat(tokenToSwap.symbol, "=").concat(inputDecimals, ", ").concat(targetToken.symbol, "=").concat(outputDecimals));
                    tokenContract = new ethers_1.Contract(tokenAddress, ERC20_ABI, signer);
                    permit2Contract = new ethers_1.Contract(permit2Address, PERMIT2_ABI, signer);
                    universalRouter = new ethers_1.Contract(universalRouterAddress, UNIVERSAL_ROUTER_ABI, signer);
                    factoryContract = new ethers_1.Contract(poolFactoryAddress, POOL_FACTORY_ABI, provider);
                    _b.label = 7;
                case 7:
                    _b.trys.push([7, 19, , 20]);
                    return [4 /*yield*/, factoryContract.getPool(tokenAddress, targetTokenAddress, feeTier)];
                case 8:
                    poolAddress = _b.sent();
                    if (poolAddress === '0x0000000000000000000000000000000000000000') {
                        logging_1.logger.warn("No direct Uniswap pool exists for ".concat(tokenToSwap.symbol, "/").concat(targetToken.symbol, " with fee ").concat(feeTier));
                        // Continue anyway as Universal Router may find a path through other pools
                    }
                    else {
                        logging_1.logger.info("Found Uniswap pool at ".concat(poolAddress, " for ").concat(tokenToSwap.symbol, "/").concat(targetToken.symbol));
                    }
                    return [4 /*yield*/, tokenContract.allowance(signerAddress, permit2Address)];
                case 9:
                    permit2Allowance = _b.sent();
                    logging_1.logger.info("Current Permit2 allowance: ".concat((0, utils_1.weiToDecimaled)(permit2Allowance, inputDecimals), " ").concat(tokenToSwap.symbol));
                    if (!permit2Allowance.lt(amount)) return [3 /*break*/, 11];
                    logging_1.logger.info("Approving Permit2 to spend ".concat(tokenToSwap.symbol));
                    return [4 /*yield*/, nonce_1.NonceTracker.queueTransaction(signer, function (nonce) { return __awaiter(_this, void 0, void 0, function () {
                            var approveTx, receipt;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, tokenContract.approve(permit2Address, ethers_1.ethers.constants.MaxUint256, { nonce: nonce })];
                                    case 1:
                                        approveTx = _a.sent();
                                        logging_1.logger.info("Permit2 approval transaction sent: ".concat(approveTx.hash));
                                        return [4 /*yield*/, approveTx.wait()];
                                    case 2:
                                        receipt = _a.sent();
                                        logging_1.logger.info("Permit2 approval confirmed!");
                                        return [2 /*return*/, receipt];
                                }
                            });
                        }); })];
                case 10:
                    _b.sent();
                    return [3 /*break*/, 12];
                case 11:
                    logging_1.logger.info("Permit2 already has sufficient allowance for ".concat(tokenToSwap.symbol));
                    _b.label = 12;
                case 12: return [4 /*yield*/, permit2Contract.allowance(tokenAddress, signerAddress, universalRouterAddress)];
                case 13:
                    _a = _b.sent(), routerAllowance = _a.amount, expiration = _a.expiration;
                    logging_1.logger.info("Current Universal Router allowance via Permit2: ".concat((0, utils_1.weiToDecimaled)(routerAllowance, inputDecimals), " ").concat(tokenToSwap.symbol, " (expires: ").concat(new Date(expiration * 1000).toLocaleString(), ")"));
                    if (!(routerAllowance.lt(amount) || expiration <= Math.floor(Date.now() / 1000))) return [3 /*break*/, 15];
                    logging_1.logger.info("Approving Universal Router via Permit2 for ".concat(tokenToSwap.symbol));
                    newExpiration_1 = Math.floor(Date.now() / 1000) + 86400;
                    return [4 /*yield*/, nonce_1.NonceTracker.queueTransaction(signer, function (nonce) { return __awaiter(_this, void 0, void 0, function () {
                            var permit2Tx, receipt;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, permit2Contract.approve(tokenAddress, universalRouterAddress, amount, newExpiration_1, { nonce: nonce })];
                                    case 1:
                                        permit2Tx = _a.sent();
                                        logging_1.logger.info("Universal Router approval transaction sent: ".concat(permit2Tx.hash));
                                        return [4 /*yield*/, permit2Tx.wait()];
                                    case 2:
                                        receipt = _a.sent();
                                        logging_1.logger.info("Universal Router approval confirmed!");
                                        return [2 /*return*/, receipt];
                                }
                            });
                        }); })];
                case 14:
                    _b.sent();
                    return [3 /*break*/, 16];
                case 15:
                    logging_1.logger.info("Universal Router already has sufficient allowance via Permit2 for ".concat(tokenToSwap.symbol));
                    _b.label = 16;
                case 16:
                    conservativeOutputRatio = (10000 - slippageBasisPoints) / 10000;
                    amountOutMin = amount.mul(Math.floor(conservativeOutputRatio * 10000)).div(10000);
                    logging_1.logger.info("Input amount: ".concat((0, utils_1.weiToDecimaled)(amount, inputDecimals), " ").concat(tokenToSwap.symbol));
                    logging_1.logger.info("Minimum output with ".concat(slippageBasisPoints / 100, "% slippage: ").concat((0, utils_1.weiToDecimaled)(amountOutMin, outputDecimals), " ").concat(targetToken.symbol, " (conservative estimate)"));
                    // STEP 5: Prepare the swap command (same as current)
                    logging_1.logger.debug("Swapping token: ".concat(tokenToSwap.symbol, ", amount: ").concat((0, utils_1.weiToDecimaled)(amount, inputDecimals), " to ").concat(targetToken.symbol));
                    commands_1 = V3_SWAP_EXACT_IN;
                    path = ethers_1.ethers.utils.solidityPack(['address', 'uint24', 'address'], [tokenAddress, feeTier, targetTokenAddress]);
                    inputs_1 = [
                        ethers_1.ethers.utils.defaultAbiCoder.encode(['address', 'uint256', 'uint256', 'bytes', 'bool'], [signerAddress, amount, amountOutMin, path, true] // true means tokens come from msg.sender via Permit2
                        )
                    ];
                    deadline_1 = Math.floor(Date.now() / 1000) + 1800;
                    return [4 /*yield*/, provider.getGasPrice()];
                case 17:
                    gasPrice = _b.sent();
                    highGasPrice_1 = gasPrice.mul(115).div(100);
                    logging_1.logger.info("Using gas price: ".concat(ethers_1.ethers.utils.formatUnits(highGasPrice_1, 'gwei'), " gwei (15% higher than current)"));
                    return [4 /*yield*/, nonce_1.NonceTracker.queueTransaction(signer, function (nonce) { return __awaiter(_this, void 0, void 0, function () {
                            var swapTx, timeoutPromise;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, universalRouter.execute(commands_1, inputs_1, deadline_1, {
                                            nonce: nonce,
                                            gasLimit: 1000000,
                                            gasPrice: highGasPrice_1
                                        })];
                                    case 1:
                                        swapTx = _a.sent();
                                        logging_1.logger.info("Uniswap swap transaction sent: ".concat(swapTx.hash));
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
                case 18:
                    receipt = _b.sent();
                    logging_1.logger.info("Transaction confirmed: ".concat(receipt.transactionHash));
                    logging_1.logger.info("Gas used: ".concat(receipt.gasUsed.toString()));
                    logging_1.logger.info("Uniswap swap successful for token: ".concat(tokenToSwap.symbol, ", amount: ").concat((0, utils_1.weiToDecimaled)(amount, inputDecimals), " to ").concat(targetToken.symbol));
                    return [2 /*return*/, { success: true, receipt: receipt }];
                case 19:
                    error_1 = _b.sent();
                    logging_1.logger.error("Uniswap swap failed for token: ".concat(tokenAddress, ": ").concat(error_1));
                    return [2 /*return*/, { success: false, error: error_1.toString() }];
                case 20: return [2 /*return*/];
            }
        });
    });
}
exports.swapWithUniversalRouter = swapWithUniversalRouter;
//# sourceMappingURL=universal-router-module.js.map