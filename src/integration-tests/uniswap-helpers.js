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
exports.addLiquidity = void 0;
var NonfungiblePositionManager_json_1 = require("@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json");
var ethers_1 = require("ethers");
var test_utils_1 = require("./test-utils");
var POSITION_MANAGER_ADDRESS = '0xC36442b4a4522E871399CD717aBDD847Ab11FE88';
function addLiquidity(_a) {
    var signer = _a.signer, tokenA = _a.tokenA, tokenB = _a.tokenB, amountA = _a.amountA, amountB = _a.amountB, fee = _a.fee;
    return __awaiter(this, void 0, void 0, function () {
        var positionManager, provider, currentBlock, currentBlockTimestamp, address, tx, receipt;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    positionManager = new ethers_1.Contract(POSITION_MANAGER_ADDRESS, NonfungiblePositionManager_json_1.abi, signer);
                    provider = (0, test_utils_1.getProvider)();
                    return [4 /*yield*/, provider.getBlock('latest')];
                case 1:
                    currentBlock = _b.sent();
                    currentBlockTimestamp = currentBlock.timestamp;
                    return [4 /*yield*/, signer.getAddress()];
                case 2:
                    address = _b.sent();
                    return [4 /*yield*/, positionManager.mint({
                            token0: tokenA.address,
                            token1: tokenB.address,
                            fee: fee,
                            tickLower: -887220,
                            tickUpper: 887220,
                            amount0Desired: amountA,
                            amount1Desired: amountB,
                            amount0Min: ethers_1.ethers.utils.parseUnits('0.1', 8),
                            amount1Min: ethers_1.ethers.utils.parseUnits('1', 18),
                            recipient: address,
                            deadline: currentBlockTimestamp + 60 * 60 * 60,
                        }, { gasLimit: 10000000 })];
                case 3:
                    tx = _b.sent();
                    return [4 /*yield*/, tx.wait()];
                case 4:
                    receipt = _b.sent();
                    return [2 /*return*/, receipt.status];
            }
        });
    });
}
exports.addLiquidity = addLiquidity;
//# sourceMappingURL=uniswap-helpers.js.map