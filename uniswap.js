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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swapToWeth = exports.getTokenFromAddress = exports.getWethToken = exports.getPoolInfo = void 0;
var sdk_core_1 = require("@uniswap/sdk-core");
var IUniswapV3Pool_json_1 = __importDefault(require("@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json"));
var SwapRouter_json_1 = require("@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json");
var v3_sdk_1 = require("@uniswap/v3-sdk");
var ethers_1 = require("ethers");
var erc20_abi_json_1 = __importDefault(require("./abis/erc20.abi.json"));
var logging_1 = require("./logging");
var nonce_1 = require("./nonce");
var utils_1 = require("./utils");
var erc20_1 = require("./erc20");
var Uniswap = {
    getPoolInfo: getPoolInfo,
    swapToWeth: swapToWeth,
};
function getPoolInfo(poolContract) {
    return __awaiter(this, void 0, void 0, function () {
        var _a, liquidity, slot0;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, Promise.all([
                        poolContract.liquidity(),
                        poolContract.slot0(),
                    ])];
                case 1:
                    _a = _b.sent(), liquidity = _a[0], slot0 = _a[1];
                    return [2 /*return*/, {
                            liquidity: liquidity,
                            sqrtPriceX96: slot0[0],
                            tick: slot0[1],
                        }];
            }
        });
    });
}
exports.getPoolInfo = getPoolInfo;
function getWethToken(chainId, provider, overrideAddress) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!overrideAddress) return [3 /*break*/, 2];
                    return [4 /*yield*/, getTokenFromAddress(chainId, provider, overrideAddress)];
                case 1: return [2 /*return*/, _a.sent()];
                case 2:
                    if (sdk_core_1.WETH9[chainId]) {
                        return [2 /*return*/, sdk_core_1.WETH9[chainId]];
                    }
                    _a.label = 3;
                case 3: throw new Error('You must provide an address in the config for wethAddress.');
            }
        });
    });
}
exports.getWethToken = getWethToken;
function getTokenFromAddress(chainId, provider, tokenAddress) {
    return __awaiter(this, void 0, void 0, function () {
        var contract, _a, symbol, name, decimals;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    contract = new ethers_1.Contract(tokenAddress, erc20_abi_json_1.default, provider);
                    return [4 /*yield*/, Promise.all([
                            contract.symbol(),
                            contract.name(),
                            contract.decimals(),
                        ])];
                case 1:
                    _a = _b.sent(), symbol = _a[0], name = _a[1], decimals = _a[2];
                    if (!decimals) {
                        throw new Error("Could not get details for token at address: ".concat(tokenAddress));
                    }
                    return [2 /*return*/, new sdk_core_1.Token(chainId, tokenAddress, decimals, symbol, name)];
            }
        });
    });
}
exports.getTokenFromAddress = getTokenFromAddress;
function swapToWeth(signer, tokenAddress, amount, feeAmount, uniswapOverrides) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var provider, network, chainId, tokenToSwap, weth, uniswapV3Router, v3CoreFactorAddress, currentAllowance, error_1, poolAddress, poolContract, _b, poolInfo, tickSpacing, roundTick, initialTick, ticks, tickDataProvider, sqrtPriceX96, pool, route, inputAmount, quote, expectedOutputAmount, trade, slippageTolerance, minOut, swapRouter, recipient, currentBlock, currentBlockTimestamp, signerAddress, error_2;
        var _this = this;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (!signer || !tokenAddress || !amount) {
                        throw new Error('Invalid parameters provided to swapToWeth');
                    }
                    provider = signer.provider;
                    if (!provider) {
                        throw new Error('No provider available, skipping swap');
                    }
                    return [4 /*yield*/, provider.getNetwork()];
                case 1:
                    network = _c.sent();
                    chainId = network.chainId;
                    return [4 /*yield*/, getTokenFromAddress(chainId, provider, tokenAddress)];
                case 2:
                    tokenToSwap = _c.sent();
                    return [4 /*yield*/, getWethToken(chainId, provider, uniswapOverrides === null || uniswapOverrides === void 0 ? void 0 : uniswapOverrides.wethAddress)];
                case 3:
                    weth = _c.sent();
                    uniswapV3Router = (_a = uniswapOverrides === null || uniswapOverrides === void 0 ? void 0 : uniswapOverrides.uniswapV3Router) !== null && _a !== void 0 ? _a : (0, sdk_core_1.SWAP_ROUTER_02_ADDRESSES)(chainId);
                    v3CoreFactorAddress = sdk_core_1.V3_CORE_FACTORY_ADDRESSES[chainId];
                    if (tokenToSwap.symbol === weth.symbol ||
                        tokenToSwap.address === weth.address) {
                        logging_1.logger.info('Collected tokens are already WETH, no swap necessary');
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, (0, erc20_1.getAllowanceOfErc20)(signer, tokenAddress, uniswapV3Router)];
                case 4:
                    currentAllowance = _c.sent();
                    if (!currentAllowance.lt(amount)) return [3 /*break*/, 9];
                    _c.label = 5;
                case 5:
                    _c.trys.push([5, 7, , 8]);
                    logging_1.logger.debug("Approving Uniswap for token: ".concat(tokenToSwap.symbol));
                    return [4 /*yield*/, (0, erc20_1.approveErc20)(signer, tokenAddress, uniswapV3Router, amount)];
                case 6:
                    _c.sent();
                    logging_1.logger.info("Uniswap approval successful for token ".concat(tokenToSwap.symbol));
                    return [3 /*break*/, 8];
                case 7:
                    error_1 = _c.sent();
                    logging_1.logger.error("Failed to approve Uniswap swap for token: ".concat(tokenToSwap.symbol, "."), error_1);
                    throw error_1;
                case 8: return [3 /*break*/, 10];
                case 9:
                    logging_1.logger.info("Token ".concat(tokenToSwap.symbol, " already has sufficient allowance"));
                    _c.label = 10;
                case 10:
                    poolAddress = v3_sdk_1.Pool.getAddress(tokenToSwap, weth, feeAmount, undefined, v3CoreFactorAddress);
                    poolContract = new ethers_1.Contract(poolAddress, IUniswapV3Pool_json_1.default.abi, provider);
                    _c.label = 11;
                case 11:
                    _c.trys.push([11, 13, , 14]);
                    return [4 /*yield*/, poolContract.slot0()];
                case 12:
                    _c.sent();
                    return [3 /*break*/, 14];
                case 13:
                    _b = _c.sent();
                    throw new Error("Pool does not exist for ".concat(tokenToSwap.symbol, "/").concat(weth.symbol, ", fee: ").concat(feeAmount / 10000, "%"));
                case 14: return [4 /*yield*/, Uniswap.getPoolInfo(poolContract)];
                case 15:
                    poolInfo = _c.sent();
                    return [4 /*yield*/, poolContract.tickSpacing()];
                case 16:
                    tickSpacing = _c.sent();
                    roundTick = Math.round(poolInfo.tick / tickSpacing) * tickSpacing;
                    initialTick = {
                        index: roundTick,
                        liquidityNet: BigInt(0).toString(),
                        liquidityGross: BigInt(0).toString(),
                    };
                    ticks = [new v3_sdk_1.Tick(initialTick)];
                    tickDataProvider = new v3_sdk_1.TickListDataProvider(ticks, tickSpacing);
                    sqrtPriceX96 = v3_sdk_1.TickMath.getSqrtRatioAtTick(roundTick);
                    pool = new v3_sdk_1.Pool(tokenToSwap, weth, feeAmount, sqrtPriceX96.toString(), poolInfo.liquidity.toString(), roundTick, tickDataProvider);
                    route = new v3_sdk_1.Route([pool], tokenToSwap, weth);
                    inputAmount = sdk_core_1.CurrencyAmount.fromRawAmount(tokenToSwap, amount.toString());
                    return [4 /*yield*/, pool.getOutputAmount(inputAmount)];
                case 17:
                    quote = _c.sent();
                    expectedOutputAmount = quote[0];
                    trade = v3_sdk_1.Trade.createUncheckedTrade({
                        route: route,
                        inputAmount: inputAmount,
                        outputAmount: expectedOutputAmount,
                        tradeType: sdk_core_1.TradeType.EXACT_INPUT,
                    });
                    slippageTolerance = new sdk_core_1.Percent(50, 10000);
                    minOut = ethers_1.BigNumber.from(trade.minimumAmountOut(slippageTolerance).quotient.toString());
                    if (minOut.lte(ethers_1.constants.Zero)) {
                        minOut = amount.div(ethers_1.BigNumber.from('10000'));
                    }
                    swapRouter = new ethers_1.Contract(uniswapV3Router, SwapRouter_json_1.abi, signer);
                    return [4 /*yield*/, signer.getAddress()];
                case 18:
                    recipient = _c.sent();
                    return [4 /*yield*/, provider.getBlock('latest')];
                case 19:
                    currentBlock = _c.sent();
                    currentBlockTimestamp = currentBlock.timestamp;
                    return [4 /*yield*/, signer.getAddress()];
                case 20:
                    signerAddress = _c.sent();
                    logging_1.logger.debug("Swapping to WETH for token: ".concat(tokenToSwap.symbol, ", amount: ").concat((0, utils_1.weiToDecimaled)(amount, tokenToSwap.decimals)));
                    _c.label = 21;
                case 21:
                    _c.trys.push([21, 23, , 24]);
                    return [4 /*yield*/, nonce_1.NonceTracker.queueTransaction(signer, function (nonce) { return __awaiter(_this, void 0, void 0, function () {
                            var tx;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, swapRouter.exactInputSingle({
                                            tokenIn: tokenToSwap.address,
                                            tokenOut: weth.address,
                                            fee: feeAmount,
                                            recipient: recipient,
                                            deadline: currentBlockTimestamp + 60 * 60 * 60,
                                            amountIn: amount,
                                            amountOutMinimum: minOut,
                                            sqrtPriceLimitX96: ethers_1.ethers.constants.Zero,
                                        }, { nonce: nonce.toString() })];
                                    case 1:
                                        tx = _a.sent();
                                        return [4 /*yield*/, tx.wait()];
                                    case 2: return [2 /*return*/, _a.sent()];
                                }
                            });
                        }); })];
                case 22:
                    _c.sent();
                    logging_1.logger.info("Swap to WETH successful for token: ".concat(tokenToSwap.symbol, ", amount: ").concat((0, utils_1.weiToDecimaled)(amount, tokenToSwap.decimals)));
                    return [3 /*break*/, 24];
                case 23:
                    error_2 = _c.sent();
                    logging_1.logger.error("Swap to WETH failed for token: ".concat(tokenAddress), error_2);
                    throw error_2;
                case 24: return [2 /*return*/];
            }
        });
    });
}
exports.swapToWeth = swapToWeth;
exports.default = Uniswap;
//# sourceMappingURL=uniswap.js.map