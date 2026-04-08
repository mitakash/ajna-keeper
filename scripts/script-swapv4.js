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
// ============================================================================
// CONFIGURATION - Verified from on-chain logs
// ============================================================================
var CONFIG = {
    RPC_URL: 'https://base-mainnet.g.alchemy.com/v2/BGrpE_7pmP_VQwKMWN6hz',
    CHAIN_ID: 8453,
    POOL_MANAGER: '0x498581ff718922c3f8e6a244956af099b2652b2b',
    // Your tokens (verified from on-chain)
    TOKEN_B_T2: '0xd8A0af85E2539e22953287b436255422724871AB',
    TOKEN_B_T4: '0x46c9b45628bc1cf680d151b4c5b1226c3d236187',
    // Pool parameters (verified from Initialize event)
    POOL_FEE: 500,
    TICK_SPACING: 10,
    HOOKS: '0x0000000000000000000000000000000000000000',
    // Swap
    AMOUNT_IN: '0.01',
    SLIPPAGE: 5, // Increase to 5%
};
// ============================================================================
// ABIs
// ============================================================================
var ERC20_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)'
];
var POOL_MANAGER_ABI = [
    'function swap(tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) key, tuple(bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96) params, bytes hookData) external returns (int256)',
    'function settle() external payable returns (uint256)',
    'function take(address currency, address to, uint256 amount) external',
    'function unlock(bytes calldata data) external returns (bytes memory)'
];
// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function getSqrtPriceLimitX96(zeroForOne) {
    if (zeroForOne) {
        return ethers_1.BigNumber.from('4295128740'); // MIN_SQRT_RATIO + 1
    }
    else {
        return ethers_1.BigNumber.from('1461446703485210103287273052203988822378723970341'); // MAX_SQRT_RATIO - 1
    }
}
// ============================================================================
// MAIN
// ============================================================================
function executeDirectSwap() {
    return __awaiter(this, void 0, void 0, function () {
        var provider, keystore, readline, rl, password, wallet, signer, signerAddress, tokenIn, tokenOut, _a, symbolIn, symbolOut, decimalsIn, decimalsOut, balanceIn, balanceOut, amountIn, allowance, tx, poolKey, zeroForOne, amountSpecified, sqrtPriceLimitX96, swapParams, poolManager, gasEstimate, tx, receipt, _b, newBalanceIn, newBalanceOut, error_1;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    console.log('🔄 Direct PoolManager Swap Test\n');
                    console.log('═'.repeat(80));
                    provider = new ethers_1.ethers.providers.JsonRpcProvider(CONFIG.RPC_URL);
                    keystore = require('fs').readFileSync('/Users/bigdellis/keystore-files/keeper-keystore2.json', 'utf8');
                    readline = require('readline');
                    rl = readline.createInterface({
                        input: process.stdin,
                        output: process.stdout
                    });
                    return [4 /*yield*/, new Promise(function (resolve) {
                            rl.question('Enter keystore password: ', function (pwd) {
                                rl.close();
                                resolve(pwd);
                            });
                        })];
                case 1:
                    password = _c.sent();
                    return [4 /*yield*/, ethers_1.ethers.Wallet.fromEncryptedJson(keystore, password)];
                case 2:
                    wallet = _c.sent();
                    signer = wallet.connect(provider);
                    return [4 /*yield*/, signer.getAddress()];
                case 3:
                    signerAddress = _c.sent();
                    console.log("\u2713 Wallet: ".concat(signerAddress));
                    console.log("\u2713 Chain: Base (".concat(CONFIG.CHAIN_ID, ")\n"));
                    tokenIn = new ethers_1.ethers.Contract(CONFIG.TOKEN_B_T2, ERC20_ABI, signer);
                    tokenOut = new ethers_1.ethers.Contract(CONFIG.TOKEN_B_T4, ERC20_ABI, signer);
                    return [4 /*yield*/, Promise.all([
                            tokenIn.symbol(),
                            tokenOut.symbol(),
                            tokenIn.decimals(),
                            tokenOut.decimals(),
                            tokenIn.balanceOf(signerAddress),
                            tokenOut.balanceOf(signerAddress)
                        ])];
                case 4:
                    _a = _c.sent(), symbolIn = _a[0], symbolOut = _a[1], decimalsIn = _a[2], decimalsOut = _a[3], balanceIn = _a[4], balanceOut = _a[5];
                    console.log("\uD83D\uDCCA Current Balances:");
                    console.log("   ".concat(symbolIn, ": ").concat(ethers_1.ethers.utils.formatUnits(balanceIn, decimalsIn)));
                    console.log("   ".concat(symbolOut, ": ").concat(ethers_1.ethers.utils.formatUnits(balanceOut, decimalsOut), "\n"));
                    amountIn = ethers_1.ethers.utils.parseUnits(CONFIG.AMOUNT_IN, decimalsIn);
                    // Approve PoolManager
                    console.log("\uD83D\uDD13 Checking approval for PoolManager...");
                    return [4 /*yield*/, tokenIn.allowance(signerAddress, CONFIG.POOL_MANAGER)];
                case 5:
                    allowance = _c.sent();
                    if (!allowance.lt(amountIn)) return [3 /*break*/, 8];
                    console.log("   Approving...");
                    return [4 /*yield*/, tokenIn.approve(CONFIG.POOL_MANAGER, ethers_1.ethers.constants.MaxUint256)];
                case 6:
                    tx = _c.sent();
                    return [4 /*yield*/, tx.wait()];
                case 7:
                    _c.sent();
                    console.log("   \u2713 Approved");
                    return [3 /*break*/, 9];
                case 8:
                    console.log("   \u2713 Already approved\n");
                    _c.label = 9;
                case 9:
                    poolKey = {
                        currency0: CONFIG.TOKEN_B_T4,
                        currency1: CONFIG.TOKEN_B_T2,
                        fee: CONFIG.POOL_FEE,
                        tickSpacing: CONFIG.TICK_SPACING,
                        hooks: CONFIG.HOOKS
                    };
                    zeroForOne = false;
                    amountSpecified = amountIn.mul(-1);
                    sqrtPriceLimitX96 = getSqrtPriceLimitX96(zeroForOne);
                    swapParams = {
                        zeroForOne: zeroForOne,
                        amountSpecified: amountSpecified,
                        sqrtPriceLimitX96: sqrtPriceLimitX96
                    };
                    console.log("\uD83D\uDD27 Swap Parameters:");
                    console.log("   Amount In: ".concat(ethers_1.ethers.utils.formatUnits(amountIn, decimalsIn), " ").concat(symbolIn));
                    console.log("   Direction: ".concat(zeroForOne ? 'zeroForOne' : 'oneForZero'));
                    console.log("   Amount Specified: ".concat(amountSpecified.toString()));
                    console.log("   Price Limit: ".concat(sqrtPriceLimitX96.toString(), "\n"));
                    console.log("\uD83D\uDCCB Pool Key:");
                    console.log("   Currency0: ".concat(poolKey.currency0));
                    console.log("   Currency1: ".concat(poolKey.currency1));
                    console.log("   Fee: ".concat(poolKey.fee));
                    console.log("   TickSpacing: ".concat(poolKey.tickSpacing));
                    console.log("   Hooks: ".concat(poolKey.hooks, "\n"));
                    poolManager = new ethers_1.ethers.Contract(CONFIG.POOL_MANAGER, POOL_MANAGER_ABI, signer);
                    console.log("\uD83D\uDE80 Attempting direct swap via PoolManager...\n");
                    _c.label = 10;
                case 10:
                    _c.trys.push([10, 15, , 16]);
                    // First, let's try estimating gas to see the error
                    console.log("\uD83D\uDCCA Estimating gas...");
                    return [4 /*yield*/, poolManager.estimateGas.swap(poolKey, swapParams, '0x' // empty hookData
                        )];
                case 11:
                    gasEstimate = _c.sent();
                    console.log("   Estimated gas: ".concat(gasEstimate.toString(), "\n"));
                    // Execute swap
                    console.log("\u23F3 Executing swap...");
                    return [4 /*yield*/, poolManager.swap(poolKey, swapParams, '0x', {
                            gasLimit: gasEstimate.mul(120).div(100) // 20% buffer
                        })];
                case 12:
                    tx = _c.sent();
                    console.log("   Tx: ".concat(tx.hash));
                    return [4 /*yield*/, tx.wait()];
                case 13:
                    receipt = _c.sent();
                    console.log("\n\u2705 Swap successful!");
                    console.log("   Block: ".concat(receipt.blockNumber));
                    console.log("   Gas Used: ".concat(receipt.gasUsed.toString()));
                    console.log("   Explorer: https://basescan.org/tx/".concat(tx.hash));
                    return [4 /*yield*/, Promise.all([
                            tokenIn.balanceOf(signerAddress),
                            tokenOut.balanceOf(signerAddress)
                        ])];
                case 14:
                    _b = _c.sent(), newBalanceIn = _b[0], newBalanceOut = _b[1];
                    console.log("\n\uD83D\uDCB0 New Balances:");
                    console.log("   ".concat(symbolIn, ": ").concat(ethers_1.ethers.utils.formatUnits(newBalanceIn, decimalsIn), " (\u0394 ").concat(ethers_1.ethers.utils.formatUnits(newBalanceIn.sub(balanceIn), decimalsIn), ")"));
                    console.log("   ".concat(symbolOut, ": ").concat(ethers_1.ethers.utils.formatUnits(newBalanceOut, decimalsOut), " (\u0394 ").concat(ethers_1.ethers.utils.formatUnits(newBalanceOut.sub(balanceOut), decimalsOut), ")"));
                    return [3 /*break*/, 16];
                case 15:
                    error_1 = _c.sent();
                    console.error("\n\u274C Swap failed!");
                    console.error("   ".concat(error_1.message));
                    if (error_1.error) {
                        console.error("\n\uD83D\uDD0D Error details:");
                        console.error(error_1.error);
                    }
                    if (error_1.reason) {
                        console.error("\n\uD83D\uDCDD Reason: ".concat(error_1.reason));
                    }
                    return [3 /*break*/, 16];
                case 16:
                    console.log('\n' + '═'.repeat(80));
                    return [2 /*return*/];
            }
        });
    });
}
executeDirectSwap()
    .then(function () {
    console.log('\n✓ Done');
    process.exit(0);
})
    .catch(function (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=script-swapv4.js.map