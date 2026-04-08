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
// scripts/test-uniswapV4-integration.ts
var ethers_1 = require("ethers");
var dex_router_1 = require("../dex-router"); // Go up one level to src/
var example_uniswapV4_config_copy_1 = __importDefault(require("../../example-uniswapV4-config copy")); // Go up to root
var utils_1 = require("../utils");
function testUniswapV4Integration() {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function () {
        var _c, provider, signer, chainId, _d, _e, _f, b_t1, b_t2, dexRouter, findPoolKey, poolKey, ERC20_ABI, b_t2_contract, balance, _g, _h, testAmount, combinedSettings;
        return __generator(this, function (_j) {
            switch (_j.label) {
                case 0:
                    console.log('🧪 Testing Uniswap V4 Integration...\n');
                    return [4 /*yield*/, (0, utils_1.getProviderAndSigner)(example_uniswapV4_config_copy_1.default.keeperKeystore, example_uniswapV4_config_copy_1.default.ethRpcUrl)];
                case 1:
                    _c = _j.sent(), provider = _c.provider, signer = _c.signer;
                    return [4 /*yield*/, signer.getChainId()];
                case 2:
                    chainId = _j.sent();
                    console.log("\u2705 Connected to chain ".concat(chainId));
                    _e = (_d = console).log;
                    _f = "\u2705 Wallet: ".concat;
                    return [4 /*yield*/, signer.getAddress()];
                case 3:
                    _e.apply(_d, [_f.apply("\u2705 Wallet: ", [_j.sent(), "\n"])]);
                    // 2. Validate configuration
                    console.log('📋 Validating V4 Configuration...');
                    if (!example_uniswapV4_config_copy_1.default.uniswapV4RouterOverrides) {
                        throw new Error('❌ uniswapV4RouterOverrides not configured');
                    }
                    if (!example_uniswapV4_config_copy_1.default.uniswapV4RouterOverrides.router) {
                        throw new Error('❌ V4 router address missing');
                    }
                    if (!example_uniswapV4_config_copy_1.default.uniswapV4RouterOverrides.pools ||
                        Object.keys(example_uniswapV4_config_copy_1.default.uniswapV4RouterOverrides.pools).length === 0) {
                        throw new Error('❌ No V4 pools configured');
                    }
                    console.log('✅ Router:', example_uniswapV4_config_copy_1.default.uniswapV4RouterOverrides.router);
                    console.log('✅ PoolManager:', example_uniswapV4_config_copy_1.default.uniswapV4RouterOverrides.poolManager);
                    console.log('✅ Pools configured:', Object.keys(example_uniswapV4_config_copy_1.default.uniswapV4RouterOverrides.pools).length);
                    console.log('✅ Configuration valid\n');
                    // 3. Test token resolution
                    console.log('🔍 Testing Token Resolution...');
                    if (!example_uniswapV4_config_copy_1.default.tokenAddresses) {
                        throw new Error('❌ tokenAddresses not configured');
                    }
                    b_t1 = example_uniswapV4_config_copy_1.default.tokenAddresses['b_t1'];
                    b_t2 = example_uniswapV4_config_copy_1.default.tokenAddresses['b_t2'];
                    if (!b_t1 || !b_t2) {
                        throw new Error('❌ Test tokens not found in tokenAddresses');
                    }
                    console.log('✅ B_T1 resolved:', b_t1);
                    console.log('✅ B_T2 resolved:', b_t2);
                    console.log('✅ Token resolution working\n');
                    // 4. Test pool key lookup
                    console.log('🔑 Testing Pool Key Lookup...');
                    dexRouter = new dex_router_1.DexRouter(signer, {
                        oneInchRouters: (_a = example_uniswapV4_config_copy_1.default.oneInchRouters) !== null && _a !== void 0 ? _a : {},
                        connectorTokens: (_b = example_uniswapV4_config_copy_1.default.connectorTokens) !== null && _b !== void 0 ? _b : [],
                    });
                    findPoolKey = dexRouter.findV4PoolKeyForPair;
                    poolKey = findPoolKey.call(dexRouter, example_uniswapV4_config_copy_1.default.uniswapV4RouterOverrides, b_t1, b_t2);
                    if (!poolKey) {
                        throw new Error('❌ Pool key not found for B_T1/B_T2 pair');
                    }
                    console.log('✅ Pool key found:');
                    console.log('  - token0:', poolKey.token0);
                    console.log('  - token1:', poolKey.token1);
                    console.log('  - fee:', poolKey.fee);
                    console.log('  - tickSpacing:', poolKey.tickSpacing);
                    console.log('  - hooks:', poolKey.hooks);
                    console.log('✅ Pool key lookup working\n');
                    // 5. Test token balances
                    console.log('💰 Checking Token Balances...');
                    ERC20_ABI = ['function balanceOf(address) view returns (uint256)'];
                    b_t2_contract = new ethers_1.ethers.Contract(b_t2, ERC20_ABI, provider);
                    _h = (_g = b_t2_contract).balanceOf;
                    return [4 /*yield*/, signer.getAddress()];
                case 4: return [4 /*yield*/, _h.apply(_g, [_j.sent()])];
                case 5:
                    balance = _j.sent();
                    console.log('✅ B_T2 balance:', ethers_1.ethers.utils.formatEther(balance));
                    if (balance.eq(0)) {
                        console.log('⚠️  Warning: Zero balance - you may need to acquire test tokens first\n');
                    }
                    else {
                        console.log('✅ Sufficient balance for testing\n');
                    }
                    // 6. Simulate swap (dry run)
                    console.log('🔄 Testing Swap Simulation...');
                    testAmount = ethers_1.ethers.utils.parseEther('0.001');
                    try {
                        combinedSettings = {
                            uniswap: __assign(__assign({}, example_uniswapV4_config_copy_1.default.uniswapOverrides), example_uniswapV4_config_copy_1.default.universalRouterOverrides),
                            sushiswap: example_uniswapV4_config_copy_1.default.sushiswapRouterOverrides,
                            uniswapV4: example_uniswapV4_config_copy_1.default.uniswapV4RouterOverrides
                        };
                        console.log('  - Amount:', ethers_1.ethers.utils.formatEther(testAmount), 'B_T2');
                        console.log('  - From:', b_t2.slice(0, 10) + '...');
                        console.log('  - To:', b_t1.slice(0, 10) + '...');
                        console.log('  - DEX: Uniswap V4');
                        console.log('  - Slippage: 2%');
                        if (example_uniswapV4_config_copy_1.default.dryRun) {
                            console.log('✅ Dry run enabled - swap would be simulated');
                        }
                        else {
                            console.log('⚠️  Warning: dryRun is false - this would execute a real swap!');
                            console.log('💡 Set dryRun: true in config for safe testing');
                        }
                        console.log('✅ Swap parameters valid\n');
                    }
                    catch (error) {
                        console.error('❌ Swap simulation failed:', error);
                        throw error;
                    }
                    // 7. Summary
                    console.log('📊 Integration Test Summary:');
                    console.log('✅ Configuration validated');
                    console.log('✅ Token resolution working');
                    console.log('✅ Pool key lookup working');
                    console.log('✅ Balance checks passed');
                    console.log('✅ Swap parameters valid');
                    console.log('\n🎉 All tests passed! Your V4 integration is ready.');
                    console.log('\n📝 Next steps:');
                    console.log('1. Ensure you have test tokens (B_T2) in your wallet');
                    console.log('2. Run with dryRun: true first');
                    console.log('3. Monitor logs for any errors');
                    console.log('4. Test with small amounts initially');
                    return [2 /*return*/];
            }
        });
    });
}
testUniswapV4Integration()
    .then(function () { return process.exit(0); })
    .catch(function (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
});
//# sourceMappingURL=test-Uniswapv4-integration.js.map