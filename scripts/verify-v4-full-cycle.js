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
var ethers_1 = require("ethers");
var example_uniswapV4_config_copy_1 = __importDefault(require("../example-uniswapV4-config copy"));
var utils_1 = require("../src/utils");
/**
 * Full V4 Integration Verification Script
 *
 * This script verifies all components needed for Uniswap V4 post-auction swaps:
 * 1. Wallet has sufficient ETH for gas
 * 2. Wallet has B_T2 tokens for kick bonds
 * 3. V4 pool exists and has liquidity
 * 4. Config is properly set up for V4 swaps
 */
function verifyV4FullCycle() {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    return __awaiter(this, void 0, void 0, function () {
        var _q, provider, signer, signerAddress, chainId, ERC20_ABI, ethBalance, ethFormatted, minEthRequired, b_t2, b_t2Contract, b_t2Balance, b_t2Decimals, b_t2Symbol, minB_t2Required, _i, _r, pool, allowance, poolManager, _s, _t, _u, poolName, poolConfig, _v, _w, pool, action, checks, allPassed;
        return __generator(this, function (_x) {
            switch (_x.label) {
                case 0:
                    console.log('🔍 Verifying Uniswap V4 Full Integration...\n');
                    console.log('='.repeat(60));
                    return [4 /*yield*/, (0, utils_1.getProviderAndSigner)(example_uniswapV4_config_copy_1.default.keeperKeystore, example_uniswapV4_config_copy_1.default.ethRpcUrl)];
                case 1:
                    _q = _x.sent(), provider = _q.provider, signer = _q.signer;
                    return [4 /*yield*/, signer.getAddress()];
                case 2:
                    signerAddress = _x.sent();
                    return [4 /*yield*/, signer.getChainId()];
                case 3:
                    chainId = _x.sent();
                    console.log("\n\uD83D\uDCCB Network Info:");
                    console.log("   Chain ID: ".concat(chainId));
                    console.log("   Keeper Wallet: ".concat(signerAddress));
                    console.log("   RPC: ".concat(example_uniswapV4_config_copy_1.default.ethRpcUrl.slice(0, 50), "..."));
                    ERC20_ABI = [
                        'function balanceOf(address) view returns (uint256)',
                        'function decimals() view returns (uint8)',
                        'function symbol() view returns (string)',
                        'function allowance(address owner, address spender) view returns (uint256)',
                    ];
                    // 1. Check ETH Balance
                    console.log("\n".concat('='.repeat(60)));
                    console.log('1️⃣  ETH Balance Check');
                    console.log('='.repeat(60));
                    return [4 /*yield*/, provider.getBalance(signerAddress)];
                case 4:
                    ethBalance = _x.sent();
                    ethFormatted = ethers_1.ethers.utils.formatEther(ethBalance);
                    console.log("   Balance: ".concat(ethFormatted, " ETH"));
                    minEthRequired = ethers_1.ethers.utils.parseEther('0.001');
                    if (ethBalance.lt(minEthRequired)) {
                        console.log("   \u274C INSUFFICIENT! Need at least 0.001 ETH for gas");
                        console.log("   \uD83D\uDCDD Action: Send ".concat(ethers_1.ethers.utils.formatEther(minEthRequired.sub(ethBalance)), " more ETH to ").concat(signerAddress));
                    }
                    else {
                        console.log("   \u2705 Sufficient for transaction gas");
                    }
                    // 2. Check B_T2 Token Balance (for kick bonds)
                    console.log("\n".concat('='.repeat(60)));
                    console.log('2️⃣  B_T2 Token Balance Check (for kick bonds)');
                    console.log('='.repeat(60));
                    b_t2 = example_uniswapV4_config_copy_1.default.tokenAddresses['b_t2'];
                    b_t2Contract = new ethers_1.ethers.Contract(b_t2, ERC20_ABI, provider);
                    return [4 /*yield*/, b_t2Contract.balanceOf(signerAddress)];
                case 5:
                    b_t2Balance = _x.sent();
                    return [4 /*yield*/, b_t2Contract.decimals()];
                case 6:
                    b_t2Decimals = _x.sent();
                    return [4 /*yield*/, b_t2Contract.symbol()];
                case 7:
                    b_t2Symbol = _x.sent();
                    console.log("   Token: ".concat(b_t2Symbol, " (").concat(b_t2, ")"));
                    console.log("   Balance: ".concat(ethers_1.ethers.utils.formatUnits(b_t2Balance, b_t2Decimals), " ").concat(b_t2Symbol));
                    minB_t2Required = ethers_1.ethers.utils.parseUnits('1', b_t2Decimals);
                    if (b_t2Balance.lt(minB_t2Required)) {
                        console.log("   \u274C INSUFFICIENT! Need at least 1 ".concat(b_t2Symbol, " for kick bonds"));
                        console.log("   \uD83D\uDCDD Action: Send at least 10 ".concat(b_t2Symbol, " tokens to ").concat(signerAddress));
                    }
                    else {
                        console.log("   \u2705 Sufficient for kick bonds");
                    }
                    // 3. Check Pool Approvals
                    console.log("\n".concat('='.repeat(60)));
                    console.log('3️⃣  Ajna Pool Approval Check');
                    console.log('='.repeat(60));
                    _i = 0, _r = example_uniswapV4_config_copy_1.default.pools;
                    _x.label = 8;
                case 8:
                    if (!(_i < _r.length)) return [3 /*break*/, 11];
                    pool = _r[_i];
                    console.log("\n   Pool: ".concat(pool.name));
                    console.log("   Address: ".concat(pool.address));
                    return [4 /*yield*/, b_t2Contract.allowance(signerAddress, pool.address)];
                case 9:
                    allowance = _x.sent();
                    console.log("   Allowance: ".concat(ethers_1.ethers.utils.formatUnits(allowance, b_t2Decimals), " ").concat(b_t2Symbol));
                    if (allowance.lt(ethers_1.ethers.utils.parseUnits('100', b_t2Decimals))) {
                        console.log("   \u26A0\uFE0F  Low allowance - keeper will auto-approve when needed");
                    }
                    else {
                        console.log("   \u2705 Sufficient allowance");
                    }
                    _x.label = 10;
                case 10:
                    _i++;
                    return [3 /*break*/, 8];
                case 11:
                    // 4. Check V4 Pool Configuration
                    console.log("\n".concat('='.repeat(60)));
                    console.log('4️⃣  Uniswap V4 Pool Configuration');
                    console.log('='.repeat(60));
                    poolManager = (_a = example_uniswapV4_config_copy_1.default.uniswapV4RouterOverrides) === null || _a === void 0 ? void 0 : _a.poolManager;
                    if (poolManager && example_uniswapV4_config_copy_1.default.uniswapV4RouterOverrides) {
                        console.log("   PoolManager: ".concat(poolManager));
                        console.log("   Pools Configured: ".concat(Object.keys(((_b = example_uniswapV4_config_copy_1.default.uniswapV4RouterOverrides) === null || _b === void 0 ? void 0 : _b.pools) || {}).length));
                        for (_s = 0, _t = Object.entries(((_c = example_uniswapV4_config_copy_1.default.uniswapV4RouterOverrides) === null || _c === void 0 ? void 0 : _c.pools) || {}); _s < _t.length; _s++) {
                            _u = _t[_s], poolName = _u[0], poolConfig = _u[1];
                            console.log("\n   \uD83D\uDCCA ".concat(poolName, ":"));
                            console.log("      Token0: ".concat(poolConfig.token0));
                            console.log("      Token1: ".concat(poolConfig.token1));
                            console.log("      Fee: ".concat(poolConfig.fee, " (").concat(poolConfig.fee / 10000, "%)"));
                            console.log("      Tick Spacing: ".concat(poolConfig.tickSpacing));
                            console.log("      Hooks: ".concat(poolConfig.hooks));
                            console.log("      \u2705 Pool configured");
                        }
                    }
                    else {
                        console.log("   \u274C No PoolManager configured!");
                    }
                    // 5. Verify Config Settings
                    console.log("\n".concat('='.repeat(60)));
                    console.log('5️⃣  Configuration Verification');
                    console.log('='.repeat(60));
                    console.log("\n   Keeper Settings:");
                    console.log("   - Dry Run: ".concat(example_uniswapV4_config_copy_1.default.dryRun ? '⚠️  YES (no real transactions)' : '✅ NO (live mode)'));
                    console.log("   - Delay Between Runs: ".concat(example_uniswapV4_config_copy_1.default.delayBetweenRuns, "s"));
                    console.log("   - Delay Between Actions: ".concat(example_uniswapV4_config_copy_1.default.delayBetweenActions, "s"));
                    console.log("   - Log Level: ".concat(example_uniswapV4_config_copy_1.default.logLevel));
                    console.log("\n   Factory Deployment:");
                    console.log("   - KeeperTakerFactory: ".concat(example_uniswapV4_config_copy_1.default.keeperTakerFactory || '❌ NOT SET'));
                    console.log("   - UniswapV4 Taker: ".concat(((_d = example_uniswapV4_config_copy_1.default.takerContracts) === null || _d === void 0 ? void 0 : _d.UniswapV4) || '❌ NOT SET'));
                    console.log("\n   V4 Router Settings:");
                    console.log("   - Universal Router: ".concat(((_e = example_uniswapV4_config_copy_1.default.uniswapV4RouterOverrides) === null || _e === void 0 ? void 0 : _e.router) || '❌ NOT SET'));
                    console.log("   - PoolManager: ".concat(((_f = example_uniswapV4_config_copy_1.default.uniswapV4RouterOverrides) === null || _f === void 0 ? void 0 : _f.poolManager) || '❌ NOT SET'));
                    console.log("   - Default Slippage: ".concat(((_g = example_uniswapV4_config_copy_1.default.uniswapV4RouterOverrides) === null || _g === void 0 ? void 0 : _g.defaultSlippage) || 'N/A', "%"));
                    console.log("   - Pools Configured: ".concat(Object.keys(((_h = example_uniswapV4_config_copy_1.default.uniswapV4RouterOverrides) === null || _h === void 0 ? void 0 : _h.pools) || {}).length));
                    console.log("\n   Pool Configurations:");
                    for (_v = 0, _w = example_uniswapV4_config_copy_1.default.pools; _v < _w.length; _v++) {
                        pool = _w[_v];
                        console.log("\n   \uD83D\uDCCA ".concat(pool.name, ":"));
                        console.log("      - Address: ".concat(pool.address));
                        console.log("      - Kick Enabled: ".concat(pool.kick ? '✅ YES' : '❌ NO'));
                        if (pool.kick) {
                            console.log("        \u2022 minDebt: ".concat(pool.kick.minDebt));
                            console.log("        \u2022 priceFactor: ".concat(pool.kick.priceFactor));
                        }
                        console.log("      - Take Enabled: ".concat(pool.take ? '✅ YES' : '❌ NO'));
                        if (pool.take) {
                            console.log("        \u2022 liquiditySource: ".concat(pool.take.liquiditySource));
                            console.log("        \u2022 marketPriceFactor: ".concat(pool.take.marketPriceFactor));
                        }
                        console.log("      - Post-Auction Swap: ".concat(((_j = pool.collectLpReward) === null || _j === void 0 ? void 0 : _j.rewardActionCollateral) ? '✅ CONFIGURED' : '❌ NOT CONFIGURED'));
                        if ((_k = pool.collectLpReward) === null || _k === void 0 ? void 0 : _k.rewardActionCollateral) {
                            action = pool.collectLpReward.rewardActionCollateral;
                            console.log("        \u2022 Action: ".concat(action.action));
                            console.log("        \u2022 DEX: ".concat(action.dexProvider || 'N/A'));
                            console.log("        \u2022 Target Token: ".concat(action.targetToken || 'N/A'));
                            console.log("        \u2022 Slippage: ".concat(action.slippage || 'N/A', "%"));
                            if (action.dexProvider && action.dexProvider !== 'uniswap_v4') {
                                console.log("        \u26A0\uFE0F  WARNING: Not using uniswap_v4!");
                            }
                            else if (action.dexProvider === 'uniswap_v4') {
                                console.log("        \u2705 Using Uniswap V4");
                            }
                        }
                    }
                    // 6. Summary
                    console.log("\n".concat('='.repeat(60)));
                    console.log('📊 SUMMARY');
                    console.log('='.repeat(60));
                    checks = {
                        eth: ethBalance.gte(minEthRequired),
                        b_t2: b_t2Balance.gte(minB_t2Required),
                        factory: !!example_uniswapV4_config_copy_1.default.keeperTakerFactory,
                        taker: !!((_l = example_uniswapV4_config_copy_1.default.takerContracts) === null || _l === void 0 ? void 0 : _l.UniswapV4),
                        v4Router: !!((_m = example_uniswapV4_config_copy_1.default.uniswapV4RouterOverrides) === null || _m === void 0 ? void 0 : _m.router),
                        poolManager: !!((_o = example_uniswapV4_config_copy_1.default.uniswapV4RouterOverrides) === null || _o === void 0 ? void 0 : _o.poolManager),
                        poolsConfigured: Object.keys(((_p = example_uniswapV4_config_copy_1.default.uniswapV4RouterOverrides) === null || _p === void 0 ? void 0 : _p.pools) || {}).length > 0,
                        postAuctionSwap: example_uniswapV4_config_copy_1.default.pools.some(function (p) { var _a, _b; return ((_b = (_a = p.collectLpReward) === null || _a === void 0 ? void 0 : _a.rewardActionCollateral) === null || _b === void 0 ? void 0 : _b.dexProvider) === 'uniswap_v4'; }),
                    };
                    console.log("\n   Prerequisites:");
                    console.log("   ".concat(checks.eth ? '✅' : '❌', " ETH Balance Sufficient"));
                    console.log("   ".concat(checks.b_t2 ? '✅' : '❌', " B_T2 Balance Sufficient"));
                    console.log("   ".concat(checks.factory ? '✅' : '❌', " Factory Contract Configured"));
                    console.log("   ".concat(checks.taker ? '✅' : '❌', " V4 Taker Contract Configured"));
                    console.log("   ".concat(checks.v4Router ? '✅' : '❌', " V4 Universal Router Configured"));
                    console.log("   ".concat(checks.poolManager ? '✅' : '❌', " V4 PoolManager Configured"));
                    console.log("   ".concat(checks.poolsConfigured ? '✅' : '❌', " V4 Pools Configured"));
                    console.log("   ".concat(checks.postAuctionSwap ? '✅' : '❌', " Post-Auction V4 Swaps Enabled"));
                    allPassed = Object.values(checks).every(function (v) { return v; });
                    if (allPassed) {
                        console.log("\n   \u2705 ALL CHECKS PASSED!");
                        console.log("   \uD83D\uDE80 Ready to run keeper with V4 post-auction swaps");
                        console.log("\n   Next Steps:");
                        console.log("   1. Ensure keeper is running: npm start");
                        console.log("   2. Monitor logs for auction activity");
                        console.log("   3. Wait for liquidatable loans to appear");
                        console.log("   4. Keeper will: kick \u2192 take \u2192 collect rewards \u2192 swap via V4");
                    }
                    else {
                        console.log("\n   \u274C SOME CHECKS FAILED");
                        console.log("   \uD83D\uDCDD Fix the issues above before running the keeper");
                    }
                    console.log("\n".concat('='.repeat(60), "\n"));
                    return [2 /*return*/];
            }
        });
    });
}
verifyV4FullCycle()
    .then(function () { return process.exit(0); })
    .catch(function (error) {
    console.error('\n❌ Verification failed:', error);
    process.exit(1);
});
//# sourceMappingURL=verify-v4-full-cycle.js.map