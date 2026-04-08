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
var ethers_1 = require("ethers");
var config = require('../example-uniswapV4-config copy');
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var provider, poolManagerAddr, poolManager, pools, _i, _a, _b, poolName, poolConfig, pc, poolKey, slot0, tick, price, liquidity, liqErr_1, error_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    provider = new ethers_1.ethers.providers.JsonRpcProvider(config.default.rpcUrl);
                    poolManagerAddr = config.default.uniswapV4RouterOverrides.poolManager;
                    console.log('🔍 Checking All V4 Pools\n');
                    console.log('PoolManager:', poolManagerAddr);
                    console.log('='.repeat(80) + '\n');
                    poolManager = new ethers_1.ethers.Contract(poolManagerAddr, [
                        'function getSlot0(tuple(tuple(address),tuple(address),uint24,int24,address) key) external view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)',
                        'function getLiquidity(tuple(tuple(address),tuple(address),uint24,int24,address) key) external view returns (uint128)',
                    ], provider);
                    pools = config.default.uniswapV4RouterOverrides.pools;
                    _i = 0, _a = Object.entries(pools);
                    _c.label = 1;
                case 1:
                    if (!(_i < _a.length)) return [3 /*break*/, 11];
                    _b = _a[_i], poolName = _b[0], poolConfig = _b[1];
                    pc = poolConfig;
                    console.log("\n\uD83D\uDCCA ".concat(poolName));
                    console.log('-'.repeat(80));
                    console.log("Token0: ".concat(pc.token0));
                    console.log("Token1: ".concat(pc.token1));
                    console.log("Fee: ".concat(pc.fee, " (").concat(pc.fee / 10000, "%)"));
                    console.log("Tick Spacing: ".concat(pc.tickSpacing));
                    console.log("Hooks: ".concat(pc.hooks));
                    poolKey = [
                        [pc.token0],
                        [pc.token1],
                        pc.fee,
                        pc.tickSpacing,
                        pc.hooks
                    ];
                    _c.label = 2;
                case 2:
                    _c.trys.push([2, 8, , 9]);
                    return [4 /*yield*/, poolManager.getSlot0(poolKey)];
                case 3:
                    slot0 = _c.sent();
                    console.log('\n✅ POOL EXISTS!');
                    console.log('  sqrtPriceX96:', slot0.sqrtPriceX96.toString());
                    console.log('  tick:', slot0.tick.toString());
                    console.log('  protocolFee:', slot0.protocolFee.toString());
                    console.log('  lpFee:', slot0.lpFee.toString());
                    tick = slot0.tick.toNumber();
                    price = Math.pow(1.0001, tick);
                    console.log('  price (1.0001^tick):', price.toFixed(6));
                    _c.label = 4;
                case 4:
                    _c.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, poolManager.getLiquidity(poolKey)];
                case 5:
                    liquidity = _c.sent();
                    console.log('  liquidity:', liquidity.toString());
                    if (liquidity.eq(0)) {
                        console.log('\n⚠️  WARNING: Pool exists but has ZERO liquidity!');
                        console.log('   Swaps will fail without liquidity.');
                    }
                    else {
                        console.log('\n✅ Pool has liquidity - ready for swaps!');
                    }
                    return [3 /*break*/, 7];
                case 6:
                    liqErr_1 = _c.sent();
                    console.log('  liquidity: (could not query)');
                    return [3 /*break*/, 7];
                case 7: return [3 /*break*/, 9];
                case 8:
                    error_1 = _c.sent();
                    console.log('\n❌ POOL DOES NOT EXIST');
                    console.log('Error:', error_1.message.substring(0, 200));
                    console.log('\n⚠️  This pool needs to be initialized before use!');
                    return [3 /*break*/, 9];
                case 9:
                    console.log('\n' + '='.repeat(80));
                    _c.label = 10;
                case 10:
                    _i++;
                    return [3 /*break*/, 1];
                case 11:
                    console.log('\n\n📝 SUMMARY\n');
                    console.log('Check the results above to ensure all pools:');
                    console.log('  1. ✅ Exist (initialized)');
                    console.log('  2. ✅ Have liquidity > 0');
                    console.log('  3. ✅ Match your expected configuration');
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(console.error);
//# sourceMappingURL=check-all-v4-pools.js.map