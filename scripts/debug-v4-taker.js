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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var ethers_1 = require("ethers");
var fs_1 = __importDefault(require("fs"));
var path_1 = __importDefault(require("path"));
var readline_1 = __importDefault(require("readline"));
// Your existing config file
var cfg = require("../example-uniswapV4-config copy").default;
// ====== EDIT THESE TWO IF NEEDED ======
var FACTORY_ADDRESS = "0x1729Fc45642D0713Fac14803b7381e601c27A8A4";
var FACTORY_ARTIFACT_PATH = "artifacts/contracts/AjnaKeeperTakerFactory.sol/AjnaKeeperTakerFactory.json";
// =====================================
// This script assumes your factory method name is this.
// If your factory ABI has a different name for selector 0x2d9a6183, update it.
var METHOD_NAME = "takeWithAtomicSwap";
function prompt(question) {
    var rl = readline_1.default.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(function (resolve) {
        return rl.question(question, function (answer) {
            rl.close();
            resolve(answer);
        });
    });
}
function loadArtifact(p) {
    var full = path_1.default.join(process.cwd(), p);
    if (!fs_1.default.existsSync(full))
        throw new Error("Missing artifact: ".concat(full));
    var json = JSON.parse(fs_1.default.readFileSync(full, "utf8"));
    return { abi: json.abi };
}
function decodeRevert(iface, data) {
    var _a, _b;
    if (!data || typeof data !== "string" || !data.startsWith("0x"))
        return "(no revert data)";
    try {
        var parsed = iface.parseError(data);
        var args = (_b = (_a = parsed.args) === null || _a === void 0 ? void 0 : _a.map(function (x) { return ((x === null || x === void 0 ? void 0 : x.toString) ? x.toString() : String(x)); })) !== null && _b !== void 0 ? _b : [];
        return "CustomError: ".concat(parsed.name, "(").concat(args.join(", "), ")");
    }
    catch (_c) { }
    try {
        if (data.slice(0, 10).toLowerCase() === "0x08c379a0") {
            var reason = ethers_1.ethers.utils.defaultAbiCoder.decode(["string"], "0x" + data.slice(10))[0];
            return "Revert(string): ".concat(reason);
        }
    }
    catch (_d) { }
    return "Raw revert data: ".concat(data);
}
function buildSwapDataFromConfig() {
    // You MUST map from your config to these fields.
    // Your config already has uniswapV4RouterOverrides.poolManager in it 
    // but poolKey + minOut etc must come from where your bot computes them.
    //
    // So we support BOTH:
    // 1) cfg.debugSwapDetails already present (recommended)
    // 2) fall back to cfg.uniswapV4RouterOverrides.debugSwapDetails if you store it there
    var _a, _b;
    var d = (_a = cfg.debugSwapDetails) !== null && _a !== void 0 ? _a : (_b = cfg.uniswapV4RouterOverrides) === null || _b === void 0 ? void 0 : _b.debugSwapDetails;
    if (!d) {
        throw new Error("Missing swap details in config.\n" +
            "Add `debugSwapDetails` to your config with poolKey/amountOutMinimum/sqrtPriceLimitX96/deadline.");
    }
    var details = {
        poolKey: {
            currency0: { addr: d.poolKey.currency0 },
            currency1: { addr: d.poolKey.currency1 },
            fee: Number(d.poolKey.fee),
            tickSpacing: Number(d.poolKey.tickSpacing),
            hooks: d.poolKey.hooks,
        },
        amountOutMinimum: d.amountOutMinimum,
        sqrtPriceLimitX96: d.sqrtPriceLimitX96,
        deadline: d.deadline,
    };
    var abiCoder = ethers_1.ethers.utils.defaultAbiCoder;
    return abiCoder.encode([
        "tuple(tuple(address addr) currency0, tuple(address addr) currency1, uint24 fee, int24 tickSpacing, address hooks, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96, uint256 deadline)",
    ], [
        [
            { addr: details.poolKey.currency0.addr },
            { addr: details.poolKey.currency1.addr },
            details.poolKey.fee,
            details.poolKey.tickSpacing,
            details.poolKey.hooks,
            details.amountOutMinimum,
            details.sqrtPriceLimitX96,
            details.deadline,
        ],
    ]);
}
function main() {
    var _a, _b, _c, _d;
    return __awaiter(this, void 0, void 0, function () {
        var rpcUrl, keystorePath, provider, password, encryptedJson, wallet, signer, _e, _f, _g, _h, _j, _k, abi, factory, iface, t, swapData, args, res, err_1, data, encoded, _l, _m, e2_1, d2, tx, r;
        var _o, _p;
        return __generator(this, function (_q) {
            switch (_q.label) {
                case 0:
                    console.log("\n🧪 Live V4 Take Debugger (no error.log)\n");
                    rpcUrl = cfg.ethRpcUrl;
                    keystorePath = cfg.keeperKeystore;
                    if (!rpcUrl)
                        throw new Error("config.ethRpcUrl missing");
                    if (!keystorePath)
                        throw new Error("config.keeperKeystore missing");
                    provider = new ethers_1.ethers.providers.JsonRpcProvider(rpcUrl);
                    return [4 /*yield*/, prompt("Enter keystore password (input visible): ")];
                case 1:
                    password = _q.sent();
                    encryptedJson = fs_1.default.readFileSync(keystorePath, "utf8");
                    return [4 /*yield*/, ethers_1.ethers.Wallet.fromEncryptedJson(encryptedJson, password)];
                case 2:
                    wallet = _q.sent();
                    signer = wallet.connect(provider);
                    _f = (_e = console).log;
                    _g = ["Signer:"];
                    return [4 /*yield*/, signer.getAddress()];
                case 3:
                    _f.apply(_e, _g.concat([_q.sent()]));
                    _j = (_h = console).log;
                    _k = ["Chain :"];
                    return [4 /*yield*/, provider.getNetwork()];
                case 4:
                    _j.apply(_h, _k.concat([(_q.sent()).chainId]));
                    abi = loadArtifact(FACTORY_ARTIFACT_PATH).abi;
                    factory = new ethers_1.ethers.Contract(FACTORY_ADDRESS, abi, signer);
                    iface = new ethers_1.ethers.utils.Interface(abi);
                    t = cfg.debugTake;
                    if (!t) {
                        throw new Error("Missing debugTake in config.\n" +
                            "Add:\n" +
                            "debugTake: { pool, borrower, auctionPrice, collateral, source, router }\n");
                    }
                    swapData = buildSwapDataFromConfig();
                    args = [
                        t.pool,
                        t.borrower,
                        t.auctionPrice,
                        t.collateral,
                        t.source,
                        t.router,
                        swapData,
                    ];
                    console.log("\nCall:");
                    console.log("factory:", FACTORY_ADDRESS);
                    console.log("method :", METHOD_NAME);
                    args.forEach(function (a, i) { return console.log("  [".concat(i, "]"), a); });
                    // ---- callStatic first (best signal) ----
                    console.log("\n🧪 callStatic...");
                    _q.label = 5;
                case 5:
                    _q.trys.push([5, 7, , 16]);
                    return [4 /*yield*/, (_o = factory.callStatic)[METHOD_NAME].apply(_o, args)];
                case 6:
                    res = _q.sent();
                    console.log("✅ callStatic success:", res);
                    return [3 /*break*/, 16];
                case 7:
                    err_1 = _q.sent();
                    data = (_b = (_a = err_1 === null || err_1 === void 0 ? void 0 : err_1.error) === null || _a === void 0 ? void 0 : _a.data) !== null && _b !== void 0 ? _b : err_1 === null || err_1 === void 0 ? void 0 : err_1.data;
                    console.log("❌ callStatic reverted");
                    console.log("message:", (err_1 === null || err_1 === void 0 ? void 0 : err_1.reason) || (err_1 === null || err_1 === void 0 ? void 0 : err_1.message));
                    console.log("decoded:", decodeRevert(iface, data));
                    console.log("raw   :", data);
                    // fallback: raw provider.call using encoded tx data
                    console.log("\n🔎 fallback provider.call on encoded calldata...");
                    _q.label = 8;
                case 8:
                    _q.trys.push([8, 11, , 12]);
                    encoded = iface.encodeFunctionData(METHOD_NAME, args);
                    _m = (_l = provider).call;
                    _p = {};
                    return [4 /*yield*/, signer.getAddress()];
                case 9: return [4 /*yield*/, _m.apply(_l, [(_p.from = _q.sent(), _p.to = FACTORY_ADDRESS, _p.data = encoded, _p)])];
                case 10:
                    _q.sent();
                    console.log("✅ provider.call succeeded (unexpected if callStatic reverted)");
                    return [3 /*break*/, 12];
                case 11:
                    e2_1 = _q.sent();
                    d2 = (_d = (_c = e2_1 === null || e2_1 === void 0 ? void 0 : e2_1.error) === null || _c === void 0 ? void 0 : _c.data) !== null && _d !== void 0 ? _d : e2_1 === null || e2_1 === void 0 ? void 0 : e2_1.data;
                    console.log("❌ provider.call reverted");
                    console.log("message:", (e2_1 === null || e2_1 === void 0 ? void 0 : e2_1.reason) || (e2_1 === null || e2_1 === void 0 ? void 0 : e2_1.message));
                    console.log("decoded:", decodeRevert(iface, d2));
                    console.log("raw   :", d2);
                    return [3 /*break*/, 12];
                case 12:
                    if (!(process.env.FORCE_SEND === "1")) return [3 /*break*/, 15];
                    console.log("\n🚨 FORCE_SEND=1: sending tx (costs gas)...");
                    return [4 /*yield*/, factory[METHOD_NAME].apply(factory, __spreadArray(__spreadArray([], args, false), [{ gasLimit: 4000000 }], false))];
                case 13:
                    tx = _q.sent();
                    console.log("tx:", tx.hash);
                    return [4 /*yield*/, tx.wait()];
                case 14:
                    r = _q.sent();
                    console.log("receipt status:", r.status, "block:", r.blockNumber);
                    _q.label = 15;
                case 15:
                    process.exit(1);
                    return [3 /*break*/, 16];
                case 16: return [2 /*return*/];
            }
        });
    });
}
main().catch(function (e) {
    console.error("\nFatal:", e);
    process.exit(1);
});
//# sourceMappingURL=debug-v4-taker.js.map