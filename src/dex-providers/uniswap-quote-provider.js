"use strict";
// src/dex-providers/uniswap-quote-provider.ts
// OFFICIAL UNISWAP APPROACH: Using QuoterV2 contract with callStatic
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
exports.UniswapV3QuoteProvider = void 0;
var ethers_1 = require("ethers");
var logging_1 = require("../logging");
var erc20_1 = require("../erc20");
// QuoterV2 ABI - the official interface for getting quotes
var QUOTER_V2_ABI = [
    'function quoteExactInputSingle((address tokenIn, address tokenOut, uint256 amountIn, uint24 fee, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut, uint160 sqrtPriceX96After, uint32 initializedTicksCrossed, uint256 gasEstimate)'
];
/**
 * Official Uniswap V3 quote provider using QuoterV2 contract
 * Uses the configured QuoterV2 address per chain - clean and simple!
 */
var UniswapV3QuoteProvider = /** @class */ (function () {
    function UniswapV3QuoteProvider(signer, config) {
        this.signer = signer;
        this.config = config;
    }
    /**
     * Get a quote using the configured QuoterV2 contract
     * Simple and clean - just uses the address from config
     */
    UniswapV3QuoteProvider.prototype.getQuote = function (srcAmount, srcToken, dstToken, feeTier) {
        return __awaiter(this, void 0, void 0, function () {
            var tier, quoterContract, quoteParams, inputDecimals, outputDecimals, result, amountOut, sqrtPriceX96After, initializedTicksCrossed, gasEstimate, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        _a.trys.push([0, 4, , 5]);
                        tier = feeTier || this.config.defaultFeeTier;
                        // Check if QuoterV2 address is configured
                        if (!this.config.quoterV2Address) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: 'QuoterV2 address not configured for this chain'
                                }];
                        }
                        quoterContract = new ethers_1.ethers.Contract(this.config.quoterV2Address, QUOTER_V2_ABI, this.signer);
                        quoteParams = {
                            tokenIn: srcToken,
                            tokenOut: dstToken,
                            amountIn: srcAmount,
                            fee: tier,
                            sqrtPriceLimitX96: 0 // No price limit
                        };
                        return [4 /*yield*/, (0, erc20_1.getDecimalsErc20)(this.signer, srcToken)];
                    case 1:
                        inputDecimals = _a.sent();
                        return [4 /*yield*/, (0, erc20_1.getDecimalsErc20)(this.signer, dstToken)];
                    case 2:
                        outputDecimals = _a.sent();
                        logging_1.logger.debug("Getting Uniswap V3 quote using QuoterV2 at ".concat(this.config.quoterV2Address, ": ").concat(ethers_1.ethers.utils.formatUnits(srcAmount, inputDecimals), " ").concat(srcToken, " -> ").concat(dstToken, " (fee: ").concat(tier, ")"));
                        return [4 /*yield*/, quoterContract.callStatic.quoteExactInputSingle(quoteParams)];
                    case 3:
                        result = _a.sent();
                        amountOut = result[0], sqrtPriceX96After = result[1], initializedTicksCrossed = result[2], gasEstimate = result[3];
                        if (amountOut.eq(0)) {
                            return [2 /*return*/, {
                                    success: false,
                                    error: 'Quote returned zero output amount'
                                }];
                        }
                        logging_1.logger.debug("Uniswap V3 quote result: ".concat(ethers_1.ethers.utils.formatUnits(amountOut, outputDecimals), " ").concat(dstToken, " (gas: ").concat(gasEstimate.toString(), ")"));
                        return [2 /*return*/, {
                                success: true,
                                dstAmount: amountOut.toString()
                            }];
                    case 4:
                        error_1 = _a.sent();
                        logging_1.logger.error("Uniswap V3 quote failed: ".concat(error_1.message));
                        return [2 /*return*/, {
                                success: false,
                                error: error_1.message
                            }];
                    case 5: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * Check if this provider is available (has required configuration)
     */
    UniswapV3QuoteProvider.prototype.isAvailable = function () {
        return !!(this.config.universalRouterAddress &&
            this.config.poolFactoryAddress &&
            this.config.defaultFeeTier &&
            this.config.wethAddress &&
            this.config.quoterV2Address // NEW: Require QuoterV2 address
        );
    };
    /**
     * Get the configured QuoterV2 address for debugging
     */
    UniswapV3QuoteProvider.prototype.getQuoterAddress = function () {
        return this.config.quoterV2Address;
    };
    return UniswapV3QuoteProvider;
}());
exports.UniswapV3QuoteProvider = UniswapV3QuoteProvider;
//# sourceMappingURL=uniswap-quote-provider.js.map