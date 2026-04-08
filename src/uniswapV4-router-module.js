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
exports.swapWithUniswapV4Adapter = exports.swapWithUniswapV4 = void 0;
// src/uniswapV4-router-module.ts
/**
 * Uniswap V4 Router Module
 * Handles V4 swaps via Universal Router with Permit2
 */
var ethers_1 = require("ethers");
var logging_1 = require("./logging");
var nonce_1 = require("./nonce");
var uniswapV4_quote_provider_1 = require("./dex-providers/uniswapV4-quote-provider");
var uniswapv4_1 = require("./uniswapv4");
/**
 * AUDIT FIX H-01: Normalize poolKey so currency0 < currency1 (V4 requirement)
 * V4 requires tokens to be in lexicographic order for pool ID derivation
 */
function normalizePoolKey(poolKey) {
    var t0 = poolKey.token0.toLowerCase();
    var t1 = poolKey.token1.toLowerCase();
    if (t0 < t1) {
        return poolKey; // Already normalized
    }
    // Swap tokens to normalize
    return {
        token0: poolKey.token1,
        token1: poolKey.token0,
        fee: poolKey.fee,
        tickSpacing: poolKey.tickSpacing,
        hooks: poolKey.hooks,
        sqrtPriceLimitX96: poolKey.sqrtPriceLimitX96,
    };
}
/**
 * Encode V4 swap command for Universal Router
 *
 * Flow:
 * 1. Command 1: PERMIT2_TRANSFER_FROM (0x02) - Transfer tokens to router
 * 2. Command 2: V4_SWAP (0x10) - Execute swap
 * 3. V4_SWAP Actions: SWAP_EXACT_IN_SINGLE (0x06), SETTLE_ALL (0x0c), TAKE_ALL (0x0f)
 * 4. Params: transfer params, swap tuple, currencyIn/amountIn, currencyOut/minAmountOut
 */
function encodeV4SwapCommand(poolKey, zeroForOne, amountIn, minAmountOut, hookData) {
    if (hookData === void 0) { hookData = '0x'; }
    // 1. Universal Router commands: PERMIT2_TRANSFER_FROM then V4_SWAP
    var commands = ethers_1.ethers.utils.hexlify([uniswapv4_1.Commands.PERMIT2_TRANSFER_FROM, uniswapv4_1.Commands.V4_SWAP]);
    // 2. Determine currencies based on swap direction
    var currencyIn = zeroForOne ? poolKey.token0 : poolKey.token1;
    var currencyOut = zeroForOne ? poolKey.token1 : poolKey.token0;
    // 3. Build PERMIT2_TRANSFER_FROM input
    var permit2TransferInput = ethers_1.ethers.utils.defaultAbiCoder.encode(['address', 'uint256'], [currencyIn, amountIn]);
    // 4. Actions sequence for V4_SWAP
    var actions = ethers_1.ethers.utils.hexlify([
        uniswapv4_1.Actions.SWAP_EXACT_IN_SINGLE,
        uniswapv4_1.Actions.SETTLE_ALL,
        uniswapv4_1.Actions.TAKE_ALL,
    ]);
    // 5. Build params for each V4 action
    var params = new Array(3);
    // Action 0: SWAP_EXACT_IN_SINGLE
    // AUDIT FIX C-02: V4 Currency is a UDVT, encodes as plain address NOT tuple(address)
    params[0] = ethers_1.ethers.utils.defaultAbiCoder.encode([
        'tuple(' +
            'tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) poolKey,' +
            'bool zeroForOne,' +
            'uint128 amountIn,' +
            'uint128 amountOutMinimum,' +
            'bytes hookData' +
            ')',
    ], [
        [
            [poolKey.token0, poolKey.token1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
            zeroForOne,
            amountIn,
            minAmountOut,
            hookData,
        ],
    ]);
    // Action 1: SETTLE_ALL (currencyIn, amountIn)
    params[1] = ethers_1.ethers.utils.defaultAbiCoder.encode(['address', 'uint256'], [currencyIn, amountIn]);
    // Action 2: TAKE_ALL (currencyOut, minAmountOut)
    // Note: TAKE_ALL recipient is implicitly the transaction sender (msg.sender)
    params[2] = ethers_1.ethers.utils.defaultAbiCoder.encode(['address', 'uint256'], [currencyOut, minAmountOut]);
    // 6. Encode V4_SWAP input
    var v4SwapInput = ethers_1.ethers.utils.defaultAbiCoder.encode(['bytes', 'bytes[]'], [actions, params]);
    return { commands: commands, inputs: [permit2TransferInput, v4SwapInput] };
}
/**
 * Ensure Permit2 approval for token
 */
function ensurePermit2Approval(signer, tokenAddress, amount, permit2Address) {
    return __awaiter(this, void 0, void 0, function () {
        var signerAddress, tokenContract, allowance;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, signer.getAddress()];
                case 1:
                    signerAddress = _a.sent();
                    tokenContract = new ethers_1.Contract(tokenAddress, uniswapv4_1.ERC20_ABI, signer);
                    return [4 /*yield*/, tokenContract.allowance(signerAddress, permit2Address)];
                case 2:
                    allowance = _a.sent();
                    if (!allowance.lt(amount)) return [3 /*break*/, 4];
                    logging_1.logger.info("Approving Permit2 for ".concat(tokenAddress.slice(0, 8), "..."));
                    return [4 /*yield*/, nonce_1.NonceTracker.queueTransaction(signer, function (nonce) { return __awaiter(_this, void 0, void 0, function () {
                            var tx;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, tokenContract.approve(permit2Address, ethers_1.ethers.constants.MaxUint256, {
                                            nonce: nonce,
                                        })];
                                    case 1:
                                        tx = _a.sent();
                                        return [4 /*yield*/, tx.wait()];
                                    case 2: return [2 /*return*/, _a.sent()];
                                }
                            });
                        }); })];
                case 3:
                    _a.sent();
                    logging_1.logger.info('✅ Permit2 approval confirmed');
                    _a.label = 4;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Ensure Universal Router approval via Permit2
 */
function ensureRouterApproval(signer, tokenAddress, amount, routerAddress, permit2Address) {
    return __awaiter(this, void 0, void 0, function () {
        var signerAddress, permit2, allowanceResult, currentAmount, currentExpiration, expiration_1;
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, signer.getAddress()];
                case 1:
                    signerAddress = _a.sent();
                    permit2 = new ethers_1.Contract(permit2Address, uniswapv4_1.PERMIT2_ABI, signer);
                    return [4 /*yield*/, permit2.allowance(signerAddress, tokenAddress, routerAddress)];
                case 2:
                    allowanceResult = _a.sent();
                    currentAmount = allowanceResult[0];
                    currentExpiration = allowanceResult[1];
                    if (!(currentAmount.lt(amount) || currentExpiration < Math.floor(Date.now() / 1000))) return [3 /*break*/, 4];
                    logging_1.logger.info('Approving Universal Router via Permit2...');
                    expiration_1 = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
                    return [4 /*yield*/, nonce_1.NonceTracker.queueTransaction(signer, function (nonce) { return __awaiter(_this, void 0, void 0, function () {
                            var tx;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, permit2.approve(tokenAddress, routerAddress, uniswapv4_1.MAX_UINT160, expiration_1, {
                                            nonce: nonce,
                                        })];
                                    case 1:
                                        tx = _a.sent();
                                        return [4 /*yield*/, tx.wait()];
                                    case 2: return [2 /*return*/, _a.sent()];
                                }
                            });
                        }); })];
                case 3:
                    _a.sent();
                    logging_1.logger.info('✅ Universal Router approval via Permit2 confirmed');
                    _a.label = 4;
                case 4: return [2 /*return*/];
            }
        });
    });
}
/**
 * Main swap function for Uniswap V4
 */
function swapWithUniswapV4(signer, tokenIn, amountIn, tokenOut, slippagePct, poolKey, to, poolManagerAddress, universalRouterAddress, permit2Address, // AUDIT FIX M-02: Allow config permit2 instead of hardcoded
hookData) {
    if (hookData === void 0) { hookData = '0x'; }
    return __awaiter(this, void 0, void 0, function () {
        var chainId, signerAddress, provider, addresses, poolManager, universalRouter, permit2, normalizedPoolKey, tokenInContract, inDecimals, inDecNumber, zeroForOne, quoteProvider, quoteResult, minAmountOut, tokenOutContract, outDecimals, outDecNumber, _a, commands_1, inputs_1, router_1, deadline_1, gasEstimate, gasError_1, gasLimit_1, gasPrice, adjustedGasPrice_1, receipt, error_1;
        var _this = this;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, signer.getChainId()];
                case 1:
                    chainId = _b.sent();
                    return [4 /*yield*/, signer.getAddress()];
                case 2:
                    signerAddress = _b.sent();
                    provider = signer.provider;
                    addresses = uniswapv4_1.V4_CHAIN_ADDRESSES[chainId];
                    if (!addresses && !poolManagerAddress) {
                        return [2 /*return*/, { success: false, error: "V4 not supported on chain ".concat(chainId) }];
                    }
                    poolManager = poolManagerAddress || (addresses === null || addresses === void 0 ? void 0 : addresses.POOL_MANAGER);
                    universalRouter = universalRouterAddress || (addresses === null || addresses === void 0 ? void 0 : addresses.UNIVERSAL_ROUTER);
                    permit2 = permit2Address || (addresses === null || addresses === void 0 ? void 0 : addresses.PERMIT2);
                    if (!poolManager || !universalRouter || !permit2) {
                        return [2 /*return*/, { success: false, error: "V4 addresses not configured for chain ".concat(chainId) }];
                    }
                    logging_1.logger.info("V4 Swap: Using Universal Router at ".concat(universalRouter));
                    normalizedPoolKey = normalizePoolKey(poolKey);
                    _b.label = 3;
                case 3:
                    _b.trys.push([3, 18, , 19]);
                    tokenInContract = new ethers_1.Contract(tokenIn, uniswapv4_1.ERC20_ABI, signer);
                    return [4 /*yield*/, tokenInContract.decimals()];
                case 4:
                    inDecimals = _b.sent();
                    inDecNumber = typeof inDecimals === 'number' ? inDecimals : inDecimals.toNumber();
                    logging_1.logger.debug("V4 Swap: ".concat(ethers_1.ethers.utils.formatUnits(amountIn, inDecNumber), " ").concat(tokenIn.slice(0, 8), "... \u2192 ").concat(tokenOut.slice(0, 8), "..."));
                    zeroForOne = tokenIn.toLowerCase() === normalizedPoolKey.token0.toLowerCase();
                    logging_1.logger.debug("Swap direction: zeroForOne=".concat(zeroForOne));
                    // Step 1: Approve Permit2
                    return [4 /*yield*/, ensurePermit2Approval(signer, tokenIn, amountIn, permit2)];
                case 5:
                    // Step 1: Approve Permit2
                    _b.sent();
                    // Step 2: Approve Universal Router via Permit2
                    return [4 /*yield*/, ensureRouterApproval(signer, tokenIn, amountIn, universalRouter, permit2)];
                case 6:
                    // Step 2: Approve Universal Router via Permit2
                    _b.sent();
                    quoteProvider = new uniswapV4_quote_provider_1.UniswapV4QuoteProvider(signer, {
                        poolManager: poolManager,
                        defaultSlippage: slippagePct,
                        pools: {},
                    });
                    return [4 /*yield*/, quoteProvider.initialize()];
                case 7:
                    _b.sent();
                    return [4 /*yield*/, quoteProvider.getQuote(amountIn, tokenIn, tokenOut, normalizedPoolKey)];
                case 8:
                    quoteResult = _b.sent();
                    minAmountOut = void 0;
                    if (!(quoteResult.success && quoteResult.dstAmount)) return [3 /*break*/, 10];
                    // Apply slippage to quoted amount
                    minAmountOut = quoteResult.dstAmount.mul(10000 - slippagePct * 100).div(10000);
                    tokenOutContract = new ethers_1.Contract(tokenOut, uniswapv4_1.ERC20_ABI, signer);
                    return [4 /*yield*/, tokenOutContract.decimals()];
                case 9:
                    outDecimals = _b.sent();
                    outDecNumber = typeof outDecimals === 'number' ? outDecimals : outDecimals.toNumber();
                    logging_1.logger.info("\uD83D\uDCB0 Expected output: ~".concat(ethers_1.ethers.utils.formatUnits(quoteResult.dstAmount, outDecNumber), " ").concat(tokenOut.slice(0, 8), "..."));
                    return [3 /*break*/, 11];
                case 10:
                    // AUDIT FIX M-01: Don't use nonsensical fallback - fail if quote unavailable
                    // Using amountIn as minAmountOut makes no sense for different tokens
                    logging_1.logger.error("V4 quote failed: ".concat(quoteResult.error));
                    return [2 /*return*/, { success: false, error: "Quote failed: ".concat(quoteResult.error) }];
                case 11:
                    logging_1.logger.debug("Amount in: ".concat(amountIn.toString()));
                    logging_1.logger.debug("Min amount out: ".concat(minAmountOut.toString()));
                    _a = encodeV4SwapCommand(normalizedPoolKey, zeroForOne, amountIn, minAmountOut, hookData), commands_1 = _a.commands, inputs_1 = _a.inputs;
                    logging_1.logger.debug("Commands: ".concat(commands_1));
                    logging_1.logger.debug("Inputs length: ".concat(inputs_1.length));
                    router_1 = new ethers_1.Contract(universalRouter, uniswapv4_1.UNIVERSAL_ROUTER_ABI, signer);
                    deadline_1 = Math.floor(Date.now() / 1000) + 1200;
                    logging_1.logger.info('Executing V4 swap via Universal Router...');
                    gasEstimate = void 0;
                    _b.label = 12;
                case 12:
                    _b.trys.push([12, 14, , 15]);
                    return [4 /*yield*/, router_1.estimateGas['execute(bytes,bytes[],uint256)'](commands_1, inputs_1, deadline_1, { from: signerAddress, value: 0 })];
                case 13:
                    gasEstimate = _b.sent();
                    logging_1.logger.debug("Estimated gas: ".concat(gasEstimate.toString()));
                    return [3 /*break*/, 15];
                case 14:
                    gasError_1 = _b.sent();
                    logging_1.logger.error("Gas estimation failed: ".concat(gasError_1.message));
                    throw new uniswapv4_1.V4SwapError("Gas estimation failed: ".concat(gasError_1.message));
                case 15:
                    gasLimit_1 = gasEstimate.mul(130).div(100);
                    return [4 /*yield*/, provider.getGasPrice()];
                case 16:
                    gasPrice = _b.sent();
                    adjustedGasPrice_1 = gasPrice.mul(115).div(100);
                    logging_1.logger.debug("Gas limit: ".concat(gasLimit_1.toString(), ", Gas price: ").concat(adjustedGasPrice_1.toString()));
                    return [4 /*yield*/, nonce_1.NonceTracker.queueTransaction(signer, function (nonce) { return __awaiter(_this, void 0, void 0, function () {
                            var txResponse;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, router_1['execute(bytes,bytes[],uint256)'](commands_1, inputs_1, deadline_1, {
                                            gasLimit: gasLimit_1,
                                            gasPrice: adjustedGasPrice_1,
                                            nonce: nonce,
                                            value: 0,
                                        })];
                                    case 1:
                                        txResponse = _a.sent();
                                        return [4 /*yield*/, txResponse.wait()];
                                    case 2: return [2 /*return*/, _a.sent()];
                                }
                            });
                        }); })];
                case 17:
                    receipt = _b.sent();
                    logging_1.logger.info("\u2705 V4 swap successful! Tx: ".concat(receipt.transactionHash));
                    logging_1.logger.info("   Gas used: ".concat(receipt.gasUsed.toString()));
                    return [2 /*return*/, { success: true, receipt: receipt }];
                case 18:
                    error_1 = _b.sent();
                    logging_1.logger.error("\u274C V4 swap failed: ".concat(error_1.message));
                    if (error_1.message.includes('INSUFFICIENT_LIQUIDITY')) {
                        return [2 /*return*/, { success: false, error: 'Pool has insufficient liquidity' }];
                    }
                    if (error_1.message.includes('PRICE')) {
                        return [2 /*return*/, { success: false, error: 'Price moved beyond limits' }];
                    }
                    return [2 /*return*/, { success: false, error: error_1.message || error_1.toString() }];
                case 19: return [2 /*return*/];
            }
        });
    });
}
exports.swapWithUniswapV4 = swapWithUniswapV4;
/**
 * Simplified adapter function that matches your DexRouter interface
 */
function swapWithUniswapV4Adapter(signer, tokenIn, amountIn, tokenOut, slippagePct, routerAddress, // Universal Router
poolKey, to, permit2Address, // AUDIT FIX M-02: Allow config permit2
hookData) {
    if (hookData === void 0) { hookData = '0x'; }
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, swapWithUniswapV4(signer, tokenIn, amountIn, tokenOut, slippagePct, poolKey, to, undefined, // Auto-detect PoolManager
                routerAddress, // Universal Router
                permit2Address, // AUDIT FIX M-02: Pass through permit2 from config
                hookData)];
        });
    });
}
exports.swapWithUniswapV4Adapter = swapWithUniswapV4Adapter;
//# sourceMappingURL=uniswapV4-router-module.js.map