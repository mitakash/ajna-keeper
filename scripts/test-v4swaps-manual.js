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
var ethers_1 = require("ethers");
var dex_router_1 = require("../src/dex-router");
var config_types_1 = require("../src/config-types");
var example_uniswapV4_config_copy_1 = __importDefault(require("../example-uniswapV4-config copy"));
var utils_1 = require("../src/utils");
function testManualSwap() {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function () {
        var _c, provider, signer, signerAddress, chainId, dexRouter, b_t2, b_t4, ERC20_ABI, tokenContract, balance, decimalsRaw, symbol, decimals, swapAmountNative, swapAmountWAD, combinedSettings, PERMIT2, tokenForApprove, currentAllowance, tx, result, receipt, error_1;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    console.log('🔄 Testing Manual V4 Swap...\n');
                    return [4 /*yield*/, (0, utils_1.getProviderAndSigner)(example_uniswapV4_config_copy_1.default.keeperKeystore, example_uniswapV4_config_copy_1.default.ethRpcUrl)];
                case 1:
                    _c = _d.sent(), provider = _c.provider, signer = _c.signer;
                    return [4 /*yield*/, signer.getAddress()];
                case 2:
                    signerAddress = _d.sent();
                    return [4 /*yield*/, signer.getChainId()];
                case 3:
                    chainId = _d.sent();
                    console.log("Chain: ".concat(chainId));
                    console.log("Wallet: ".concat(signerAddress, "\n"));
                    dexRouter = new dex_router_1.DexRouter(signer, {
                        oneInchRouters: (_a = example_uniswapV4_config_copy_1.default.oneInchRouters) !== null && _a !== void 0 ? _a : {},
                        connectorTokens: (_b = example_uniswapV4_config_copy_1.default.connectorTokens) !== null && _b !== void 0 ? _b : [],
                    });
                    b_t2 = example_uniswapV4_config_copy_1.default.tokenAddresses['b_t2'];
                    b_t4 = example_uniswapV4_config_copy_1.default.tokenAddresses['b_t4'];
                    ERC20_ABI = [
                        'function balanceOf(address) view returns (uint256)',
                        'function decimals() view returns (uint8)',
                        'function symbol() view returns (string)',
                        // ✅ add allowance + approve for Permit2
                        'function allowance(address owner, address spender) view returns (uint256)',
                        'function approve(address spender, uint256 amount) returns (bool)',
                    ];
                    tokenContract = new ethers_1.ethers.Contract(b_t2, ERC20_ABI, provider);
                    return [4 /*yield*/, tokenContract.balanceOf(signerAddress)];
                case 4:
                    balance = _d.sent();
                    return [4 /*yield*/, tokenContract.decimals()];
                case 5:
                    decimalsRaw = _d.sent();
                    return [4 /*yield*/, tokenContract.symbol()];
                case 6:
                    symbol = _d.sent();
                    decimals = typeof decimalsRaw === 'number' ? decimalsRaw : decimalsRaw.toNumber();
                    console.log("Current ".concat(symbol, " balance: ").concat(ethers_1.ethers.utils.formatUnits(balance, decimals)));
                    console.log("Token decimals: ".concat(decimals, "\n"));
                    if (balance.eq(0)) {
                        console.log('❌ No tokens to swap!');
                        return [2 /*return*/];
                    }
                    swapAmountNative = ethers_1.ethers.utils.parseUnits('0.01', decimals);
                    swapAmountWAD = decimals < 18
                        ? swapAmountNative.mul(ethers_1.BigNumber.from(10).pow(18 - decimals))
                        : decimals > 18
                            ? swapAmountNative.div(ethers_1.BigNumber.from(10).pow(decimals - 18))
                            : swapAmountNative;
                    console.log('🔄 Attempting swap:');
                    console.log("  Amount (native): ".concat(ethers_1.ethers.utils.formatUnits(swapAmountNative, decimals), " ").concat(symbol));
                    console.log("  Amount (native wei): ".concat(swapAmountNative.toString()));
                    console.log("  Amount (WAD): ".concat(ethers_1.ethers.utils.formatEther(swapAmountWAD)));
                    console.log("  Amount (WAD wei): ".concat(swapAmountWAD.toString()));
                    console.log("  From: ".concat(b_t2));
                    console.log("  To: ".concat(b_t4));
                    console.log("  Slippage: 2%");
                    console.log("  DEX: Uniswap V4\n");
                    if (swapAmountWAD.isZero()) {
                        console.error('❌ ERROR: Swap amount is 0 after conversion! Increase the amount.');
                        return [2 /*return*/];
                    }
                    combinedSettings = {
                        uniswap: __assign(__assign({}, example_uniswapV4_config_copy_1.default.uniswapOverrides), example_uniswapV4_config_copy_1.default.universalRouterOverrides),
                        sushiswap: example_uniswapV4_config_copy_1.default.sushiswapRouterOverrides,
                        uniswapV4: example_uniswapV4_config_copy_1.default.uniswapV4RouterOverrides
                    };
                    PERMIT2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3';
                    tokenForApprove = new ethers_1.ethers.Contract(b_t2, ERC20_ABI, signer);
                    return [4 /*yield*/, tokenForApprove.allowance(signerAddress, PERMIT2)];
                case 7:
                    currentAllowance = _d.sent();
                    if (!currentAllowance.lt(swapAmountNative)) return [3 /*break*/, 10];
                    console.log("Approving Permit2 for ".concat(symbol, "\u2026"));
                    return [4 /*yield*/, tokenForApprove.approve(PERMIT2, ethers_1.ethers.constants.MaxUint256)];
                case 8:
                    tx = _d.sent();
                    console.log("  tx: ".concat(tx.hash));
                    return [4 /*yield*/, tx.wait()];
                case 9:
                    _d.sent();
                    console.log('✅ Permit2 approved\n');
                    return [3 /*break*/, 11];
                case 10:
                    console.log('Permit2 already approved — skipping\n');
                    _d.label = 11;
                case 11:
                    _d.trys.push([11, 13, , 14]);
                    return [4 /*yield*/, dexRouter.swap(chainId, swapAmountWAD, // WAD amount
                        b_t2, // From
                        b_t4, // To
                        signerAddress, // Recipient
                        config_types_1.PostAuctionDex.UNISWAP_V4, 5, // 5% slippage (increased to account for quote variance)
                        3000, // fee (unused for V4 in your stack)
                        combinedSettings)];
                case 12:
                    result = _d.sent();
                    if (result.success) {
                        console.log('\n✅ Swap successful!');
                        if (result.receipt) {
                            receipt = result.receipt;
                            console.log("   Transaction hash: ".concat(receipt.transactionHash));
                            console.log("   Block number: ".concat(receipt.blockNumber));
                            console.log("   Gas used: ".concat(receipt.gasUsed.toString()));
                        }
                    }
                    else {
                        console.log('\n❌ Swap failed:', result.error);
                    }
                    return [3 /*break*/, 14];
                case 13:
                    error_1 = _d.sent();
                    console.error('\n❌ Error during swap:', error_1);
                    return [3 /*break*/, 14];
                case 14: return [2 /*return*/];
            }
        });
    });
}
testManualSwap()
    .then(function () { return process.exit(0); })
    .catch(function (error) {
    console.error('Test failed:', error);
    process.exit(1);
});
//# sourceMappingURL=test-v4swaps-manual.js.map