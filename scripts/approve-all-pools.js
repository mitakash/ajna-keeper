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
// scripts/approve-all-pools.ts
var hardhat_1 = require("hardhat");
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var config, signer, keeperAddress, pools, approvals, _i, pools_1, poolConfig, poolAddress, poolName, pool, quoteToken, token, symbol, currentAllowance, approvalKey, tx, factoryAddress, quoteTokens, _a, pools_2, poolConfig, pool, _b, _c, _d, quoteTokens_1, quoteTokenAddress, token, symbol, currentAllowance, tx;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    config = require('../example-uniswapV4-config copy');
                    console.log('\n🔐 Approving all Ajna pools for keeper operations...\n');
                    return [4 /*yield*/, hardhat_1.ethers.getSigners()];
                case 1:
                    signer = (_e.sent())[0];
                    return [4 /*yield*/, signer.getAddress()];
                case 2:
                    keeperAddress = _e.sent();
                    console.log('Keeper address:', keeperAddress);
                    console.log('');
                    pools = config.default.pools;
                    approvals = new Set();
                    _i = 0, pools_1 = pools;
                    _e.label = 3;
                case 3:
                    if (!(_i < pools_1.length)) return [3 /*break*/, 14];
                    poolConfig = pools_1[_i];
                    poolAddress = poolConfig.address;
                    poolName = poolConfig.name;
                    console.log("\uD83D\uDCCB Pool: ".concat(poolName));
                    console.log("   Address: ".concat(poolAddress));
                    return [4 /*yield*/, hardhat_1.ethers.getContractAt(['function quoteTokenAddress() view returns (address)'], poolAddress)];
                case 4:
                    pool = _e.sent();
                    return [4 /*yield*/, pool.quoteTokenAddress()];
                case 5:
                    quoteToken = _e.sent();
                    console.log("   Quote Token: ".concat(quoteToken));
                    return [4 /*yield*/, hardhat_1.ethers.getContractAt(['function allowance(address,address) view returns (uint256)', 'function approve(address,uint256) returns (bool)', 'function symbol() view returns (string)'], quoteToken)];
                case 6:
                    token = _e.sent();
                    return [4 /*yield*/, token.symbol()];
                case 7:
                    symbol = _e.sent();
                    return [4 /*yield*/, token.allowance(keeperAddress, poolAddress)];
                case 8:
                    currentAllowance = _e.sent();
                    console.log("   Current allowance: ".concat(hardhat_1.ethers.utils.formatUnits(currentAllowance, 6), " ").concat(symbol));
                    approvalKey = "".concat(quoteToken.toLowerCase(), "-").concat(poolAddress.toLowerCase());
                    if (!(currentAllowance.lt(hardhat_1.ethers.utils.parseUnits('1000000', 6)) && !approvals.has(approvalKey))) return [3 /*break*/, 11];
                    console.log("   \u26A0\uFE0F  Insufficient allowance - approving MAX...");
                    return [4 /*yield*/, token.approve(poolAddress, hardhat_1.ethers.constants.MaxUint256)];
                case 9:
                    tx = _e.sent();
                    console.log("   Tx: ".concat(tx.hash));
                    return [4 /*yield*/, tx.wait()];
                case 10:
                    _e.sent();
                    console.log("   \u2705 Approved!");
                    approvals.add(approvalKey);
                    return [3 /*break*/, 12];
                case 11:
                    if (approvals.has(approvalKey)) {
                        console.log("   \u2705 Already approved in this session");
                    }
                    else {
                        console.log("   \u2705 Sufficient allowance");
                    }
                    _e.label = 12;
                case 12:
                    console.log('');
                    _e.label = 13;
                case 13:
                    _i++;
                    return [3 /*break*/, 3];
                case 14:
                    if (!config.default.keeperTakerFactory) return [3 /*break*/, 29];
                    factoryAddress = config.default.keeperTakerFactory;
                    console.log("\uD83D\uDCCB Factory: ".concat(factoryAddress));
                    quoteTokens = new Set();
                    _a = 0, pools_2 = pools;
                    _e.label = 15;
                case 15:
                    if (!(_a < pools_2.length)) return [3 /*break*/, 19];
                    poolConfig = pools_2[_a];
                    return [4 /*yield*/, hardhat_1.ethers.getContractAt(['function quoteTokenAddress() view returns (address)'], poolConfig.address)];
                case 16:
                    pool = _e.sent();
                    _c = (_b = quoteTokens).add;
                    return [4 /*yield*/, pool.quoteTokenAddress()];
                case 17:
                    _c.apply(_b, [(_e.sent()).toLowerCase()]);
                    _e.label = 18;
                case 18:
                    _a++;
                    return [3 /*break*/, 15];
                case 19:
                    _d = 0, quoteTokens_1 = quoteTokens;
                    _e.label = 20;
                case 20:
                    if (!(_d < quoteTokens_1.length)) return [3 /*break*/, 28];
                    quoteTokenAddress = quoteTokens_1[_d];
                    return [4 /*yield*/, hardhat_1.ethers.getContractAt(['function allowance(address,address) view returns (uint256)', 'function approve(address,uint256) returns (bool)', 'function symbol() view returns (string)'], quoteTokenAddress)];
                case 21:
                    token = _e.sent();
                    return [4 /*yield*/, token.symbol()];
                case 22:
                    symbol = _e.sent();
                    return [4 /*yield*/, token.allowance(keeperAddress, factoryAddress)];
                case 23:
                    currentAllowance = _e.sent();
                    console.log("   ".concat(symbol, ": ").concat(hardhat_1.ethers.utils.formatUnits(currentAllowance, 6)));
                    if (!currentAllowance.lt(hardhat_1.ethers.utils.parseUnits('1000000', 6))) return [3 /*break*/, 26];
                    console.log("   \u26A0\uFE0F  Insufficient allowance for factory - approving MAX...");
                    return [4 /*yield*/, token.approve(factoryAddress, hardhat_1.ethers.constants.MaxUint256)];
                case 24:
                    tx = _e.sent();
                    console.log("   Tx: ".concat(tx.hash));
                    return [4 /*yield*/, tx.wait()];
                case 25:
                    _e.sent();
                    console.log("   \u2705 Approved!");
                    return [3 /*break*/, 27];
                case 26:
                    console.log("   \u2705 Sufficient allowance");
                    _e.label = 27;
                case 27:
                    _d++;
                    return [3 /*break*/, 20];
                case 28:
                    console.log('');
                    _e.label = 29;
                case 29:
                    console.log('✅ All approvals complete!\n');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .then(function () { return process.exit(0); })
    .catch(function (error) {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=approve-all-pools.js.map