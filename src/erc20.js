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
exports.convertTokenDecimalsToWad = exports.convertWadToTokenDecimals = exports.transferErc20 = exports.approveErc20 = exports.getAllowanceOfErc20 = exports.getBalanceOfErc20 = exports.getDecimalsErc20 = void 0;
var ethers_1 = require("ethers");
var erc20_abi_json_1 = __importDefault(require("./abis/erc20.abi.json"));
var nonce_1 = require("./nonce");
// TODO: Remove caching. This performance improvement is not worth the complexity.
var cachedDecimals = new Map(); // Map of address to int decimals.
function getDecimalsErc20(signer, tokenAddress) {
    return __awaiter(this, void 0, void 0, function () {
        var decimals;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!!cachedDecimals.has(tokenAddress)) return [3 /*break*/, 2];
                    return [4 /*yield*/, _getDecimalsErc20(signer, tokenAddress)];
                case 1:
                    decimals = _a.sent();
                    cachedDecimals.set(tokenAddress, decimals);
                    _a.label = 2;
                case 2: return [2 /*return*/, cachedDecimals.get(tokenAddress)];
            }
        });
    });
}
exports.getDecimalsErc20 = getDecimalsErc20;
function _getDecimalsErc20(signer, tokenAddress) {
    return __awaiter(this, void 0, void 0, function () {
        var contract, decimals;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    contract = new ethers_1.Contract(tokenAddress, erc20_abi_json_1.default, signer);
                    return [4 /*yield*/, contract.decimals()];
                case 1:
                    decimals = _a.sent();
                    // Ensure we always return a number
                    if (typeof decimals === 'number') {
                        return [2 /*return*/, decimals];
                    }
                    else if (decimals && typeof decimals.toNumber === 'function') {
                        return [2 /*return*/, decimals.toNumber()];
                    }
                    else {
                        throw new Error("Unexpected decimals type for token ".concat(tokenAddress, ": ").concat(typeof decimals));
                    }
                    return [2 /*return*/];
            }
        });
    });
}
function getBalanceOfErc20(signer, tokenAddress) {
    return __awaiter(this, void 0, void 0, function () {
        var contract, ownerAddress;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    contract = new ethers_1.Contract(tokenAddress, erc20_abi_json_1.default, signer);
                    return [4 /*yield*/, signer.getAddress()];
                case 1:
                    ownerAddress = _a.sent();
                    return [4 /*yield*/, contract.balanceOf(ownerAddress)];
                case 2: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
exports.getBalanceOfErc20 = getBalanceOfErc20;
function getAllowanceOfErc20(signer, tokenAddress, allowedAddress) {
    return __awaiter(this, void 0, void 0, function () {
        var contract, signerAddress;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    contract = new ethers_1.Contract(tokenAddress, erc20_abi_json_1.default, signer);
                    return [4 /*yield*/, signer.getAddress()];
                case 1:
                    signerAddress = _a.sent();
                    return [4 /*yield*/, contract.allowance(signerAddress, allowedAddress)];
                case 2: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
exports.getAllowanceOfErc20 = getAllowanceOfErc20;
function approveErc20(signer, tokenAddress, allowedAddress, amount) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, nonce_1.NonceTracker.queueTransaction(signer, function (nonce) { return __awaiter(_this, void 0, void 0, function () {
                        var contractUnconnected, contract, tx;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    contractUnconnected = new ethers_1.Contract(tokenAddress, erc20_abi_json_1.default, signer);
                                    contract = contractUnconnected.connect(signer);
                                    return [4 /*yield*/, contract.approve(allowedAddress, amount, { nonce: nonce.toString() })];
                                case 1:
                                    tx = _a.sent();
                                    return [4 /*yield*/, tx.wait()];
                                case 2: return [2 /*return*/, _a.sent()];
                            }
                        });
                    }); })];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
exports.approveErc20 = approveErc20;
function transferErc20(signer, tokenAddress, recipient, amount) {
    return __awaiter(this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, nonce_1.NonceTracker.queueTransaction(signer, function (nonce) { return __awaiter(_this, void 0, void 0, function () {
                        var contractUnconnected, contract, tx;
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0:
                                    contractUnconnected = new ethers_1.Contract(tokenAddress, erc20_abi_json_1.default, signer);
                                    contract = contractUnconnected.connect(signer);
                                    return [4 /*yield*/, contract.transfer(recipient, amount, {
                                            nonce: nonce.toString()
                                        })];
                                case 1:
                                    tx = _a.sent();
                                    return [4 /*yield*/, tx.wait()];
                                case 2: return [2 /*return*/, _a.sent()];
                            }
                        });
                    }); })];
                case 1: return [2 /*return*/, _a.sent()];
            }
        });
    });
}
exports.transferErc20 = transferErc20;
/**
 * Convert from WAD (18 decimals) to token's native decimals
 * Use: When passing Ajna amounts to external DEXs
 * Example: convertWadToTokenDecimals(collateral, 6) for USDC
 */
function convertWadToTokenDecimals(wadAmount, tokenDecimals) {
    if (tokenDecimals === 18) {
        return wadAmount; // No conversion needed
    }
    if (tokenDecimals < 18) {
        // Scale down: divide by 10^(18 - tokenDecimals)
        var divisor = ethers_1.ethers.BigNumber.from(10).pow(18 - tokenDecimals);
        return wadAmount.div(divisor);
    }
    else {
        // Scale up: multiply by 10^(tokenDecimals - 18)
        var multiplier = ethers_1.ethers.BigNumber.from(10).pow(tokenDecimals - 18);
        return wadAmount.mul(multiplier);
    }
}
exports.convertWadToTokenDecimals = convertWadToTokenDecimals;
/**
 * Convert from token's native decimals to WAD (18 decimals)
 * Use: When passing DEX results back to Ajna
 */
function convertTokenDecimalsToWad(tokenAmount, tokenDecimals) {
    if (tokenDecimals === 18) {
        return tokenAmount; // No conversion needed
    }
    if (tokenDecimals < 18) {
        // Scale up: multiply by 10^(18 - tokenDecimals)
        var multiplier = ethers_1.ethers.BigNumber.from(10).pow(18 - tokenDecimals);
        return tokenAmount.mul(multiplier);
    }
    else {
        // Scale down: divide by 10^(tokenDecimals - 18)
        var divisor = ethers_1.ethers.BigNumber.from(10).pow(tokenDecimals - 18);
        return tokenAmount.div(divisor);
    }
}
exports.convertTokenDecimalsToWad = convertTokenDecimalsToWad;
//# sourceMappingURL=erc20.js.map