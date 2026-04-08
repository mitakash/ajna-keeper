"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
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
var v3_sdk_1 = require("@uniswap/v3-sdk");
var chai_1 = __importStar(require("chai"));
var chai_as_promised_1 = __importDefault(require("chai-as-promised"));
var ethers_1 = require("ethers");
var sinon_1 = __importDefault(require("sinon"));
var uniswap_1 = __importDefault(require("../uniswap"));
chai_1.default.use(chai_as_promised_1.default);
var CustomContract = /** @class */ (function (_super) {
    __extends(CustomContract, _super);
    function CustomContract(address, abi, provider) {
        var _this = _super.call(this, address, abi, provider) || this;
        _this.liquidity = sinon_1.default.stub();
        _this.slot0 = sinon_1.default.stub();
        _this.decimals = sinon_1.default.stub();
        _this.exactInputSingle = sinon_1.default.stub();
        _this.hash = sinon_1.default.stub();
        return _this;
    }
    return CustomContract;
}(ethers_1.Contract));
var CustomSigner = /** @class */ (function (_super) {
    __extends(CustomSigner, _super);
    function CustomSigner(provider) {
        var _this = _super.call(this) || this;
        _this.getAddress = sinon_1.default
            .stub()
            .resolves('0x964d9D1A532B5a5DaeacBAc71d46320DE313AE9C');
        _this.signMessage = sinon_1.default.stub().resolves('0xMockSignature');
        _this.signTransaction = sinon_1.default.stub().resolves('0xMockTransaction');
        _this.connect = sinon_1.default.stub().returns(_this);
        Object.defineProperty(_this, 'provider', { value: provider });
        return _this;
    }
    return CustomSigner;
}(ethers_1.Signer));
describe('getPoolInfo', function () {
    var contractStub;
    var mockProvider = new ethers_1.providers.JsonRpcProvider();
    beforeEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            contractStub = new CustomContract('0x964d9D1A532B5a5DaeacBAc71d46320DE313AE9C', [], mockProvider);
            contractStub.liquidity.resolves(ethers_1.BigNumber.from('1000000000000000000'));
            contractStub.slot0.resolves([
                ethers_1.BigNumber.from('79228162514264337593543950336'),
                0,
            ]);
            return [2 /*return*/];
        });
    }); });
    afterEach(function () {
        sinon_1.default.restore();
    });
    it('should return pool info correctly', function () { return __awaiter(void 0, void 0, void 0, function () {
        var poolInfo;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, uniswap_1.default.getPoolInfo(contractStub)];
                case 1:
                    poolInfo = _a.sent();
                    (0, chai_1.expect)(poolInfo).to.have.property('liquidity');
                    (0, chai_1.expect)(poolInfo).to.have.property('sqrtPriceX96');
                    (0, chai_1.expect)(poolInfo).to.have.property('tick');
                    (0, chai_1.expect)(poolInfo.liquidity.toString()).to.equal('1000000000000000000');
                    (0, chai_1.expect)(poolInfo.sqrtPriceX96.toString()).to.equal('79228162514264337593543950336');
                    (0, chai_1.expect)(poolInfo.tick.toString()).to.equal('0');
                    return [2 /*return*/];
            }
        });
    }); });
});
describe('swapToWeth', function () {
    var mockProvider = new ethers_1.providers.JsonRpcProvider();
    var mockSigner;
    var mockSwapRouter;
    beforeEach(function () {
        mockProvider.getResolver = sinon_1.default.stub().resolves(null);
        mockProvider.getBalance = sinon_1.default.stub().resolves('1000000000000000000');
        mockSigner = new CustomSigner(mockProvider);
        mockSigner.getAddress.resolves('0x964d9D1A532B5a5DaeacBAc71d46320DE313AE9C');
        Object.defineProperty(mockSigner, 'provider', { value: mockProvider });
        mockSwapRouter = new CustomContract('0x964d9D1A532B5a5DaeacBAc71d46320DE313AE9C', [], mockProvider);
        mockSwapRouter.liquidity.resolves(ethers_1.BigNumber.from('1000000000000000000'));
        mockSwapRouter.slot0.resolves([
            ethers_1.BigNumber.from('79228162514264337593543950336'),
            0,
        ]);
        sinon_1.default.stub(mockSwapRouter, 'connect').returns(mockSwapRouter);
    });
    afterEach(function () {
        sinon_1.default.restore();
    });
    it('should throw an error for invalid parameters', function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, (0, chai_1.expect)(uniswap_1.default.swapToWeth(null, '', ethers_1.ethers.utils.parseUnits('100', 8), v3_sdk_1.FeeAmount.MEDIUM)).to.be.rejectedWith('Invalid parameters provided to swapToWeth')];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    });
    it('should throw an error if signer does not have a provider', function () { return __awaiter(void 0, void 0, void 0, function () {
        var invalidSigner, swapWethPromise;
        return __generator(this, function (_a) {
            invalidSigner = {
                getAddress: sinon_1.default.stub().resolves('0xMock'),
            };
            swapWethPromise = uniswap_1.default.swapToWeth(invalidSigner, '0x964d9D1A532B5a5DaeacBAc71d46320DE313AE9C', ethers_1.ethers.utils.parseUnits('100', 8), v3_sdk_1.FeeAmount.MEDIUM, { uniswapV3Router: mockSwapRouter.address });
            (0, chai_1.expect)(swapWethPromise).to.be.rejectedWith('No provider available, skipping swap');
            return [2 /*return*/];
        });
    }); });
});
//# sourceMappingURL=uniswap.test.js.map