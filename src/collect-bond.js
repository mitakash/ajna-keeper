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
exports.collectBondFromPool = void 0;
var ethers_1 = require("ethers");
var logging_1 = require("./logging");
var transactions_1 = require("./transactions");
var utils_1 = require("./utils");
var settlement_1 = require("./settlement");
function collectBondFromPool(_a) {
    var _b;
    var pool = _a.pool, signer = _a.signer, poolConfig = _a.poolConfig, config = _a.config;
    return __awaiter(this, void 0, void 0, function () {
        var signerAddress, _c, claimable, locked, error_1, settlementSuccessful, _d, newClaimable, newLocked, error_2;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0: return [4 /*yield*/, signer.getAddress()];
                case 1:
                    signerAddress = _e.sent();
                    return [4 /*yield*/, pool.kickerInfo(signerAddress)];
                case 2:
                    _c = _e.sent(), claimable = _c.claimable, locked = _c.locked;
                    if (!(locked.eq(ethers_1.constants.Zero) && claimable.gt(ethers_1.constants.Zero))) return [3 /*break*/, 8];
                    if (!!!config.dryRun) return [3 /*break*/, 3];
                    logging_1.logger.info("DryRun - Would withdraw bond. pool: ".concat(pool.name, ". bondSize: ").concat((0, utils_1.weiToDecimaled)(claimable)));
                    return [3 /*break*/, 7];
                case 3:
                    logging_1.logger.debug("Withdrawing bond. pool: ".concat(pool.name, ". bondSize: ").concat((0, utils_1.weiToDecimaled)(claimable)));
                    _e.label = 4;
                case 4:
                    _e.trys.push([4, 6, , 7]);
                    return [4 /*yield*/, (0, transactions_1.poolWithdrawBonds)(pool, signer)];
                case 5:
                    _e.sent();
                    logging_1.logger.info("Withdrew bond. pool: ".concat(pool.name, ". bondSize: ").concat((0, utils_1.weiToDecimaled)(claimable)));
                    return [3 /*break*/, 7];
                case 6:
                    error_1 = _e.sent();
                    logging_1.logger.error("Failed to withdraw bond. pool: ".concat(pool.name, "."), error_1);
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
                case 8:
                    if (!locked.gt(ethers_1.constants.Zero)) return [3 /*break*/, 21];
                    logging_1.logger.debug("Bonds locked in pool ".concat(pool.name, ": locked=").concat((0, utils_1.weiToDecimaled)(locked), ", claimable=").concat((0, utils_1.weiToDecimaled)(claimable)));
                    if (!((_b = poolConfig.settlement) === null || _b === void 0 ? void 0 : _b.enabled)) return [3 /*break*/, 19];
                    return [4 /*yield*/, (0, settlement_1.tryReactiveSettlement)({
                            pool: pool,
                            poolConfig: poolConfig,
                            signer: signer,
                            config: config
                        })];
                case 9:
                    settlementSuccessful = _e.sent();
                    if (!settlementSuccessful) return [3 /*break*/, 17];
                    return [4 /*yield*/, pool.kickerInfo(signerAddress)];
                case 10:
                    _d = _e.sent(), newClaimable = _d.claimable, newLocked = _d.locked;
                    if (!(newLocked.eq(ethers_1.constants.Zero) && newClaimable.gt(ethers_1.constants.Zero))) return [3 /*break*/, 15];
                    if (!!!config.dryRun) return [3 /*break*/, 11];
                    logging_1.logger.info("DryRun - Would withdraw bond after settlement. pool: ".concat(pool.name, ". bondSize: ").concat((0, utils_1.weiToDecimaled)(newClaimable)));
                    return [3 /*break*/, 14];
                case 11:
                    _e.trys.push([11, 13, , 14]);
                    return [4 /*yield*/, (0, transactions_1.poolWithdrawBonds)(pool, signer)];
                case 12:
                    _e.sent();
                    logging_1.logger.info("Withdrew bond after settlement. pool: ".concat(pool.name, ". bondSize: ").concat((0, utils_1.weiToDecimaled)(newClaimable)));
                    return [3 /*break*/, 14];
                case 13:
                    error_2 = _e.sent();
                    logging_1.logger.error("Failed to withdraw bond after settlement. pool: ".concat(pool.name, "."), error_2);
                    return [3 /*break*/, 14];
                case 14: return [3 /*break*/, 16];
                case 15:
                    logging_1.logger.warn("Settlement completed but bonds still not withdrawable in pool: ".concat(pool.name));
                    _e.label = 16;
                case 16: return [3 /*break*/, 18];
                case 17:
                    logging_1.logger.warn("Bonds remain locked in pool: ".concat(pool.name, " - no settlements needed"));
                    _e.label = 18;
                case 18: return [3 /*break*/, 20];
                case 19:
                    logging_1.logger.debug("Settlement not enabled for pool ".concat(pool.name, ", bonds remain locked"));
                    _e.label = 20;
                case 20: return [2 /*return*/];
                case 21:
                    // Case 3: No bonds to withdraw
                    logging_1.logger.debug("No bonds to withdraw in pool ".concat(pool.name, ": locked=").concat((0, utils_1.weiToDecimaled)(locked), ", claimable=").concat((0, utils_1.weiToDecimaled)(claimable)));
                    return [2 /*return*/];
            }
        });
    });
}
exports.collectBondFromPool = collectBondFromPool;
//# sourceMappingURL=collect-bond.js.map