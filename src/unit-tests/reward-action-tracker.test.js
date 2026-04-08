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
var v3_sdk_1 = require("@uniswap/v3-sdk");
var chai_1 = require("chai");
var ethers_1 = require("ethers");
var sinon_1 = __importDefault(require("sinon"));
var config_types_1 = require("../config-types");
var test_config_1 = require("../integration-tests/test-config");
var reward_action_tracker_1 = require("../reward-action-tracker");
var utils_1 = require("../utils");
// Helper function to create a mock KeeperConfig for testing
function createMockKeeperConfig(overrides) {
    if (overrides === void 0) { overrides = {}; }
    return __assign({ 
        // Required fields with mock values
        ethRpcUrl: 'mock://rpc', logLevel: 'info', subgraphUrl: 'mock://subgraph', keeperKeystore: '/path/to/mock-keystore.json', keeperTaker: '0x0000000000000000000000000000000000000000', delayBetweenRuns: 0, delayBetweenActions: 0, dryRun: true, pools: [], coinGeckoApiKey: 'mock-api-key', ajna: {
            erc20PoolFactory: '0x0000000000000000000000000000000000000000',
            erc721PoolFactory: '0x0000000000000000000000000000000000000000',
            poolUtils: '0x0000000000000000000000000000000000000000',
            positionManager: '0x0000000000000000000000000000000000000000',
            ajnaToken: '0x0000000000000000000000000000000000000000',
            grantFund: '',
            burnWrapper: '',
            lenderHelper: '',
        } }, overrides);
}
describe('deterministicJsonStringify', function () {
    it('serializes a shallow object in a repeatable way', function () {
        var obj1 = { hello: 'world' };
        obj1.foo = 'bar';
        var result1 = (0, reward_action_tracker_1.deterministicJsonStringify)(obj1);
        var obj2 = { foo: 'bar' };
        obj2.hello = 'world';
        var result2 = (0, reward_action_tracker_1.deterministicJsonStringify)(obj1);
        (0, chai_1.expect)(result1).equals(result2).equals('{"foo":"bar","hello":"world"}');
    });
});
describe('RewardActionTracker', function () {
    var dexRouter;
    beforeEach(function () { });
    afterEach(function () {
        sinon_1.default.restore();
    });
    it('Swaps to eth and clears entry after', function () { return __awaiter(void 0, void 0, void 0, function () {
        var signer, wethAddress, tokenToSwap, et, exchangeAction, amount, callArgs;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    signer = ethers_1.Wallet.createRandom();
                    sinon_1.default.stub(signer, 'getChainId').resolves(1);
                    dexRouter = {
                        swap: sinon_1.default.stub().resolves({ success: true }),
                    };
                    wethAddress = test_config_1.MAINNET_CONFIG.WETH_ADDRESS;
                    tokenToSwap = test_config_1.MAINNET_CONFIG.WBTC_USDC_POOL.collateralAddress;
                    et = new reward_action_tracker_1.RewardActionTracker(signer, createMockKeeperConfig({
                        oneInchRouters: { 1: '0x1111111254EEB25477B68fb85Ed929f73A960582' },
                        tokenAddresses: { weth: wethAddress },
                        delayBetweenActions: 0,
                    }), dexRouter);
                    exchangeAction = {
                        action: config_types_1.RewardActionLabel.EXCHANGE,
                        address: tokenToSwap,
                        targetToken: 'weth',
                        slippage: 1,
                        dexProvider: config_types_1.PostAuctionDex.ONEINCH,
                        fee: v3_sdk_1.FeeAmount.MEDIUM,
                    };
                    amount = (0, utils_1.decimaledToWei)(1);
                    et.addToken(exchangeAction, tokenToSwap, amount);
                    return [4 /*yield*/, et.handleAllTokens()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, et.handleAllTokens()];
                case 2:
                    _a.sent();
                    console.log('DexRouter swap call count:', dexRouter.swap.callCount);
                    // The swap should have been called
                    (0, chai_1.expect)(dexRouter.swap.callCount).to.be.greaterThan(0);
                    console.log('Actual call args:', dexRouter.swap.getCall(0).args);
                    (0, chai_1.expect)(dexRouter.swap.calledOnce).to.be.true;
                    callArgs = dexRouter.swap.getCall(0).args;
                    (0, chai_1.expect)(callArgs[0]).to.equal(1); // chainId
                    (0, chai_1.expect)(callArgs[1]).to.deep.equal(amount); // amount - use deep.equal for BigNumber
                    (0, chai_1.expect)(callArgs[2]).to.equal(tokenToSwap); // tokenIn
                    (0, chai_1.expect)(callArgs[3]).to.equal(wethAddress); // tokenOut
                    (0, chai_1.expect)(callArgs[4]).to.equal(signer.address); // to
                    (0, chai_1.expect)(callArgs[5]).to.equal(config_types_1.PostAuctionDex.ONEINCH); // dexProvider
                    (0, chai_1.expect)(callArgs[6]).to.equal(1); // slippage
                    (0, chai_1.expect)(callArgs[7]).to.equal(v3_sdk_1.FeeAmount.MEDIUM); // feeAmount
                    // Check the combinedSettings structure - will debug this based on console output
                    console.log('Combined settings (arg 8):', JSON.stringify(callArgs[8], null, 2));
                    return [2 /*return*/];
            }
        });
    }); });
    it('Handles swap failure properly with retries', function () { return __awaiter(void 0, void 0, void 0, function () {
        var signer, wethAddress, tokenToSwap, et, exchangeAction, amount;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    signer = ethers_1.Wallet.createRandom();
                    sinon_1.default.stub(signer, 'getChainId').resolves(1);
                    // Mock a dexRouter that fails with a resolved error response
                    dexRouter = {
                        swap: sinon_1.default.stub().resolves({ success: false, error: 'Swap failed' }),
                    };
                    wethAddress = test_config_1.MAINNET_CONFIG.WETH_ADDRESS;
                    tokenToSwap = test_config_1.MAINNET_CONFIG.WBTC_USDC_POOL.collateralAddress;
                    et = new reward_action_tracker_1.RewardActionTracker(signer, createMockKeeperConfig({
                        oneInchRouters: { 1: '0x1111111254EEB25477B68fb85Ed929f73A960582' },
                        tokenAddresses: { weth: wethAddress },
                        delayBetweenActions: 0,
                    }), dexRouter);
                    exchangeAction = {
                        action: config_types_1.RewardActionLabel.EXCHANGE,
                        address: tokenToSwap,
                        targetToken: 'weth',
                        slippage: 1,
                        dexProvider: config_types_1.PostAuctionDex.ONEINCH,
                        fee: v3_sdk_1.FeeAmount.MEDIUM,
                    };
                    amount = (0, utils_1.decimaledToWei)(1);
                    et.addToken(exchangeAction, tokenToSwap, amount);
                    // First call - should attempt but not throw error
                    return [4 /*yield*/, et.handleAllTokens()];
                case 1:
                    // First call - should attempt but not throw error
                    _a.sent();
                    (0, chai_1.expect)(dexRouter.swap.calledOnce).to.be.true;
                    // Verify token is still in queue for retries - reset the stub's history
                    dexRouter.swap.resetHistory();
                    // Second call - should attempt again
                    return [4 /*yield*/, et.handleAllTokens()];
                case 2:
                    // Second call - should attempt again
                    _a.sent();
                    (0, chai_1.expect)(dexRouter.swap.calledOnce).to.be.true;
                    // Third call - should attempt again
                    dexRouter.swap.resetHistory();
                    return [4 /*yield*/, et.handleAllTokens()];
                case 3:
                    _a.sent();
                    (0, chai_1.expect)(dexRouter.swap.calledOnce).to.be.true;
                    // After MAX_RETRY_COUNT (3), the token should be removed
                    dexRouter.swap.resetHistory();
                    return [4 /*yield*/, et.handleAllTokens()];
                case 4:
                    _a.sent();
                    // No more calls should happen since token should be removed
                    (0, chai_1.expect)(dexRouter.swap.called).to.be.false;
                    return [2 /*return*/];
            }
        });
    }); });
});
//# sourceMappingURL=reward-action-tracker.test.js.map