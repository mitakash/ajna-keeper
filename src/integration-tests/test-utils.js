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
exports.increaseTime = exports.latestBlockTimestamp = exports.mine = exports.impersonateSigner = exports.impersonateAccount = exports.getBalance = exports.setBalance = exports.resetHardhat = exports.getProvider = void 0;
var test_config_1 = require("./test-config");
var provider_1 = require("../provider");
var nonce_1 = require("../nonce");
var getProvider = function () { return new provider_1.JsonRpcProvider(test_config_1.HARDHAT_RPC_URL); };
exports.getProvider = getProvider;
var resetHardhat = function () { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, exports.getProvider)().send('hardhat_reset', [
                    {
                        forking: {
                            jsonRpcUrl: "https://eth-mainnet.g.alchemy.com/v2/".concat(process.env.ALCHEMY_API_KEY),
                            blockNumber: test_config_1.MAINNET_CONFIG.BLOCK_NUMBER,
                        },
                    },
                ])];
            case 1:
                _a.sent();
                nonce_1.NonceTracker.clearNonces();
                return [2 /*return*/];
        }
    });
}); };
exports.resetHardhat = resetHardhat;
var setBalance = function (address, balance) {
    return (0, exports.getProvider)().send('hardhat_setBalance', [address, balance]);
};
exports.setBalance = setBalance;
var getBalance = function (address) {
    return (0, exports.getProvider)().send('eth_getBalance', [address]);
};
exports.getBalance = getBalance;
var impersonateAccount = function (address) {
    return (0, exports.getProvider)().send('hardhat_impersonateAccount', [address]);
};
exports.impersonateAccount = impersonateAccount;
var impersonateSigner = function (address) { return __awaiter(void 0, void 0, void 0, function () {
    var provider;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, exports.impersonateAccount)(address)];
            case 1:
                _a.sent();
                provider = (0, exports.getProvider)();
                return [2 /*return*/, provider.getSigner(address)];
        }
    });
}); };
exports.impersonateSigner = impersonateSigner;
var mine = function () { return (0, exports.getProvider)().send('evm_mine', []); };
exports.mine = mine;
var latestBlockTimestamp = function () { return __awaiter(void 0, void 0, void 0, function () {
    var latestBlock;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, exports.getProvider)().send('eth_getBlockByNumber', [
                    'latest',
                    false,
                ])];
            case 1:
                latestBlock = _a.sent();
                return [2 /*return*/, parseInt(latestBlock.timestamp, 16)];
        }
    });
}); };
exports.latestBlockTimestamp = latestBlockTimestamp;
var increaseTime = function (seconds) { return __awaiter(void 0, void 0, void 0, function () {
    var provider, currTimestamp, nextTimestamp;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                provider = (0, exports.getProvider)();
                return [4 /*yield*/, (0, exports.latestBlockTimestamp)()];
            case 1:
                currTimestamp = _a.sent();
                nextTimestamp = (currTimestamp + seconds).toString();
                return [4 /*yield*/, (0, exports.getProvider)().send('evm_setNextBlockTimestamp', [nextTimestamp])];
            case 2:
                _a.sent();
                return [4 /*yield*/, (0, exports.mine)()];
            case 3:
                _a.sent();
                return [4 /*yield*/, (0, exports.latestBlockTimestamp)()];
            case 4: return [2 /*return*/, _a.sent()];
        }
    });
}); };
exports.increaseTime = increaseTime;
//# sourceMappingURL=test-utils.js.map