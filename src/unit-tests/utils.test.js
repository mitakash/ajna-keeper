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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var ethers_1 = require("ethers");
var utils_1 = require("../utils");
var utils_2 = __importDefault(require("../utils"));
var sinon_1 = __importDefault(require("sinon"));
var mockAddress = '0x123456abcabc123456abcabcd123456abcdabcd1';
describe('bigToWadNumber', function () {
    var convertsWeiToEth = function (inStr, out) {
        it("converts wei:".concat(inStr, " to Eth:").concat(out.toString()), function () {
            (0, chai_1.expect)((0, utils_1.weiToDecimaled)(ethers_1.BigNumber.from(inStr))).to.equal(out);
        });
    };
    convertsWeiToEth('0', 0);
    convertsWeiToEth('10000000000000', 1e-5);
    convertsWeiToEth('11000000000000', 1.1e-5);
    convertsWeiToEth('100000000000000000', 0.1);
    convertsWeiToEth('110000000000000000', 0.11);
    convertsWeiToEth('1000000000000000000', 1);
    convertsWeiToEth('1100000000000000000', 1.1);
    convertsWeiToEth('10000000000000000000', 10);
    convertsWeiToEth('11000000000000000000', 11);
    convertsWeiToEth('100000000000000000000000', 1e5);
    convertsWeiToEth('110000000000000000000000', 1.1e5);
    convertsWeiToEth('-10000000000000', -1e-5);
    convertsWeiToEth('-11000000000000', -1.1e-5);
    convertsWeiToEth('-100000000000000000', -0.1);
    convertsWeiToEth('-110000000000000000', -0.11);
    convertsWeiToEth('-1000000000000000000', -1);
    convertsWeiToEth('-1100000000000000000', -1.1);
    convertsWeiToEth('-10000000000000000000', -10);
    convertsWeiToEth('-11000000000000000000', -11);
    convertsWeiToEth('-110000000000000000000000', -1.1e5);
    convertsWeiToEth('-111111111111100000000000', -1.111111111111e5);
});
describe('weiToDecimaled', function () {
    var convertsEthToWei = function (inNumb, outStr) {
        it("converts Eth:".concat(inNumb.toString(), " to wei:").concat(outStr), function () {
            (0, chai_1.expect)((0, utils_1.decimaledToWei)(inNumb).toString()).to.equal(outStr);
        });
    };
    convertsEthToWei(0, '0');
    convertsEthToWei(1e-5, '10000000000000');
    convertsEthToWei(1.1e-5, '11000000000000');
    convertsEthToWei(0.1, '100000000000000000');
    convertsEthToWei(0.11, '110000000000000000');
    convertsEthToWei(1, '1000000000000000000');
    convertsEthToWei(1.1, '1100000000000000000');
    convertsEthToWei(10, '10000000000000000000');
    convertsEthToWei(11, '11000000000000000000');
    convertsEthToWei(1e5, '100000000000000000000000');
    convertsEthToWei(1.1e5, '110000000000000000000000');
    convertsEthToWei(-1e-5, '-10000000000000');
    convertsEthToWei(-1.1e-5, '-11000000000000');
    convertsEthToWei(-0.1, '-100000000000000000');
    convertsEthToWei(-0.11, '-110000000000000000');
    convertsEthToWei(-1, '-1000000000000000000');
    convertsEthToWei(-1.1, '-1100000000000000000');
    convertsEthToWei(-10, '-10000000000000000000');
    convertsEthToWei(-11, '-11000000000000000000');
    convertsEthToWei(-1.1e5, '-110000000000000000000000');
});
describe('overrideMulticall', function () {
    var mockFungiblePool;
    var mockChainConfig;
    beforeEach(function () {
        mockFungiblePool = {
            ethcallProvider: {
                multicall3: {},
            },
        };
        mockChainConfig = {
            multicallAddress: mockAddress,
            multicallBlock: 100,
        };
    });
    it('should override multicall3 if multicallAddress and multicallBlock are defined', function () {
        (0, utils_1.overrideMulticall)(mockFungiblePool, mockChainConfig);
        (0, chai_1.expect)(mockFungiblePool.ethcallProvider.multicall3).deep.equal({
            address: mockChainConfig.multicallAddress,
            block: mockChainConfig.multicallBlock,
        });
    });
    it('should not modify multicall3 if chainConfig is missing required fields', function () {
        var originalMulticall = __assign({}, mockFungiblePool.ethcallProvider.multicall3);
        (0, utils_1.overrideMulticall)(mockFungiblePool, {});
        (0, chai_1.expect)(mockFungiblePool.ethcallProvider.multicall3).deep.equal(originalMulticall);
    });
});
describe('getProviderAndSigner', function () {
    var _this = this;
    var fakeRpcUrl = 'http://localhost:8545';
    var fakeKeystorePath = '/fake/path/keystore.json';
    var addAccountStub;
    var fakeWallet;
    beforeEach(function () { return __awaiter(_this, void 0, void 0, function () {
        var _this = this;
        return __generator(this, function (_a) {
            fakeWallet = {
                address: '0x1234567890abcdef',
                provider: new ethers_1.providers.JsonRpcProvider(fakeRpcUrl),
                signTransaction: sinon_1.default.stub().resolves('0xSignedTransaction'),
                connect: sinon_1.default.stub().returnsThis(),
                signMessage: sinon_1.default.stub().resolves('0xSignedMessage'),
            };
            addAccountStub = sinon_1.default
                .stub(utils_2.default, 'addAccountFromKeystore')
                .callsFake(function () { return __awaiter(_this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, fakeWallet];
                });
            }); });
            return [2 /*return*/];
        });
    }); });
    afterEach(function () {
        sinon_1.default.restore();
    });
    it('should return provider and signer', function () {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, utils_2.default.getProviderAndSigner(fakeKeystorePath, fakeRpcUrl)];
                    case 1:
                        result = _a.sent();
                        (0, chai_1.expect)(result).to.have.property('provider');
                        (0, chai_1.expect)(result).to.have.property('signer');
                        (0, chai_1.expect)(addAccountStub.calledOnceWith(fakeKeystorePath)).to.be.true;
                        (0, chai_1.expect)(result.signer).to.have.property('address', fakeWallet.address);
                        return [2 /*return*/];
                }
            });
        });
    });
});
describe('tokenChangeDecimals', function () {
    var testConvertDecimals = function (tokenWei, currDecimals, targetDecimals, expectedStr) {
        return it("Converts ".concat(tokenWei, " with ").concat(currDecimals, " decimals to ").concat(expectedStr, " with ").concat(targetDecimals, " decimals"), function () {
            var result = (0, utils_1.tokenChangeDecimals)(ethers_1.BigNumber.from(tokenWei), currDecimals, targetDecimals);
            (0, chai_1.expect)(result.toString()).equals(expectedStr);
        });
    };
    testConvertDecimals('1000000', 6, 18, '1000000000000000000');
    testConvertDecimals('1000000000000000000', 18, 6, '1000000');
    testConvertDecimals('1000000000000000000', 18, 18, '1000000000000000000');
});
describe('waitForConditionToBeTrue', function () {
    it('Waits for condition to be true', function () {
        return __awaiter(this, void 0, void 0, function () {
            var waitTimeSeconds, startTime, elapsedTimeMs;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.timeout(10000);
                        waitTimeSeconds = 3;
                        startTime = Date.now();
                        return [4 /*yield*/, (0, utils_1.waitForConditionToBeTrue)(function () { return __awaiter(_this, void 0, void 0, function () {
                                var elapsedTimeSeconds;
                                return __generator(this, function (_a) {
                                    elapsedTimeSeconds = (Date.now() - startTime) / 1000;
                                    return [2 /*return*/, elapsedTimeSeconds > waitTimeSeconds];
                                });
                            }); })];
                    case 1:
                        _a.sent();
                        elapsedTimeMs = Date.now() - startTime;
                        (0, chai_1.expect)(elapsedTimeMs).gte(waitTimeSeconds * 1000);
                        return [2 /*return*/];
                }
            });
        });
    });
    it('respects pollingInterval', function () {
        return __awaiter(this, void 0, void 0, function () {
            var waitTimeSeconds, startTime, fnCalledCount;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.timeout(10000);
                        waitTimeSeconds = 3;
                        startTime = Date.now();
                        fnCalledCount = 0;
                        return [4 /*yield*/, (0, utils_1.waitForConditionToBeTrue)(function () { return __awaiter(_this, void 0, void 0, function () {
                                var elapsedTimeSeconds;
                                return __generator(this, function (_a) {
                                    fnCalledCount++;
                                    elapsedTimeSeconds = (Date.now() - startTime) / 1000;
                                    return [2 /*return*/, elapsedTimeSeconds > waitTimeSeconds];
                                });
                            }); }, 0.1)];
                    case 1:
                        _a.sent();
                        (0, chai_1.expect)(fnCalledCount).lte(31).and.gte(29);
                        return [2 /*return*/];
                }
            });
        });
    });
    it('times out', function () {
        return __awaiter(this, void 0, void 0, function () {
            var waitTimeSeconds, startTime, waitForFn;
            var _this = this;
            return __generator(this, function (_a) {
                this.timeout(10000);
                waitTimeSeconds = 3;
                startTime = Date.now();
                waitForFn = (0, utils_1.waitForConditionToBeTrue)(function () { return __awaiter(_this, void 0, void 0, function () {
                    var elapsedTimeSeconds;
                    return __generator(this, function (_a) {
                        elapsedTimeSeconds = (Date.now() - startTime) / 1000;
                        return [2 /*return*/, elapsedTimeSeconds > waitTimeSeconds];
                    });
                }); }, 0.1, 1);
                (0, chai_1.expect)(waitForFn).to.be.rejectedWith('Timed out before condition became true.');
                return [2 /*return*/];
            });
        });
    });
});
//# sourceMappingURL=utils.test.js.map