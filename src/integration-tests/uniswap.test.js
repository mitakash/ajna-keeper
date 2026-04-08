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
var sdk_core_1 = require("@uniswap/sdk-core");
var IUniswapV3Pool_json_1 = __importDefault(require("@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json"));
var SwapRouter_json_1 = require("@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json");
var v3_sdk_1 = require("@uniswap/v3-sdk");
var ethers_1 = require("ethers");
var erc20_abi_json_1 = __importDefault(require("../abis/erc20.abi.json"));
var test_config_1 = require("./test-config");
var test_utils_1 = require("./test-utils");
var uniswap_helpers_1 = require("./uniswap-helpers");
var chai_1 = require("chai");
var uniswap_1 = require("../uniswap");
var erc20_1 = require("../erc20");
var UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
var NONFUNGIBLE_POSITION_MANAGER_ADDRESS = '0xC36442b4a4522E871399CD717aBDD847Ab11FE88';
var uniswapRouter;
describe('Uniswap V3 Integration Tests', function () {
    var _this = this;
    var wbtcSigner;
    var wethSigner;
    var wbtcSignerAddress;
    var wethSignerAddress;
    before(function () { return __awaiter(_this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, test_utils_1.resetHardhat)()];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(test_config_1.MAINNET_CONFIG.WBTC_USDC_POOL.collateralWhaleAddress)];
                case 2:
                    // Impersonate signers
                    wbtcSigner = _a.sent();
                    return [4 /*yield*/, (0, test_utils_1.impersonateSigner)(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress)];
                case 3:
                    wethSigner = _a.sent();
                    return [4 /*yield*/, wbtcSigner.getAddress()];
                case 4:
                    wbtcSignerAddress = _a.sent();
                    return [4 /*yield*/, wethSigner.getAddress()];
                case 5:
                    wethSignerAddress = _a.sent();
                    // Add balance to signers
                    return [4 /*yield*/, (0, test_utils_1.setBalance)(wbtcSignerAddress, '0x10000000000000000000000000')];
                case 6:
                    // Add balance to signers
                    _a.sent();
                    return [4 /*yield*/, (0, test_utils_1.setBalance)(wethSignerAddress, '0x10000000000000000000000000')];
                case 7:
                    _a.sent();
                    uniswapRouter = new ethers_1.Contract(UNISWAP_V3_ROUTER, SwapRouter_json_1.abi, wbtcSigner);
                    return [2 /*return*/];
            }
        });
    }); });
    it('Should add liquidity to the pool', function () {
        return __awaiter(this, void 0, void 0, function () {
            var wbtcContract, wethContract, amountToSend, approveTx, tx, status;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        wbtcContract = new ethers_1.Contract(test_config_1.MAINNET_CONFIG.WBTC_USDC_POOL.collateralAddress, erc20_abi_json_1.default, wbtcSigner);
                        wethContract = new ethers_1.Contract(test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.quoteAddress, erc20_abi_json_1.default, wethSigner);
                        amountToSend = ethers_1.ethers.utils.parseUnits('100', 18);
                        return [4 /*yield*/, wethContract
                                .connect(wethSigner)
                                .approve(wbtcSignerAddress, amountToSend)];
                    case 1:
                        approveTx = _a.sent();
                        return [4 /*yield*/, approveTx.wait()];
                    case 2:
                        _a.sent();
                        return [4 /*yield*/, wethContract
                                .connect(wethSigner)
                                .transfer(wbtcSignerAddress, amountToSend, { gasLimit: 100000 })];
                    case 3:
                        tx = _a.sent();
                        return [4 /*yield*/, tx.wait()];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, wbtcContract
                                .connect(wbtcSigner)
                                .approve(NONFUNGIBLE_POSITION_MANAGER_ADDRESS, ethers_1.ethers.utils.parseUnits('1', 8), { gasLimit: 3000000 })];
                    case 5:
                        _a.sent();
                        return [4 /*yield*/, wethContract
                                .connect(wbtcSigner)
                                .approve(NONFUNGIBLE_POSITION_MANAGER_ADDRESS, ethers_1.ethers.utils.parseUnits('20', 18), { gasLimit: 3000000 })];
                    case 6:
                        _a.sent();
                        return [4 /*yield*/, (0, uniswap_helpers_1.addLiquidity)({
                                signer: wbtcSigner,
                                tokenA: wbtcContract,
                                tokenB: wethContract,
                                amountA: ethers_1.ethers.utils.parseUnits('1', 8),
                                amountB: ethers_1.ethers.utils.parseUnits('20', 18),
                                fee: v3_sdk_1.FeeAmount.MEDIUM,
                            })];
                    case 7:
                        status = _a.sent();
                        (0, chai_1.expect)(status).to.equal(1);
                        return [2 /*return*/];
                }
            });
        });
    });
    it('Should fetch pool info correctly', function () {
        return __awaiter(this, void 0, void 0, function () {
            var provider, chainId, wbtctoken, wethToken, poolAddress, poolContract, poolInfoFromApi, liquidity, sqrtPriceX96, tick;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        provider = (0, test_utils_1.getProvider)();
                        return [4 /*yield*/, provider.getNetwork()];
                    case 1:
                        chainId = (_a.sent()).chainId;
                        wbtctoken = new sdk_core_1.Token(chainId, test_config_1.MAINNET_CONFIG.WBTC_USDC_POOL.collateralAddress, 8, 'WBTC', 'Wrapped Bitcoin');
                        wethToken = new sdk_core_1.Token(chainId, test_config_1.MAINNET_CONFIG.SOL_WETH_POOL.quoteAddress, 18, 'WETH', 'Wrapped Ether');
                        poolAddress = v3_sdk_1.Pool.getAddress(wbtctoken, wethToken, v3_sdk_1.FeeAmount.MEDIUM);
                        poolContract = new ethers_1.Contract(poolAddress, IUniswapV3Pool_json_1.default.abi, provider);
                        return [4 /*yield*/, (0, uniswap_1.getPoolInfo)(poolContract)];
                    case 2:
                        poolInfoFromApi = _a.sent();
                        liquidity = poolInfoFromApi.liquidity, sqrtPriceX96 = poolInfoFromApi.sqrtPriceX96, tick = poolInfoFromApi.tick;
                        (0, chai_1.expect)(liquidity.toString()).to.equal('42631052882170131');
                        (0, chai_1.expect)(sqrtPriceX96.toString()).to.equal('45439762258452960921888508325218226');
                        (0, chai_1.expect)(tick.toString()).to.equal('265204');
                        return [2 /*return*/];
                }
            });
        });
    });
    it('Should perform a swap on Uniswap V3', function () {
        return __awaiter(this, void 0, void 0, function () {
            var provider, chainId, wbtcToken, tokenToSwapBalanceBefore, wethBalanceBefore, amountToSwap, tokenToSwapBalanceAfter, wethBalanceAfter, amountSpent;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        provider = (0, test_utils_1.getProvider)();
                        return [4 /*yield*/, provider.getNetwork()];
                    case 1:
                        chainId = (_a.sent()).chainId;
                        wbtcToken = new sdk_core_1.Token(chainId, test_config_1.MAINNET_CONFIG.WBTC_USDC_POOL.collateralAddress, 8, 'WBTC', 'Wrapped Bitcoin');
                        return [4 /*yield*/, (0, erc20_1.getBalanceOfErc20)(wbtcSigner, test_config_1.MAINNET_CONFIG.WBTC_USDC_POOL.collateralAddress)];
                    case 2:
                        tokenToSwapBalanceBefore = _a.sent();
                        return [4 /*yield*/, (0, erc20_1.getBalanceOfErc20)(wbtcSigner, test_config_1.MAINNET_CONFIG.WETH_ADDRESS)];
                    case 3:
                        wethBalanceBefore = _a.sent();
                        amountToSwap = ethers_1.ethers.BigNumber.from('10000000');
                        return [4 /*yield*/, (0, uniswap_1.swapToWeth)(wbtcSigner, wbtcToken.address, amountToSwap, v3_sdk_1.FeeAmount.MEDIUM, {
                                wethAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
                                uniswapV3Router: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
                            })];
                    case 4:
                        _a.sent();
                        return [4 /*yield*/, (0, erc20_1.getBalanceOfErc20)(wbtcSigner, test_config_1.MAINNET_CONFIG.WBTC_USDC_POOL.collateralAddress)];
                    case 5:
                        tokenToSwapBalanceAfter = _a.sent();
                        return [4 /*yield*/, (0, erc20_1.getBalanceOfErc20)(wbtcSigner, test_config_1.MAINNET_CONFIG.WETH_ADDRESS)];
                    case 6:
                        wethBalanceAfter = _a.sent();
                        amountSpent = tokenToSwapBalanceBefore.sub(tokenToSwapBalanceAfter);
                        (0, chai_1.expect)(amountSpent.eq(amountToSwap), 'Amount spent should equal the amount to spend').to.be.true;
                        (0, chai_1.expect)(wethBalanceAfter.gt(wethBalanceBefore), 'User should gain WETH').to
                            .be.true;
                        return [2 /*return*/];
                }
            });
        });
    });
});
//# sourceMappingURL=uniswap.test.js.map