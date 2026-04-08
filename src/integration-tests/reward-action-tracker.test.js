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
var config_types_1 = require("../config-types");
var test_utils_1 = require("./test-utils");
var test_config_1 = require("./test-config");
var reward_action_tracker_1 = require("../reward-action-tracker");
var utils_1 = require("../utils");
var ethers_1 = require("ethers");
var erc20_1 = require("../erc20");
var chai_1 = require("chai");
var dex_router_1 = require("../dex-router");
describe('RewardActionTracker', function () {
    beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, test_utils_1.resetHardhat)()];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('Transfers to wallet', function () { return __awaiter(void 0, void 0, void 0, function () {
        var signer, _a, receiver, wethAddress, uniswapV3Router, tokenToSwap, dexRouter, et, senderBalanceBefore, receiverBalanceBefore, senderBalanceAfter, receiverBalanceAfter, senderBalanceDecrease, receiverBalanceIncrease;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(test_config_1.MAINNET_CONFIG.WBTC_USDC_POOL.collateralWhaleAddress)];
                case 1:
                    signer = _b.sent();
                    _a = test_utils_1.setBalance;
                    return [4 /*yield*/, signer.getAddress()];
                case 2: return [4 /*yield*/, _a.apply(void 0, [_b.sent(), (0, utils_1.decimaledToWei)(1000).toHexString()])];
                case 3:
                    _b.sent();
                    receiver = ethers_1.Wallet.fromMnemonic(test_config_1.USER1_MNEMONIC).connect((0, test_utils_1.getProvider)());
                    wethAddress = test_config_1.MAINNET_CONFIG.WETH_ADDRESS;
                    uniswapV3Router = test_config_1.MAINNET_CONFIG.UNISWAP_V3_ROUTER;
                    tokenToSwap = test_config_1.MAINNET_CONFIG.WBTC_USDC_POOL.collateralAddress;
                    dexRouter = new dex_router_1.DexRouter(signer);
                    et = new reward_action_tracker_1.RewardActionTracker(signer, {
                        uniswapOverrides: {
                            wethAddress: wethAddress,
                            uniswapV3Router: uniswapV3Router,
                        },
                        delayBetweenActions: 0,
                        pools: [],
                    }, dexRouter);
                    et.addToken({ action: config_types_1.RewardActionLabel.TRANSFER, to: receiver.address }, tokenToSwap, (0, utils_1.decimaledToWei)(1));
                    return [4 /*yield*/, (0, erc20_1.getBalanceOfErc20)(signer, tokenToSwap)];
                case 4:
                    senderBalanceBefore = _b.sent();
                    return [4 /*yield*/, (0, erc20_1.getBalanceOfErc20)(receiver, tokenToSwap)];
                case 5:
                    receiverBalanceBefore = _b.sent();
                    return [4 /*yield*/, et.handleAllTokens()];
                case 6:
                    _b.sent();
                    return [4 /*yield*/, (0, erc20_1.getBalanceOfErc20)(signer, tokenToSwap)];
                case 7:
                    senderBalanceAfter = _b.sent();
                    return [4 /*yield*/, (0, erc20_1.getBalanceOfErc20)(receiver, tokenToSwap)];
                case 8:
                    receiverBalanceAfter = _b.sent();
                    senderBalanceDecrease = senderBalanceBefore.sub(senderBalanceAfter);
                    receiverBalanceIncrease = receiverBalanceAfter.sub(receiverBalanceBefore);
                    (0, chai_1.expect)(senderBalanceDecrease.eq((0, utils_1.decimaledToWei)(1, 8))).to.be.true;
                    (0, chai_1.expect)(receiverBalanceIncrease.eq((0, utils_1.decimaledToWei)(1, 8))).to.be.true;
                    return [2 /*return*/];
            }
        });
    }); });
});
//# sourceMappingURL=reward-action-tracker.test.js.map