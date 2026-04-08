"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RewardActionTracker = exports.deterministicJsonStringify = void 0;
var ethers_1 = require("ethers");
var config_types_1 = require("./config-types");
var erc20_1 = require("./erc20");
var logging_1 = require("./logging");
var utils_1 = require("./utils");
function deterministicJsonStringify(obj) {
    // Note: this works fine as long as the object is not nested.
    var determineObj = {};
    var sortedKeys = Object.keys(obj).sort();
    for (var _i = 0, sortedKeys_1 = sortedKeys; _i < sortedKeys_1.length; _i++) {
        var key = sortedKeys_1[_i];
        determineObj[key] = obj[key];
    }
    return JSON.stringify(determineObj);
}
exports.deterministicJsonStringify = deterministicJsonStringify;
function serializeRewardAction(rewardAction, token) {
    var key = deterministicJsonStringify(__assign({ token: token }, rewardAction));
    return key;
}
function deserializeRewardAction(serial) {
    var _a = JSON.parse(serial), token = _a.token, rewardAction = __rest(_a, ["token"]);
    if (typeof token !== 'string') {
        throw new Error("Could not deserialize token from ".concat(serial));
    }
    return { token: token, rewardAction: rewardAction };
}
var RewardActionTracker = /** @class */ (function () {
    function RewardActionTracker(signer, config, dexRouter) {
        this.signer = signer;
        this.config = config;
        this.dexRouter = dexRouter;
        this.feeTokenAmountMap = new Map();
        // New: Add a map to track retry attempts for each token
        this.retryCountMap = new Map();
    }
    RewardActionTracker.prototype.swapToken = function (chainId, tokenAddress, amount, targetToken, dexProvider, slippage, feeAmount) {
        var _a;
        return __awaiter(this, void 0, void 0, function () {
            var address, targetAddress, combinedSettings, result;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0: return [4 /*yield*/, this.signer.getAddress()];
                    case 1:
                        address = _b.sent();
                        targetAddress = targetToken in (this.config.tokenAddresses || {})
                            ? this.config.tokenAddresses[targetToken]
                            : (_a = this.config.uniswapOverrides) === null || _a === void 0 ? void 0 : _a.wethAddress;
                        if (!targetAddress) {
                            logging_1.logger.error("No target address found for token ".concat(targetToken, " on chain ").concat(chainId));
                            return [2 /*return*/, {
                                    success: false,
                                    error: "No target address for ".concat(targetToken, " on chain ").concat(chainId),
                                }];
                        }
                        combinedSettings = {
                            uniswap: __assign(__assign({}, this.config.uniswapOverrides), this.config.universalRouterOverrides),
                            sushiswap: this.config.sushiswapRouterOverrides,
                            uniswapV4: this.config.uniswapV4RouterOverrides
                        };
                        return [4 /*yield*/, this.dexRouter.swap(chainId, amount, tokenAddress, targetAddress, address, dexProvider, slippage, feeAmount, combinedSettings)];
                    case 2:
                        result = _b.sent();
                        return [2 /*return*/, result];
                }
            });
        });
    };
    RewardActionTracker.prototype.handleAllTokens = function () {
        var _a, _b, _c, _d, _e, _f;
        return __awaiter(this, void 0, void 0, function () {
            var MAX_RETRY_COUNT, nonZeroEntries, _i, nonZeroEntries_1, _g, key, amountWad, _h, rewardAction, token, retryCount, _j, tokenConfig, slippage, targetToken, dexProvider, feeAmount, swapResult, _k, newRetryCount, error_1, newRetryCount;
            return __generator(this, function (_l) {
                switch (_l.label) {
                    case 0:
                        MAX_RETRY_COUNT = 3;
                        nonZeroEntries = Array.from(this.feeTokenAmountMap.entries()).filter(function (_a) {
                            var _ = _a[0], amountWad = _a[1];
                            return amountWad.gt(ethers_1.constants.Zero);
                        });
                        _i = 0, nonZeroEntries_1 = nonZeroEntries;
                        _l.label = 1;
                    case 1:
                        if (!(_i < nonZeroEntries_1.length)) return [3 /*break*/, 14];
                        _g = nonZeroEntries_1[_i], key = _g[0], amountWad = _g[1];
                        _h = deserializeRewardAction(key), rewardAction = _h.rewardAction, token = _h.token;
                        retryCount = this.retryCountMap.get(key) || 0;
                        // Skip if we've already tried too many times
                        if (retryCount >= MAX_RETRY_COUNT) {
                            logging_1.logger.warn("Skipping token ".concat(token, " after ").concat(MAX_RETRY_COUNT, " failed swap attempts - removing from queue"));
                            this.removeToken(rewardAction, token, amountWad);
                            this.retryCountMap.delete(key); // Clean up retry counter
                            return [3 /*break*/, 13];
                        }
                        _l.label = 2;
                    case 2:
                        _l.trys.push([2, 10, , 11]);
                        _j = rewardAction.action;
                        switch (_j) {
                            case config_types_1.RewardActionLabel.TRANSFER: return [3 /*break*/, 3];
                            case config_types_1.RewardActionLabel.EXCHANGE: return [3 /*break*/, 5];
                        }
                        return [3 /*break*/, 8];
                    case 3: return [4 /*yield*/, this.transferReward(rewardAction, token, amountWad)];
                    case 4:
                        _l.sent();
                        return [3 /*break*/, 9];
                    case 5:
                        tokenConfig = rewardAction;
                        slippage = (_b = (_a = tokenConfig === null || tokenConfig === void 0 ? void 0 : tokenConfig.slippage) !== null && _a !== void 0 ? _a : rewardAction.slippage) !== null && _b !== void 0 ? _b : 1;
                        targetToken = (_d = (_c = tokenConfig === null || tokenConfig === void 0 ? void 0 : tokenConfig.targetToken) !== null && _c !== void 0 ? _c : rewardAction.targetToken) !== null && _d !== void 0 ? _d : 'weth';
                        dexProvider = (_e = tokenConfig === null || tokenConfig === void 0 ? void 0 : tokenConfig.dexProvider) !== null && _e !== void 0 ? _e : rewardAction.dexProvider;
                        feeAmount = (_f = rewardAction.fee) !== null && _f !== void 0 ? _f : tokenConfig === null || tokenConfig === void 0 ? void 0 : tokenConfig.feeAmount;
                        // Validate that dexProvider is specified
                        if (!dexProvider) {
                            logging_1.logger.error("dexProvider is required for EXCHANGE action on token ".concat(token));
                            this.removeToken(rewardAction, token, amountWad);
                            return [3 /*break*/, 13];
                        }
                        // Validate the DEX configuration before attempting swap
                        try {
                            (0, config_types_1.validatePostAuctionDex)(dexProvider, this.config);
                        }
                        catch (validationError) {
                            logging_1.logger.error("Configuration validation failed for ".concat(dexProvider, " on token ").concat(token, ": ").concat(validationError));
                            this.removeToken(rewardAction, token, amountWad);
                            return [3 /*break*/, 13];
                        }
                        // If not the first attempt, log that we're retrying
                        if (retryCount > 0) {
                            logging_1.logger.info("Retry attempt ".concat(retryCount + 1, "/").concat(MAX_RETRY_COUNT, " for swapping ").concat((0, utils_1.weiToDecimaled)(amountWad), " of ").concat(token, " via ").concat(dexProvider));
                        }
                        _k = this.swapToken;
                        return [4 /*yield*/, this.signer.getChainId()];
                    case 6: return [4 /*yield*/, _k.apply(this, [_l.sent(), token,
                            amountWad,
                            targetToken,
                            dexProvider,
                            slippage,
                            feeAmount])];
                    case 7:
                        swapResult = _l.sent();
                        if (swapResult.success) {
                            // Success: remove token and clear retry count
                            this.removeToken(rewardAction, token, amountWad);
                            this.retryCountMap.delete(key);
                            logging_1.logger.info("Successfully swapped ".concat((0, utils_1.weiToDecimaled)(amountWad), " of ").concat(token, " to ").concat(targetToken, " via ").concat(dexProvider));
                        }
                        else {
                            newRetryCount = retryCount + 1;
                            this.retryCountMap.set(key, newRetryCount);
                            logging_1.logger.error("Failed to swap ".concat((0, utils_1.weiToDecimaled)(amountWad), " of ").concat(token, " via ").concat(dexProvider, " (attempt ").concat(newRetryCount, "/").concat(MAX_RETRY_COUNT, "): ").concat(swapResult.error));
                            // If we've reached max retries, remove the token
                            if (newRetryCount >= MAX_RETRY_COUNT) {
                                logging_1.logger.warn("Max retry count reached for ".concat(token, " via ").concat(dexProvider, " - removing from queue"));
                                this.removeToken(rewardAction, token, amountWad);
                                this.retryCountMap.delete(key);
                            }
                            // Otherwise we'll try again on next loop iteration
                        }
                        return [3 /*break*/, 9];
                    case 8:
                        logging_1.logger.warn('Unsupported reward action');
                        _l.label = 9;
                    case 9: return [3 /*break*/, 11];
                    case 10:
                        error_1 = _l.sent();
                        // Handle unexpected errors
                        logging_1.logger.error("Error processing reward action for ".concat(token, ":"), error_1);
                        newRetryCount = retryCount + 1;
                        this.retryCountMap.set(key, newRetryCount);
                        // Remove token if max retries reached
                        if (newRetryCount >= MAX_RETRY_COUNT) {
                            logging_1.logger.warn("Removing token ".concat(token, " after ").concat(MAX_RETRY_COUNT, " failed attempts due to errors"));
                            this.removeToken(rewardAction, token, amountWad);
                            this.retryCountMap.delete(key);
                        }
                        return [3 /*break*/, 11];
                    case 11: 
                    // The config.delayBetweenActions provides
                    // natural spacing between actions and retry attempts
                    return [4 /*yield*/, (0, utils_1.delay)(this.config.delayBetweenActions)];
                    case 12:
                        // The config.delayBetweenActions provides
                        // natural spacing between actions and retry attempts
                        _l.sent();
                        _l.label = 13;
                    case 13:
                        _i++;
                        return [3 /*break*/, 1];
                    case 14: return [2 /*return*/];
                }
            });
        });
    };
    RewardActionTracker.prototype.addToken = function (rewardAction, tokenCollected, amountWadToAdd) {
        var _a;
        var key = serializeRewardAction(rewardAction, tokenCollected);
        var currAmount = (_a = this.feeTokenAmountMap.get(key)) !== null && _a !== void 0 ? _a : ethers_1.constants.Zero;
        this.feeTokenAmountMap.set(key, currAmount.add(amountWadToAdd));
    };
    RewardActionTracker.prototype.removeToken = function (rewardAction, tokenCollected, amountWadToSub) {
        var _a;
        var key = serializeRewardAction(rewardAction, tokenCollected);
        var currAmount = (_a = this.feeTokenAmountMap.get(key)) !== null && _a !== void 0 ? _a : ethers_1.constants.Zero;
        this.feeTokenAmountMap.set(key, currAmount.sub(amountWadToSub));
    };
    // Helper to manually clear retry count if needed
    RewardActionTracker.prototype.clearRetryCount = function (rewardAction, tokenCollected) {
        var key = serializeRewardAction(rewardAction, tokenCollected);
        this.retryCountMap.delete(key);
    };
    RewardActionTracker.prototype.transferReward = function (rewardAction, token, amountWad) {
        return __awaiter(this, void 0, void 0, function () {
            var decimals, amount, error_2;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 3, , 4]);
                        logging_1.logger.debug("Sending reward token to ".concat(rewardAction.to, ", amountWad: ").concat((0, utils_1.weiToDecimaled)(amountWad), ", tokenAddress: ").concat(token));
                        return [4 /*yield*/, (0, erc20_1.getDecimalsErc20)(this.signer, token)];
                    case 1:
                        decimals = _a.sent();
                        amount = (0, utils_1.tokenChangeDecimals)(amountWad, 18, decimals);
                        return [4 /*yield*/, (0, erc20_1.transferErc20)(this.signer, token, rewardAction.to, amount)];
                    case 2:
                        _a.sent();
                        this.removeToken(rewardAction, token, amountWad);
                        logging_1.logger.info("Successfully transferred reward token to ".concat(rewardAction.to, ", amountWad: ").concat((0, utils_1.weiToDecimaled)(amountWad), ", tokenAddress: ").concat(token));
                        return [3 /*break*/, 4];
                    case 3:
                        error_2 = _a.sent();
                        logging_1.logger.error("Failed to transfer token to ".concat(rewardAction.to, ", amountWad: ").concat((0, utils_1.weiToDecimaled)(amountWad), ", tokenAddress: ").concat(token), error_2);
                        throw error_2;
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    return RewardActionTracker;
}());
exports.RewardActionTracker = RewardActionTracker;
//# sourceMappingURL=reward-action-tracker.js.map