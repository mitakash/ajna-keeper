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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForConditionToBeTrue = exports.arrayFromAsync = exports.getProviderAndSigner = exports.tokenChangeDecimals = exports.decimaledToWei = exports.weiToDecimaled = exports.delay = exports.overrideMulticall = exports.addAccountFromKeystore = exports.askPassword = void 0;
var ethers_1 = require("ethers");
var fs_1 = require("fs");
var prompts_1 = require("@inquirer/prompts");
var logging_1 = require("./logging");
var provider_1 = require("./provider");
var Utils;
function askPassword() {
    return __awaiter(this, void 0, void 0, function () {
        var pswd;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    // Support non-interactive mode for pm2/background processes
                    if (process.env.KEEPER_PASSWORD) {
                        return [2 /*return*/, process.env.KEEPER_PASSWORD];
                    }
                    return [4 /*yield*/, (0, prompts_1.password)({
                        message: 'Please enter your keystore password',
                        mask: '*',
                    })];
                case 1:
                    pswd = _a.sent();
                    return [2 /*return*/, pswd];
            }
        });
    });
}
exports.askPassword = askPassword;
function addAccountFromKeystore(keystorePath, provider) {
    return __awaiter(this, void 0, void 0, function () {
        var jsonKeystore, pswd, wallet, wallet;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, fs_1.promises.readFile(keystorePath)];
                case 1:
                    jsonKeystore = (_a.sent()).toString();
                    // Support non-interactive mode for pm2/background processes
                    if (process.env.KEEPER_PASSWORD) {
                        pswd = process.env.KEEPER_PASSWORD;
                        return [3 /*break*/, 3];
                    }
                    return [4 /*yield*/, (0, prompts_1.password)({
                            message: 'Please enter your keystore password',
                            mask: '*',
                        })];
                case 2:
                    pswd = _a.sent();
                case 3:
                    try {
                        wallet = ethers_1.Wallet.fromEncryptedJsonSync(jsonKeystore, pswd);
                        logging_1.logger.info("Loaded wallet with address: ".concat(wallet.address));
                        return [2 /*return*/, wallet.connect(provider)];
                    }
                    catch (error) {
                        logging_1.logger.error('Error decrypting keystore:', error);
                        logging_1.logger.error('This keeper will not create transactions');
                        wallet = ethers_1.Wallet.createRandom();
                        return [2 /*return*/, wallet.connect(provider)];
                    }
                    return [2 /*return*/];
            }
        });
    });
}
exports.addAccountFromKeystore = addAccountFromKeystore;
function overrideMulticall(fungiblePool, chainConfig) {
    if ((chainConfig === null || chainConfig === void 0 ? void 0 : chainConfig.multicallAddress) &&
        (chainConfig === null || chainConfig === void 0 ? void 0 : chainConfig.multicallBlock) !== undefined) {
        fungiblePool.ethcallProvider.multicall3 = {
            address: chainConfig.multicallAddress,
            block: chainConfig.multicallBlock,
        };
    }
}
exports.overrideMulticall = overrideMulticall;
function delay(seconds) {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, new Promise(function (res) { return setTimeout(res, seconds * 1000); })];
        });
    });
}
exports.delay = delay;
function bigToScientific(bn) {
    var bnStr = bn.toString();
    var numbStart = bnStr.startsWith('-') ? 1 : 0;
    var mantissa = parseFloat(bnStr.slice(0, numbStart + 1) + '.' + bnStr.slice(numbStart + 1, 14));
    var exponent10 = bnStr.length - (1 + numbStart);
    return { mantissa: mantissa, exponent10: exponent10 };
}
function weiToDecimaled(bn, tokenDecimals) {
    if (tokenDecimals === void 0) { tokenDecimals = 18; }
    var scientific = bigToScientific(bn);
    scientific.exponent10 -= tokenDecimals;
    return parseFloat(scientific.mantissa + 'e' + scientific.exponent10);
}
exports.weiToDecimaled = weiToDecimaled;
function decimaledToWei(dec, tokenDecimals) {
    if (tokenDecimals === void 0) { tokenDecimals = 18; }
    var scientificStr = dec.toExponential();
    var _a = scientificStr
        .replace('.', '')
        .split('e'), mantissaStr = _a[0], exponent10Str = _a[1];
    var weiStrLength = 1;
    if (mantissaStr.includes('.'))
        weiStrLength += 1;
    if (mantissaStr.startsWith('-'))
        weiStrLength += 1;
    var exponent10 = parseInt(exponent10Str) + tokenDecimals;
    weiStrLength += exponent10;
    var weiStr = mantissaStr.slice(0, weiStrLength).padEnd(weiStrLength, '0');
    return ethers_1.BigNumber.from(weiStr);
}
exports.decimaledToWei = decimaledToWei;
function tokenChangeDecimals(tokenWei, currDecimals, targetDecimals) {
    if (targetDecimals === void 0) { targetDecimals = 18; }
    if (currDecimals === targetDecimals) {
        // No conversion needed
        return tokenWei;
    }
    var tokenWeiStr = tokenWei.toString();
    if (currDecimals < targetDecimals) {
        // Scale up: add zeros
        var zeroes = '0'.repeat(targetDecimals - currDecimals);
        return ethers_1.BigNumber.from(tokenWeiStr + zeroes);
    }
    else {
        // Scale down: divide by 10^(currDecimals - targetDecimals)
        var divisor = ethers_1.BigNumber.from(10).pow(currDecimals - targetDecimals);
        return tokenWei.div(divisor);
    }
}
exports.tokenChangeDecimals = tokenChangeDecimals;
function getProviderAndSigner(keystorePath, rpcUrl) {
    return __awaiter(this, void 0, void 0, function () {
        var provider, signer;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    provider = new provider_1.JsonRpcProvider(rpcUrl);
                    return [4 /*yield*/, Utils.addAccountFromKeystore(keystorePath, provider)];
                case 1:
                    signer = _a.sent();
                    return [2 /*return*/, { provider: provider, signer: signer }];
            }
        });
    });
}
exports.getProviderAndSigner = getProviderAndSigner;
function arrayFromAsync(gen) {
    var _a, gen_1, gen_1_1;
    var _b, e_1, _c, _d;
    return __awaiter(this, void 0, void 0, function () {
        var result, elem, e_1_1;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    result = [];
                    _e.label = 1;
                case 1:
                    _e.trys.push([1, 6, 7, 12]);
                    _a = true, gen_1 = __asyncValues(gen);
                    _e.label = 2;
                case 2: return [4 /*yield*/, gen_1.next()];
                case 3:
                    if (!(gen_1_1 = _e.sent(), _b = gen_1_1.done, !_b)) return [3 /*break*/, 5];
                    _d = gen_1_1.value;
                    _a = false;
                    elem = _d;
                    result.push(elem);
                    _e.label = 4;
                case 4:
                    _a = true;
                    return [3 /*break*/, 2];
                case 5: return [3 /*break*/, 12];
                case 6:
                    e_1_1 = _e.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 12];
                case 7:
                    _e.trys.push([7, , 10, 11]);
                    if (!(!_a && !_b && (_c = gen_1.return))) return [3 /*break*/, 9];
                    return [4 /*yield*/, _c.call(gen_1)];
                case 8:
                    _e.sent();
                    _e.label = 9;
                case 9: return [3 /*break*/, 11];
                case 10:
                    if (e_1) throw e_1.error;
                    return [7 /*endfinally*/];
                case 11: return [7 /*endfinally*/];
                case 12: return [2 /*return*/, result];
            }
        });
    });
}
exports.arrayFromAsync = arrayFromAsync;
/**
 *
 * @param fn Function which should resolve a true value eventually.
 * @param pollingInterval Time between function checks in seconds.
 * @param timeout Time until timeout in seconds.
 */
var waitForConditionToBeTrue = function (fn, pollingIntervalSeconds, timeoutSeconds) {
    if (pollingIntervalSeconds === void 0) { pollingIntervalSeconds = 0.2; }
    if (timeoutSeconds === void 0) { timeoutSeconds = 40; }
    return __awaiter(void 0, void 0, void 0, function () {
        var startTime, timeWaited;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    startTime = Date.now();
                    _a.label = 1;
                case 1: return [4 /*yield*/, fn()];
                case 2:
                    if (!!(_a.sent())) return [3 /*break*/, 4];
                    timeWaited = (Date.now() - startTime) / 1000;
                    if (timeWaited > timeoutSeconds) {
                        throw new Error('Timed out before condition became true.');
                    }
                    return [4 /*yield*/, delay(pollingIntervalSeconds)];
                case 3:
                    _a.sent();
                    return [3 /*break*/, 1];
                case 4: return [2 /*return*/];
            }
        });
    });
};
exports.waitForConditionToBeTrue = waitForConditionToBeTrue;
exports.default = Utils = {
    addAccountFromKeystore: addAccountFromKeystore,
    getProviderAndSigner: getProviderAndSigner,
    askPassword: askPassword,
};
//# sourceMappingURL=utils.js.map