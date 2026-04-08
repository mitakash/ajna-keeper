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
// scripts/debug-v4-pool-state.ts
var ethers_1 = require("ethers");
var example_uniswapV4_config_copy_1 = __importDefault(require("../example-uniswapV4-config copy"));
var utils_1 = require("../src/utils");
// StateView ABI for reading pool state
var STATE_VIEW_ABI = [
    'function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)',
    'function getLiquidity(bytes32 poolId) view returns (uint128)'
];
// Utility to generate pool ID (keccak256 of encoded pool key)
function generatePoolId(poolKey) {
    var encoded = ethers_1.ethers.utils.defaultAbiCoder.encode(['address', 'address', 'uint24', 'int24', 'address'], [poolKey.token0, poolKey.token1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks]);
    return ethers_1.ethers.utils.keccak256(encoded);
}
function debugPoolState() {
    return __awaiter(this, void 0, void 0, function () {
        var provider, stateViewAddress, stateView, poolKey, poolId, _a, sqrtPriceX96, tick, protocolFee, lpFee, liquidity, Q96, price, error_1;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, utils_1.getProviderAndSigner)(example_uniswapV4_config_copy_1.default.keeperKeystore, example_uniswapV4_config_copy_1.default.ethRpcUrl)];
                case 1:
                    provider = (_b.sent()).provider;
                    stateViewAddress = '0xa3c0c9b65bad0b08107aa264b0f3db444b867a71';
                    stateView = new ethers_1.ethers.Contract(stateViewAddress, STATE_VIEW_ABI, provider);
                    poolKey = example_uniswapV4_config_copy_1.default.uniswapV4RouterOverrides.pools['B_T2-B_T4'];
                    console.log('🔍 Checking V4 Pool State...\n');
                    console.log('StateView:', stateViewAddress);
                    console.log('Pool Key:');
                    console.log('  token0:', poolKey.token0);
                    console.log('  token1:', poolKey.token1);
                    console.log('  fee:', poolKey.fee);
                    console.log('  tickSpacing:', poolKey.tickSpacing);
                    console.log('  hooks:', poolKey.hooks);
                    console.log('');
                    _b.label = 2;
                case 2:
                    _b.trys.push([2, 5, , 6]);
                    poolId = generatePoolId(poolKey);
                    console.log('Pool ID:', poolId);
                    console.log('');
                    return [4 /*yield*/, stateView.getSlot0(poolId)];
                case 3:
                    _a = _b.sent(), sqrtPriceX96 = _a[0], tick = _a[1], protocolFee = _a[2], lpFee = _a[3];
                    console.log('📊 Pool State:');
                    console.log('  sqrtPriceX96:', sqrtPriceX96.toString());
                    console.log('  tick:', tick.toString());
                    console.log('  protocolFee:', protocolFee.toString());
                    console.log('  lpFee:', lpFee.toString());
                    return [4 /*yield*/, stateView.getLiquidity(poolId)];
                case 4:
                    liquidity = _b.sent();
                    console.log('  Liquidity:', liquidity.toString());
                    console.log('');
                    if (liquidity.eq(0)) {
                        console.log('❌ CRITICAL: Pool has ZERO liquidity!');
                        console.log('');
                        console.log('This is why your swap is failing. Solutions:');
                        console.log('');
                        console.log('1. Add liquidity to this pool using Uniswap V4 UI or contracts');
                        console.log('2. Use a different pool (like B_T3-B_T4) that has liquidity');
                        console.log('3. If this is a test pool, you need to provide liquidity first');
                        console.log('');
                        console.log('To add liquidity, you need to:');
                        console.log('  - Call PoolManager.modifyLiquidity() with appropriate parameters');
                        console.log('  - Or use a liquidity manager contract if available');
                    }
                    else {
                        console.log('✅ Pool has liquidity:', ethers_1.ethers.utils.formatUnits(liquidity, 0));
                        console.log('');
                        console.log('Pool should be able to execute swaps.');
                        console.log('If swaps are still failing, check:');
                        console.log('  - Price slippage limits');
                        console.log('  - Router approval');
                        console.log('  - Correct router address');
                    }
                    Q96 = ethers_1.ethers.BigNumber.from(2).pow(96);
                    price = sqrtPriceX96.mul(sqrtPriceX96).div(Q96).div(Q96);
                    console.log('');
                    console.log('Pool price (raw):', price.toString());
                    return [3 /*break*/, 6];
                case 5:
                    error_1 = _b.sent();
                    console.error('❌ Error reading pool state:', error_1);
                    console.log('\nPossible issues:');
                    console.log('1. Pool does not exist (not initialized)');
                    console.log('2. StateView address is incorrect');
                    console.log('3. Pool ID calculation is wrong');
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    });
}
debugPoolState()
    .then(function () { return process.exit(0); })
    .catch(function (error) {
    console.error('Debug failed:', error);
    process.exit(1);
});
//# sourceMappingURL=debug-v4-poolstate.js.map