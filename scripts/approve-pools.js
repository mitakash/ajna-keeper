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
function approvePools() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, provider, signer, signerAddress, chainId, ERC20_ABI, _i, _b, pool, quoteToken, quoteSymbol, tokenContract, currentAllowance, tx;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    console.log('🔐 Approving Ajna Pools for Quote Token Spending...\n');
                    return [4 /*yield*/, (0, utils_1.getProviderAndSigner)(example_uniswapV4_config_copy_1.default.keeperKeystore, example_uniswapV4_config_copy_1.default.ethRpcUrl)];
                case 1:
                    _a = _c.sent(), provider = _a.provider, signer = _a.signer;
                    return [4 /*yield*/, signer.getAddress()];
                case 2:
                    signerAddress = _c.sent();
                    return [4 /*yield*/, signer.getChainId()];
                case 3:
                    chainId = _c.sent();
                    console.log("Chain: ".concat(chainId));
                    console.log("Wallet: ".concat(signerAddress, "\n"));
                    ERC20_ABI = [
                        'function allowance(address owner, address spender) view returns (uint256)',
                        'function approve(address spender, uint256 amount) returns (bool)',
                        'function symbol() view returns (string)',
                        'function decimals() view returns (uint8)',
                    ];
                    _i = 0, _b = example_uniswapV4_config_copy_1.default.pools;
                    _c.label = 4;
                case 4:
                    if (!(_i < _b.length)) return [3 /*break*/, 10];
                    pool = _b[_i];
                    console.log("\n\uD83D\uDCCB Pool: ".concat(pool.name));
                    console.log("   Address: ".concat(pool.address));
                    quoteToken = void 0;
                    quoteSymbol = void 0;
                    if (pool.name.includes('B_T2/B_T4')) {
                        quoteToken = example_uniswapV4_config_copy_1.default.tokenAddresses['b_t2'];
                        quoteSymbol = 'B_T2';
                    }
                    else if (pool.name.includes('B_T2/B_T1')) {
                        quoteToken = example_uniswapV4_config_copy_1.default.tokenAddresses['b_t2'];
                        quoteSymbol = 'B_T2';
                    }
                    else {
                        console.log('   ⚠️  Unknown pool type - skipping');
                        return [3 /*break*/, 9];
                    }
                    console.log("   Quote Token: ".concat(quoteSymbol, " (").concat(quoteToken, ")"));
                    tokenContract = new ethers_1.ethers.Contract(quoteToken, ERC20_ABI, signer);
                    return [4 /*yield*/, tokenContract.allowance(signerAddress, pool.address)];
                case 5:
                    currentAllowance = _c.sent();
                    console.log("   Current Allowance: ".concat(ethers_1.ethers.utils.formatUnits(currentAllowance, 6), " ").concat(quoteSymbol));
                    if (!currentAllowance.lt(ethers_1.ethers.utils.parseUnits('1000000', 6))) return [3 /*break*/, 8];
                    console.log("   Approving pool for unlimited ".concat(quoteSymbol, " spending..."));
                    return [4 /*yield*/, tokenContract.approve(pool.address, ethers_1.ethers.constants.MaxUint256)];
                case 6:
                    tx = _c.sent();
                    console.log("   TX: ".concat(tx.hash));
                    return [4 /*yield*/, tx.wait()];
                case 7:
                    _c.sent();
                    console.log('   ✅ Approval complete');
                    return [3 /*break*/, 9];
                case 8:
                    console.log('   ✅ Already approved - skipping');
                    _c.label = 9;
                case 9:
                    _i++;
                    return [3 /*break*/, 4];
                case 10:
                    console.log('\n✅ All pool approvals complete!\n');
                    return [2 /*return*/];
            }
        });
    });
}
approvePools()
    .then(function () { return process.exit(0); })
    .catch(function (error) {
    console.error('Approval failed:', error);
    process.exit(1);
});
//# sourceMappingURL=approve-pools.js.map