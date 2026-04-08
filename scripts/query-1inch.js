#!/usr/bin/env ts-node
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
var yargs_1 = __importDefault(require("yargs/yargs"));
var sdk_1 = require("@ajna-finance/sdk");
var ethers_1 = require("ethers");
var fs_1 = require("fs");
var process_1 = require("process");
var config_types_1 = require("../src/config-types");
var erc20_1 = require("../src/erc20");
var dex_router_1 = require("../src/dex-router");
var utils_1 = require("../src/utils");
var _1inch_1 = require("../src/1inch");
var typechain_types_1 = require("../typechain-types");
var erc20_2 = require("../src/erc20");
var PATH_TO_COMPILER_OUTPUT = 'artifacts/contracts/AjnaKeeperTaker.sol/AjnaKeeperTaker.json';
var argv = (0, yargs_1.default)(process.argv.slice(2))
    .options({
    config: {
        type: 'string',
        demandOption: true,
        describe: 'Path to the config file',
    },
    poolName: {
        type: 'string',
        describe: 'Name of the pool identifying tokens to query',
    },
    action: {
        type: 'string',
        demandOption: true,
        describe: 'Action to perform',
        choices: ['approve', 'deploy', 'quote', 'send', 'swap'],
    },
    amount: {
        type: 'number',
        describe: 'Amount to swap or set allowance',
    }
})
    .parseSync();
function main() {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function () {
        var config, _c, provider, signer, chainId, compilerOutput, keeperTakerFactory, keeperTaker, poolConfig, ajna, pool, dexRouter, collateralDecimals, amount, oneInchRouter, currentAllowance, error_1, poolContract, collateralScale, quoteScale, quote, error_2, swapData, keeperTaker, tx;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    // validate script arguments
                    if (['approve', 'quote', 'send', 'swap'].includes(argv.action)) {
                        if (!argv.poolName)
                            throw new Error('Pool name is required for this action');
                        if (!argv.amount)
                            throw new Error('Amount is required for this action');
                    }
                    return [4 /*yield*/, (0, config_types_1.readConfigFile)(argv.config)];
                case 1:
                    config = _d.sent();
                    return [4 /*yield*/, (0, utils_1.getProviderAndSigner)(config.keeperKeystore, config.ethRpcUrl)];
                case 2:
                    _c = _d.sent(), provider = _c.provider, signer = _c.signer;
                    return [4 /*yield*/, signer.getChainId()];
                case 3:
                    chainId = _d.sent();
                    if (!(argv.action === 'deploy')) return [3 /*break*/, 7];
                    return [4 /*yield*/, fs_1.promises.readFile(PATH_TO_COMPILER_OUTPUT, 'utf8')];
                case 4:
                    compilerOutput = _d.sent();
                    keeperTakerFactory = ethers_1.ContractFactory.fromSolidity(compilerOutput, signer);
                    return [4 /*yield*/, keeperTakerFactory.deploy(config.ajna.erc20PoolFactory)];
                case 5:
                    keeperTaker = _d.sent();
                    return [4 /*yield*/, keeperTaker.deployed()];
                case 6:
                    _d.sent();
                    console.log("AjnaKeeperTaker deployed to:", keeperTaker.address);
                    console.log('Update config.keeperTaker with this address');
                    (0, process_1.exit)(0);
                    _d.label = 7;
                case 7:
                    poolConfig = config.pools.find(function (pool) { return pool.name === argv.poolName; });
                    if (!poolConfig)
                        throw new Error("Pool with name ".concat(argv.poolName, " not found in config"));
                    (0, config_types_1.configureAjna)(config.ajna);
                    ajna = new sdk_1.AjnaSDK(provider);
                    return [4 /*yield*/, ajna.fungiblePoolFactory.getPoolByAddress(poolConfig.address)];
                case 8:
                    pool = _d.sent();
                    console.log('Found pool on chain', chainId, 'quoting', pool.collateralAddress, 'in', pool.quoteAddress);
                    dexRouter = new dex_router_1.DexRouter(signer, {
                        oneInchRouters: (_a = config === null || config === void 0 ? void 0 : config.oneInchRouters) !== null && _a !== void 0 ? _a : {},
                        connectorTokens: (_b = config === null || config === void 0 ? void 0 : config.connectorTokens) !== null && _b !== void 0 ? _b : [],
                    });
                    return [4 /*yield*/, (0, erc20_2.getDecimalsErc20)(signer, pool.collateralAddress)];
                case 9:
                    collateralDecimals = _d.sent();
                    amount = ethers_1.ethers.utils.parseUnits(argv.amount.toString(), collateralDecimals);
                    if (!(argv.action === 'approve' && pool && dexRouter)) return [3 /*break*/, 15];
                    oneInchRouter = dexRouter.getRouter(chainId);
                    return [4 /*yield*/, (0, erc20_1.getAllowanceOfErc20)(signer, pool.collateralAddress, oneInchRouter)];
                case 10:
                    currentAllowance = _d.sent();
                    console.log("Current allowance: ".concat(currentAllowance.toString(), ", Amount: ").concat(amount.toString()));
                    if (!currentAllowance.lt(amount)) return [3 /*break*/, 14];
                    _d.label = 11;
                case 11:
                    _d.trys.push([11, 13, , 14]);
                    console.log("Approving 1inch router ".concat(oneInchRouter, " for token: ").concat(pool.collateralAddress));
                    return [4 /*yield*/, (0, erc20_1.approveErc20)(signer, pool.collateralAddress, oneInchRouter, amount)];
                case 12:
                    _d.sent();
                    console.log("Approval successful for token ".concat(pool.collateralAddress));
                    return [3 /*break*/, 14];
                case 13:
                    error_1 = _d.sent();
                    console.error("Failed to approve token ".concat(pool.collateralAddress, " for 1inch: ").concat(error_1));
                    return [3 /*break*/, 14];
                case 14: return [3 /*break*/, 30];
                case 15:
                    if (!(argv.action === 'quote' && pool && dexRouter)) return [3 /*break*/, 19];
                    poolContract = new ethers_1.ethers.Contract(pool.poolAddress, [
                        'function collateralScale() external view returns (uint256)',
                        'function quoteTokenScale() external view returns (uint256)'
                    ], signer);
                    return [4 /*yield*/, poolContract.collateralScale()];
                case 16:
                    collateralScale = _d.sent();
                    return [4 /*yield*/, poolContract.quoteTokenScale()];
                case 17:
                    quoteScale = _d.sent();
                    console.log('Pool collateral scale:', collateralScale.toString());
                    console.log('Expected for USDC (6 decimals):', '10^12 =', Math.pow(10, 12).toString());
                    console.log('Pool quote scale:', quoteScale.toString());
                    console.log('Expected for savUSD (18 decimals):', '10^18 =', Math.pow(10, 18).toString());
                    return [4 /*yield*/, dexRouter.getQuoteFromOneInch(chainId, amount, pool.collateralAddress, pool.quoteAddress)];
                case 18:
                    quote = _d.sent();
                    console.log('Quote:', quote);
                    return [3 /*break*/, 30];
                case 19:
                    if (!(argv.action === 'send' && pool && config.keeperTaker)) return [3 /*break*/, 24];
                    _d.label = 20;
                case 20:
                    _d.trys.push([20, 22, , 23]);
                    console.log('Sending', amount.toString(), 'to keeperTaker at', config.keeperTaker);
                    return [4 /*yield*/, (0, erc20_1.transferErc20)(signer, pool.collateralAddress, config.keeperTaker, amount)];
                case 21:
                    _d.sent();
                    return [3 /*break*/, 23];
                case 22:
                    error_2 = _d.sent();
                    console.error("Failed to send token ".concat(pool.collateralAddress, ": ").concat(error_2));
                    return [3 /*break*/, 23];
                case 23: return [3 /*break*/, 30];
                case 24:
                    if (!(argv.action === 'swap' && pool && dexRouter && config.keeperTaker)) return [3 /*break*/, 29];
                    return [4 /*yield*/, dexRouter.getSwapDataFromOneInch(chainId, amount, pool.collateralAddress, pool.quoteAddress, 1, config.keeperTaker, true)];
                case 25:
                    swapData = _d.sent();
                    if (!config.keeperTaker) return [3 /*break*/, 28];
                    console.log('Attempting to transact with keeperTaker at', config.keeperTaker);
                    keeperTaker = typechain_types_1.AjnaKeeperTaker__factory.connect(config.keeperTaker, signer);
                    return [4 /*yield*/, keeperTaker.testOneInchSwapBytes(dexRouter.getRouter(chainId), (0, _1inch_1.convertSwapApiResponseToDetailsBytes)(swapData.data), amount.mul(9).div(10))];
                case 26:
                    tx = _d.sent();
                    console.log('Transaction hash:', tx.hash);
                    return [4 /*yield*/, tx.wait()];
                case 27:
                    _d.sent();
                    console.log('Transaction confirmed');
                    _d.label = 28;
                case 28: return [3 /*break*/, 30];
                case 29: throw new Error("Unknown action: ".concat(argv.action));
                case 30: return [2 /*return*/];
            }
        });
    });
}
main();
//# sourceMappingURL=query-1inch.js.map