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
Object.defineProperty(exports, "__esModule", { value: true });
// scripts/deploy-v4-taker-only.ts
var hardhat_1 = require("hardhat");
var path = __importStar(require("path"));
function main() {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var config, deployer, _b, _c, _d, _e, _f, keeperTakerFactory, poolManager, ajnaPoolFactory, artifactPath, artifact, Factory, taker;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    config = require('../example-uniswapV4-config copy');
                    console.log('\n🚀 Deploying UniswapV4KeeperTaker...\n');
                    return [4 /*yield*/, hardhat_1.ethers.getSigners()];
                case 1:
                    deployer = (_g.sent())[0];
                    console.log('Deployer address:', deployer.address);
                    _c = (_b = console).log;
                    _d = ['Deployer balance:'];
                    _f = (_e = hardhat_1.ethers.utils).formatEther;
                    return [4 /*yield*/, deployer.getBalance()];
                case 2:
                    _c.apply(_b, _d.concat([_f.apply(_e, [_g.sent()]), 'ETH\n']));
                    keeperTakerFactory = config.default.keeperTakerFactory;
                    poolManager = config.default.uniswapV4RouterOverrides.poolManager;
                    ajnaPoolFactory = (_a = config.default.ajna) === null || _a === void 0 ? void 0 : _a.erc20PoolFactory;
                    if (!keeperTakerFactory) {
                        throw new Error('keeperTakerFactory not found in config');
                    }
                    if (!poolManager) {
                        throw new Error('poolManager not found in config.uniswapV4RouterOverrides');
                    }
                    if (!ajnaPoolFactory) {
                        throw new Error('ajna.erc20PoolFactory not found in config - required for pool validation');
                    }
                    console.log('V4 PoolManager address:', poolManager);
                    console.log('Ajna Pool Factory address:', ajnaPoolFactory);
                    console.log('Authorized Factory address:', keeperTakerFactory);
                    console.log('');
                    artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'takers', 'UniswapV4KeeperTaker.sol', 'UniswapV4KeeperTaker.json');
                    artifact = require(artifactPath);
                    console.log('Contract bytecode size:', artifact.bytecode.length / 2, 'bytes\n');
                    Factory = new hardhat_1.ethers.ContractFactory(artifact.abi, artifact.bytecode, deployer);
                    console.log('Deploying contract...');
                    return [4 /*yield*/, Factory.deploy(poolManager, // First arg: _poolManager (V4 PoolManager)
                        ajnaPoolFactory, // Second arg: _poolFactory (Ajna pool factory for validation)
                        keeperTakerFactory, // Third arg: _authorizedFactory (factory that can call takeWithAtomicSwap)
                        {
                            gasLimit: 3000000, // Explicit gas limit for deployment
                        })];
                case 3:
                    taker = _g.sent();
                    console.log('Deploy tx:', taker.deployTransaction.hash);
                    console.log('Waiting for confirmation...');
                    return [4 /*yield*/, taker.deployed()];
                case 4:
                    _g.sent();
                    console.log('\n✅ UniswapV4KeeperTaker deployed at:', taker.address);
                    console.log('');
                    console.log('📝 Next steps:');
                    console.log('1. Update factory to use this taker:');
                    console.log("   npx hardhat run scripts/update-v4-taker-in-factory.ts --network base");
                    console.log('');
                    console.log('2. Update your config file with:');
                    console.log("   takerContracts: {");
                    console.log("     'UniswapV4': '".concat(taker.address, "',"));
                    console.log("   }");
                    console.log('');
                    console.log('3. Restart your keeper');
                    console.log('');
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
//# sourceMappingURL=deploy-v4-taker-only.js.map