"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
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
exports.validateTakeSettings = exports.configureAjna = exports.assertIsValidConfig = exports.readConfigFile = exports.validatePostAuctionDex = exports.PostAuctionDex = exports.RewardActionLabel = exports.TokenToCollect = exports.LiquiditySource = exports.PriceOriginPoolReference = exports.PriceOriginSource = void 0;
var fs_1 = require("fs");
var path_1 = __importDefault(require("path"));
var sdk_1 = require("@ajna-finance/sdk");
var logging_1 = require("./logging");
var PriceOriginSource;
(function (PriceOriginSource) {
    PriceOriginSource["FIXED"] = "fixed";
    PriceOriginSource["COINGECKO"] = "coingecko";
    PriceOriginSource["POOL"] = "pool";
})(PriceOriginSource || (exports.PriceOriginSource = PriceOriginSource = {}));
var PriceOriginPoolReference;
(function (PriceOriginPoolReference) {
    PriceOriginPoolReference["HPB"] = "hpb";
    PriceOriginPoolReference["HTP"] = "htp";
    PriceOriginPoolReference["LUP"] = "lup";
    PriceOriginPoolReference["LLB"] = "llb";
})(PriceOriginPoolReference || (exports.PriceOriginPoolReference = PriceOriginPoolReference = {}));
// should match LiquiditySource enum in AjnaKeeperTaker.sol
var LiquiditySource;
(function (LiquiditySource) {
    LiquiditySource[LiquiditySource["NONE"] = 0] = "NONE";
    LiquiditySource[LiquiditySource["ONEINCH"] = 1] = "ONEINCH";
    LiquiditySource[LiquiditySource["UNISWAPV3"] = 2] = "UNISWAPV3";
    LiquiditySource[LiquiditySource["SUSHISWAP"] = 3] = "SUSHISWAP";
    LiquiditySource[LiquiditySource["CURVE"] = 4] = "CURVE";
    LiquiditySource[LiquiditySource["UNISWAPV4"] = 5] = "UNISWAPV4";
})(LiquiditySource || (exports.LiquiditySource = LiquiditySource = {}));
var TokenToCollect;
(function (TokenToCollect) {
    TokenToCollect["QUOTE"] = "quote";
    TokenToCollect["COLLATERAL"] = "collateral";
})(TokenToCollect || (exports.TokenToCollect = TokenToCollect = {}));
var RewardActionLabel;
(function (RewardActionLabel) {
    RewardActionLabel["TRANSFER"] = "transfer";
    RewardActionLabel["EXCHANGE"] = "exchange";
})(RewardActionLabel || (exports.RewardActionLabel = RewardActionLabel = {}));
//PostAuctionDex enum for scalable DEX selection
var PostAuctionDex;
(function (PostAuctionDex) {
    PostAuctionDex["ONEINCH"] = "oneinch";
    PostAuctionDex["UNISWAP_V3"] = "uniswap_v3";
    PostAuctionDex["SUSHISWAP"] = "sushiswap";
    PostAuctionDex["UNISWAP_V4"] = "uniswap_v4";
    // Future additions:
    // CURVE = 'curve',
    // IZUMI = 'izumi', 
    // BALANCER = 'balancer',
    // DODO = 'dodo'
})(PostAuctionDex || (exports.PostAuctionDex = PostAuctionDex = {}));
// Validation function for PostAuctionDex configuration
function validatePostAuctionDex(dexProvider, config) {
    switch (dexProvider) {
        case PostAuctionDex.ONEINCH:
            if (!config.oneInchRouters) {
                throw new Error('PostAuctionDex.ONEINCH requires oneInchRouters configuration');
            }
            break;
        case PostAuctionDex.UNISWAP_V3:
            if (!config.universalRouterOverrides) {
                throw new Error('PostAuctionDex.UNISWAP_V3 requires universalRouterOverrides configuration');
            }
            break;
        case PostAuctionDex.SUSHISWAP:
            if (!config.sushiswapRouterOverrides) {
                throw new Error('PostAuctionDex.SUSHISWAP requires sushiswapRouterOverrides configuration');
            }
            break;
        case PostAuctionDex.UNISWAP_V4: // NEW
            if (!config.uniswapV4RouterOverrides)
                throw new Error('PostAuctionDex.UNISWAP_V4 requires uniswapV4RouterOverrides configuration');
            if (!config.uniswapV4RouterOverrides.router)
                throw new Error('PostAuctionDex.UNISWAP_V4: router address missing in uniswapV4RouterOverrides');
            if (!config.uniswapV4RouterOverrides.pools || Object.keys(config.uniswapV4RouterOverrides.pools).length === 0)
                throw new Error('PostAuctionDex.UNISWAP_V4: at least one poolKey must be configured');
            return;
        default:
            throw new Error("Unsupported PostAuctionDex: ".concat(dexProvider));
    }
}
exports.validatePostAuctionDex = validatePostAuctionDex;
function readConfigFile(filePath) {
    return __awaiter(this, void 0, void 0, function () {
        var imported, config, absolutePath, fileContents, parsedFile, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 5, , 6]);
                    if (!filePath.endsWith('.ts')) return [3 /*break*/, 2];
                    return [4 /*yield*/, Promise.resolve("".concat('../' + filePath)).then(function (s) { return __importStar(require(s)); })];
                case 1:
                    imported = _a.sent();
                    config = imported.default;
                    // await validateUniswapAddresses(config);
                    return [2 /*return*/, config];
                case 2:
                    absolutePath = path_1.default.resolve(filePath);
                    return [4 /*yield*/, fs_1.promises.readFile(absolutePath, 'utf-8')];
                case 3:
                    fileContents = _a.sent();
                    parsedFile = JSON.parse(fileContents);
                    assertIsValidConfig(parsedFile);
                    // await validateUniswapAddresses(parsedFile);
                    return [2 /*return*/, parsedFile];
                case 4: return [3 /*break*/, 6];
                case 5:
                    error_1 = _a.sent();
                    logging_1.logger.error('Error reading config file:', error_1);
                    process.exit(1);
                    return [3 /*break*/, 6];
                case 6: return [2 /*return*/];
            }
        });
    });
}
exports.readConfigFile = readConfigFile;
function assertIsValidConfig(config) {
    expectProperty(config, 'ethRpcUrl');
    expectProperty(config, 'subgraphUrl');
    expectProperty(config, 'keeperKeystore');
    expectProperty(config, 'ajna');
    expectProperty(config, 'coinGeckoApiKey');
    expectProperty(config, 'pools');
}
exports.assertIsValidConfig = assertIsValidConfig;
function expectProperty(config, key) {
    if (!config.hasOwnProperty(key)) {
        throw new Error("Missing ".concat(String(key), " key from config"));
    }
}
function configureAjna(ajnaConfig) {
    var _a, _b, _c;
    new sdk_1.Config(ajnaConfig.erc20PoolFactory, ajnaConfig.erc721PoolFactory, ajnaConfig.poolUtils, ajnaConfig.positionManager, ajnaConfig.ajnaToken, (_a = ajnaConfig.grantFund) !== null && _a !== void 0 ? _a : '', (_b = ajnaConfig.burnWrapper) !== null && _b !== void 0 ? _b : '', (_c = ajnaConfig.lenderHelper) !== null && _c !== void 0 ? _c : '');
}
exports.configureAjna = configureAjna;
// /** Throws error if it cannot find the WETH9 token from uniswap's built in addresses or from the KeeperConfig. */
// async function validateUniswapAddresses(config: KeeperConfig) {
//   const poolsWithExchangeToWeth = config.pools.filter(
//     (poolConfig) =>
//       poolConfig.collectLpReward?.rewardAction?.action ==
//       RewardActionLabel.EXCHANGE_ON_UNISWAP
//   );
//   if (poolsWithExchangeToWeth.length > 0) {
//     const provider = new JsonRpcProvider(config.ethRpcUrl);
//     const { chainId } = await provider.getNetwork();
//     const weth = await getWethToken(
//       chainId,
//       provider,
//       config.uniswapOverrides?.wethAddress
//     );
//     logger.info(
//       `Exchanging LP rewards to ${weth.symbol}, address: ${weth.address}`
//     );
//   }
// }
function validateTakeSettings(config, keeperConfig) {
    var _a;
    var hasArbTake = config.minCollateral !== undefined && config.hpbPriceFactor !== undefined;
    var hasTake = config.liquiditySource !== undefined && config.marketPriceFactor !== undefined;
    if (!hasArbTake && !hasTake) {
        throw new Error('TakeSettings: Must configure arbTake (minCollateral, hpbPriceFactor) or take (liquiditySource, marketPriceFactor)');
    }
    if (hasTake) {
        // Fix 1: Proper validation for multiple DEX sources
        if (config.liquiditySource === LiquiditySource.NONE) {
            throw new Error('TakeSettings: liquiditySource cannot be NONE');
        }
        if (config.liquiditySource !== LiquiditySource.ONEINCH &&
            config.liquiditySource !== LiquiditySource.UNISWAPV3 &&
            config.liquiditySource !== LiquiditySource.SUSHISWAP &&
            config.liquiditySource !== LiquiditySource.UNISWAPV4) {
            throw new Error('TakeSettings: liquiditySource must be ONEINCH or UNISWAPV3 or SUSHISWAP');
        }
        if (config.marketPriceFactor === undefined || config.marketPriceFactor <= 0) {
            throw new Error('TakeSettings: marketPriceFactor must be positive');
        }
        // Fix 2: Different validation based on DEX type
        if (config.liquiditySource === LiquiditySource.ONEINCH) {
            if (!keeperConfig.keeperTaker) {
                throw new Error('TakeSettings: keeperTaker required when liquiditySource is ONEINCH');
            }
        }
        if (config.liquiditySource === LiquiditySource.UNISWAPV3) {
            if (!keeperConfig.keeperTakerFactory) {
                throw new Error('TakeSettings: keeperTakerFactory required when liquiditySource is UNISWAPV3');
            }
            if (!keeperConfig.takerContracts || !keeperConfig.takerContracts['UniswapV3']) {
                throw new Error('TakeSettings: takerContracts.UniswapV3 required when liquiditySource is UNISWAPV3');
            }
            if (!keeperConfig.universalRouterOverrides) {
                throw new Error('TakeSettings: universalRouterOverrides required when liquiditySource is UNISWAPV3');
            }
        }
        if (config.liquiditySource === LiquiditySource.SUSHISWAP) {
            if (!keeperConfig.keeperTakerFactory) {
                throw new Error('TakeSettings: keeperTakerFactory required when liquiditySource is SUSHISWAP');
            }
            if (!keeperConfig.takerContracts || !keeperConfig.takerContracts['SushiSwap']) {
                throw new Error('TakeSettings: takerContracts.SushiSwap required when liquiditySource is SUSHISWAP');
            }
            if (!keeperConfig.sushiswapRouterOverrides) {
                throw new Error('TakeSettings: sushiswapRouterOverrides required when liquiditySource is SUSHISWAP');
            }
        }
        if (config.liquiditySource === LiquiditySource.UNISWAPV4) { // NEW
            if (!keeperConfig.keeperTakerFactory)
                throw new Error('TakeSettings: keeperTakerFactory required when liquiditySource is UNISWAPV4');
            if (!((_a = keeperConfig.takerContracts) === null || _a === void 0 ? void 0 : _a['UniswapV4']))
                throw new Error('TakeSettings: takerContracts.UniswapV4 required');
            if (!keeperConfig.uniswapV4RouterOverrides)
                throw new Error('TakeSettings: uniswapV4RouterOverrides required');
            if (!keeperConfig.uniswapV4RouterOverrides.router)
                throw new Error('TakeSettings: V4 router/adapter address missing');
            if (!keeperConfig.uniswapV4RouterOverrides.pools || Object.keys(keeperConfig.uniswapV4RouterOverrides.pools).length === 0)
                throw new Error('TakeSettings: at least one V4 poolKey must be configured');
            if (!keeperConfig.uniswapV4RouterOverrides.poolManager) {
                logging_1.logger.warn('TakeSettings: poolManager address recommended for V4');
            }
            // AUDIT FIX: Validate V4 poolKey configurations
            var v4Pools = keeperConfig.uniswapV4RouterOverrides.pools;
            var STANDARD_TICK_SPACINGS = {
                100: 1,
                500: 10,
                3000: 60,
                10000: 200, // 1.00% fee -> tickSpacing 200
            };
            var DYNAMIC_FEE_FLAG = 0x800000; // LPFeeLibrary.DYNAMIC_FEE_FLAG
            for (var _i = 0, _b = Object.entries(v4Pools); _i < _b.length; _i++) {
                var _c = _b[_i], poolName = _c[0], poolKey = _c[1];
                // Check currency ordering (warn only - we normalize at runtime)
                if (poolKey.token0.toLowerCase() > poolKey.token1.toLowerCase()) {
                    logging_1.logger.warn("V4 Pool ".concat(poolName, ": token0 > token1 - will be normalized at runtime"));
                }
                // Check fee/tickSpacing consistency
                var isDynamicFee = (poolKey.fee & DYNAMIC_FEE_FLAG) !== 0;
                if (!isDynamicFee) {
                    var expectedTickSpacing = STANDARD_TICK_SPACINGS[poolKey.fee];
                    if (expectedTickSpacing !== undefined && poolKey.tickSpacing !== expectedTickSpacing) {
                        logging_1.logger.warn("V4 Pool ".concat(poolName, ": fee=").concat(poolKey.fee, " typically uses tickSpacing=").concat(expectedTickSpacing, ", ") +
                            "but configured with tickSpacing=".concat(poolKey.tickSpacing));
                    }
                }
                // Check valid fee range (V4 fees are in hundredths of a basis point, max 1000000 = 100%)
                if (poolKey.fee < 0 || poolKey.fee > 1000000) {
                    throw new Error("V4 Pool ".concat(poolName, ": invalid fee ").concat(poolKey.fee, " (must be 0-1000000)"));
                }
                // Check hooks address format
                if (!poolKey.hooks || !poolKey.hooks.startsWith('0x') || poolKey.hooks.length !== 42) {
                    throw new Error("V4 Pool ".concat(poolName, ": invalid hooks address format"));
                }
            }
        }
    }
    if (hasArbTake) {
        if (config.minCollateral <= 0) {
            throw new Error('TakeSettings: minCollateral must be greater than 0');
        }
        if (config.hpbPriceFactor === undefined || config.hpbPriceFactor <= 0) {
            throw new Error('TakeSettings: hpbPriceFactor must be positive');
        }
    }
}
exports.validateTakeSettings = validateTakeSettings;
//# sourceMappingURL=config-types.js.map