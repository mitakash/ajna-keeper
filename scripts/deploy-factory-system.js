"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var ethers_1 = require("ethers");
var fs_1 = require("fs");
var path = __importStar(require("path"));
var prompts_1 = require("@inquirer/prompts");
var config_types_1 = require("../src/config-types");
// Gas configuration for different networks
var GAS_CONFIGS = {
    43111: {
        gasLimit: '6000000',
        gasPrice: '100000000', // 0.1 gwei (much cheaper for Hemi)
    },
    43114: {
        gasLimit: '6000000',
        gasPrice: '10000000000', // 10 gwei
    },
    1: {
        gasLimit: '6000000',
    },
    8453: {
        gasLimit: '4000000',
        gasPrice: '100000000', // 0.1 gwei (much lower)
    },
    // Add more networks as needed
};
function getKeystorePassword() {
    return __awaiter(this, void 0, void 0, function () {
        var pswd;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, prompts_1.password)({
                        message: 'Please enter your keystore password',
                        mask: '*',
                    })];
                case 1:
                    pswd = _a.sent();
                    return [2 /*return*/, pswd];
            }
        });
    });
}
function detectChainInfo(config) {
    return __awaiter(this, void 0, void 0, function () {
        var provider, network, chainNames;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    provider = new ethers_1.ethers.providers.JsonRpcProvider(config.ethRpcUrl);
                    return [4 /*yield*/, provider.getNetwork()];
                case 1:
                    network = _a.sent();
                    chainNames = {
                        1: 'Ethereum Mainnet',
                        43114: 'Avalanche',
                        8453: 'Base',
                        42161: 'Arbitrum One',
                        43111: 'Hemi Mainnet',
                        // Add more as needed
                    };
                    return [2 /*return*/, {
                            chainId: network.chainId,
                            name: chainNames[network.chainId] || "Chain ".concat(network.chainId)
                        }];
            }
        });
    });
}
function getGasConfig(chainId) {
    var config = GAS_CONFIGS[chainId];
    if (!config) {
        console.log("\u26A0\uFE0F  No gas config for chain ".concat(chainId, ", using default settings"));
        return { gasLimit: '5000000' }; // Default 5M gas
    }
    return config;
}
function validateConfig(config) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function () {
        var factoryArtifactPath, takerArtifactPath, uniswapPools, required, _i, required_1, field, v4Pools, v4, v4ArtifactPath;
        return __generator(this, function (_c) {
            console.log('Validating configuration...');
            // Check required Ajna addresses
            if (!((_a = config.ajna) === null || _a === void 0 ? void 0 : _a.erc20PoolFactory)) {
                throw new Error('Missing ajna.erc20PoolFactory in config');
            }
            factoryArtifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'factories', 'AjnaKeeperTakerFactory.sol', 'AjnaKeeperTakerFactory.json');
            takerArtifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'takers', 'UniswapV3KeeperTaker.sol', 'UniswapV3KeeperTaker.json');
            try {
                require(factoryArtifactPath);
                require(takerArtifactPath);
            }
            catch (error) {
                throw new Error('Contract artifacts not found. Please run: yarn compile');
            }
            uniswapPools = ((_b = config.pools) === null || _b === void 0 ? void 0 : _b.filter(function (pool) { var _a; return ((_a = pool.take) === null || _a === void 0 ? void 0 : _a.liquiditySource) === 2; } // LiquiditySource.UNISWAPV3
            )) || [];
            if (uniswapPools.length > 0) {
                console.log("Found ".concat(uniswapPools.length, " pools configured for Uniswap V3 takes"));
                // Validate Uniswap V3 configuration
                if (!config.universalRouterOverrides) {
                    throw new Error('universalRouterOverrides required for Uniswap V3 pools');
                }
                required = [
                    'universalRouterAddress',
                    'wethAddress',
                    'permit2Address',
                    'poolFactoryAddress',
                    'quoterV2Address'
                ];
                for (_i = 0, required_1 = required; _i < required_1.length; _i++) {
                    field = required_1[_i];
                    if (!config.universalRouterOverrides[field]) {
                        throw new Error("Missing universalRouterOverrides.".concat(field, " for Uniswap V3"));
                    }
                }
            }
            v4Pools = (config.pools || []).filter(function (p) { var _a; return ((_a = p.take) === null || _a === void 0 ? void 0 : _a.liquiditySource) === 5; } // LiquiditySource.UNISWAPV4
            );
            if (v4Pools.length > 0) {
                v4 = config.uniswapV4RouterOverrides;
                if (!v4)
                    throw new Error('uniswapV4RouterOverrides required when using UNISWAPV4');
                if (!v4.router)
                    throw new Error('uniswapV4RouterOverrides.router is missing');
                if (!v4.pools || Object.keys(v4.pools).length === 0)
                    throw new Error('uniswapV4RouterOverrides.pools must have at least one poolKey');
                v4ArtifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'takers', 'UniswapV4KeeperTaker.sol', 'UniswapV4KeeperTaker.json');
                try {
                    require(v4ArtifactPath);
                }
                catch (_d) {
                    throw new Error('UniswapV4KeeperTaker artifact not found. Run: yarn compile');
                }
            }
            console.log('Configuration validation passed');
            return [2 /*return*/];
        });
    });
}
function deployFactory(deployer, ajnaPoolFactory, chainId) {
    var _a;
    return __awaiter(this, void 0, void 0, function () {
        var factoryArtifact, AjnaKeeperTakerFactory, gasConfig, deployOptions, factory, error_1, higherGasLimit, retryOptions, factory;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    console.log('\n📦 Step 1: Deploying AjnaKeeperTakerFactory...');
                    factoryArtifact = require(path.join(__dirname, '..', 'artifacts', 'contracts', 'factories', 'AjnaKeeperTakerFactory.sol', 'AjnaKeeperTakerFactory.json'));
                    AjnaKeeperTakerFactory = new ethers_1.ethers.ContractFactory(factoryArtifact.abi, factoryArtifact.bytecode, deployer);
                    gasConfig = getGasConfig(chainId);
                    console.log("\u26FD Using gas config: limit=".concat(gasConfig.gasLimit).concat(gasConfig.gasPrice ? ", price=".concat(gasConfig.gasPrice) : ''));
                    deployOptions = {
                        gasLimit: gasConfig.gasLimit,
                    };
                    if (gasConfig.gasPrice) {
                        deployOptions.gasPrice = gasConfig.gasPrice;
                    }
                    console.log('🚀 Deploying with manual gas settings...');
                    _b.label = 1;
                case 1:
                    _b.trys.push([1, 4, , 8]);
                    return [4 /*yield*/, AjnaKeeperTakerFactory.deploy(ajnaPoolFactory, deployOptions)];
                case 2:
                    factory = _b.sent();
                    console.log('✅ Factory deployment tx:', factory.deployTransaction.hash);
                    console.log('⏳ Waiting for deployment confirmation...');
                    return [4 /*yield*/, factory.deployed()];
                case 3:
                    _b.sent();
                    console.log('🎉 AjnaKeeperTakerFactory deployed to:', factory.address);
                    return [2 /*return*/, factory.address];
                case 4:
                    error_1 = _b.sent();
                    console.log('❌ Factory deployment failed with manual gas settings');
                    if (!((_a = error_1.message) === null || _a === void 0 ? void 0 : _a.includes('gas'))) return [3 /*break*/, 7];
                    console.log('🔄 Retrying with higher gas limit...');
                    higherGasLimit = (parseInt(gasConfig.gasLimit) * 1.5).toString();
                    retryOptions = __assign(__assign({}, deployOptions), { gasLimit: higherGasLimit });
                    console.log("\u26FD Retry gas limit: ".concat(higherGasLimit));
                    return [4 /*yield*/, AjnaKeeperTakerFactory.deploy(ajnaPoolFactory, retryOptions)];
                case 5:
                    factory = _b.sent();
                    console.log('✅ Factory deployment tx (retry):', factory.deployTransaction.hash);
                    return [4 /*yield*/, factory.deployed()];
                case 6:
                    _b.sent();
                    console.log('🎉 AjnaKeeperTakerFactory deployed to:', factory.address);
                    return [2 /*return*/, factory.address];
                case 7: throw error_1;
                case 8: return [2 /*return*/];
            }
        });
    });
}
function deployUniswapTaker(deployer, ajnaPoolFactory, factoryAddress, chainId) {
    return __awaiter(this, void 0, void 0, function () {
        var takerArtifact, UniswapV3KeeperTaker, gasConfig, deployOptions, taker;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('\n📦 Step 2: Deploying UniswapV3KeeperTaker...');
                    takerArtifact = require(path.join(__dirname, '..', 'artifacts', 'contracts', 'takers', 'UniswapV3KeeperTaker.sol', 'UniswapV3KeeperTaker.json'));
                    UniswapV3KeeperTaker = new ethers_1.ethers.ContractFactory(takerArtifact.abi, takerArtifact.bytecode, deployer);
                    gasConfig = getGasConfig(chainId);
                    deployOptions = {
                        gasLimit: gasConfig.gasLimit,
                    };
                    if (gasConfig.gasPrice) {
                        deployOptions.gasPrice = gasConfig.gasPrice;
                    }
                    return [4 /*yield*/, UniswapV3KeeperTaker.deploy(ajnaPoolFactory, // Ajna pool factory
                        factoryAddress, // Authorized factory (CRITICAL FIX)
                        deployOptions)];
                case 1:
                    taker = _a.sent();
                    console.log('✅ UniswapV3 taker deployment tx:', taker.deployTransaction.hash);
                    return [4 /*yield*/, taker.deployed()];
                case 2:
                    _a.sent();
                    console.log('🎉 UniswapV3KeeperTaker deployed to:', taker.address);
                    return [2 /*return*/, taker.address];
            }
        });
    });
}
function deploySushiSwapTaker(deployer, ajnaPoolFactory, factoryAddress, chainId) {
    return __awaiter(this, void 0, void 0, function () {
        var takerArtifactPath, takerArtifact, SushiSwapKeeperTaker, gasConfig, deployOptions, taker;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('\n📦 Step 2b: Deploying SushiSwapKeeperTaker...');
                    takerArtifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'takers', 'SushiSwapKeeperTaker.sol', 'SushiSwapKeeperTaker.json');
                    takerArtifact = require(takerArtifactPath);
                    SushiSwapKeeperTaker = new ethers_1.ethers.ContractFactory(takerArtifact.abi, takerArtifact.bytecode, deployer);
                    gasConfig = getGasConfig(chainId);
                    deployOptions = {
                        gasLimit: gasConfig.gasLimit,
                    };
                    if (gasConfig.gasPrice) {
                        deployOptions.gasPrice = gasConfig.gasPrice;
                    }
                    return [4 /*yield*/, SushiSwapKeeperTaker.deploy(ajnaPoolFactory, // Ajna pool factory
                        factoryAddress, // Authorized factory
                        deployOptions)];
                case 1:
                    taker = _a.sent();
                    console.log('✅ SushiSwap taker deployment tx:', taker.deployTransaction.hash);
                    return [4 /*yield*/, taker.deployed()];
                case 2:
                    _a.sent();
                    console.log('🎉 SushiSwapKeeperTaker deployed to:', taker.address);
                    return [2 /*return*/, taker.address];
            }
        });
    });
}
function deployUniswapV4KeeperTaker(deployer, poolManagerAddress, authorizedFactoryAddress, chainId) {
    return __awaiter(this, void 0, void 0, function () {
        var artifactPath, art, Factory, gasConfig, deployOptions, taker;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('\n📦 Deploying UniswapV4KeeperTaker…');
                    artifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'takers', 'UniswapV4KeeperTaker.sol', 'UniswapV4KeeperTaker.json');
                    art = require(artifactPath);
                    Factory = new ethers_1.ethers.ContractFactory(art.abi, art.bytecode, deployer);
                    gasConfig = getGasConfig(chainId);
                    deployOptions = { gasLimit: gasConfig.gasLimit };
                    if (gasConfig.gasPrice)
                        deployOptions.gasPrice = gasConfig.gasPrice;
                    // UniswapV4KeeperTaker constructor takes 2 arguments:
                    // constructor(address _poolManager, address _authorizedFactory)
                    // Owner is set to msg.sender (deployer) in constructor
                    console.log('  constructor args:');
                    console.log('   - poolManager       :', poolManagerAddress);
                    console.log('   - authorizedFactory :', authorizedFactoryAddress);
                    return [4 /*yield*/, Factory.deploy(poolManagerAddress, // First arg: _poolManager (V4 PoolManager)
                        authorizedFactoryAddress, // Second arg: _authorizedFactory (factory that can call takeWithAtomicSwap)
                        deployOptions // overrides (last)
                        )];
                case 1:
                    taker = _a.sent();
                    console.log('  tx:', taker.deployTransaction.hash);
                    return [4 /*yield*/, taker.deployed()];
                case 2:
                    _a.sent();
                    console.log('  ✅ UniswapV4KeeperTaker at', taker.address);
                    return [2 /*return*/, taker.address];
            }
        });
    });
}
function deployCurveKeeperTaker(deployer, ajnaPoolFactory, factoryAddress, chainId) {
    return __awaiter(this, void 0, void 0, function () {
        var takerArtifactPath, takerArtifact, CurveKeeperTaker, gasConfig, deployOptions, taker;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('\n📦 Step 2c: Deploying CurveKeeperTaker...');
                    takerArtifactPath = path.join(__dirname, '..', 'artifacts', 'contracts', 'takers', 'CurveKeeperTaker.sol', 'CurveKeeperTaker.json');
                    takerArtifact = require(takerArtifactPath);
                    CurveKeeperTaker = new ethers_1.ethers.ContractFactory(takerArtifact.abi, takerArtifact.bytecode, deployer);
                    gasConfig = getGasConfig(chainId);
                    deployOptions = {
                        gasLimit: gasConfig.gasLimit,
                    };
                    if (gasConfig.gasPrice) {
                        deployOptions.gasPrice = gasConfig.gasPrice;
                    }
                    return [4 /*yield*/, CurveKeeperTaker.deploy(ajnaPoolFactory, // Ajna pool factory
                        factoryAddress, // Authorized factory
                        deployOptions)];
                case 1:
                    taker = _a.sent();
                    console.log('✅ Curve taker deployment tx:', taker.deployTransaction.hash);
                    return [4 /*yield*/, taker.deployed()];
                case 2:
                    _a.sent();
                    console.log('🎉 CurveKeeperTaker deployed to:', taker.address);
                    return [2 /*return*/, taker.address];
            }
        });
    });
}
function configureFactory(deployer, factoryAddress, addresses, chainId // ✅ ADD chainId parameter
) {
    return __awaiter(this, void 0, void 0, function () {
        var factoryArtifact, factory, gasConfig, txOptions, setUniTakerTx, setSushiTakerTx, tx, setCurveTakerTx;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('\n⚙️  Step 3: Configuring factory with takers...');
                    factoryArtifact = require(path.join(__dirname, '..', 'artifacts', 'contracts', 'factories', 'AjnaKeeperTakerFactory.sol', 'AjnaKeeperTakerFactory.json'));
                    factory = new ethers_1.ethers.Contract(factoryAddress, factoryArtifact.abi, deployer);
                    gasConfig = getGasConfig(chainId);
                    txOptions = {
                        gasLimit: 200000,
                        gasPrice: gasConfig.gasPrice || undefined
                    };
                    console.log("\u26FD Using gas config for setTaker: limit=200000".concat(gasConfig.gasPrice ? ", price=".concat(gasConfig.gasPrice) : ''));
                    if (!addresses.uniswapTaker) return [3 /*break*/, 3];
                    return [4 /*yield*/, factory.setTaker(2, addresses.uniswapTaker, txOptions)];
                case 1:
                    setUniTakerTx = _a.sent();
                    console.log('✅ UniswapV3 configuration tx:', setUniTakerTx.hash);
                    return [4 /*yield*/, setUniTakerTx.wait()];
                case 2:
                    _a.sent();
                    console.log('🎉 Factory configured with UniswapV3 taker');
                    _a.label = 3;
                case 3:
                    if (!addresses.sushiTaker) return [3 /*break*/, 6];
                    return [4 /*yield*/, factory.setTaker(3, addresses.sushiTaker, txOptions)];
                case 4:
                    setSushiTakerTx = _a.sent();
                    console.log('✅ SushiSwap configuration tx:', setSushiTakerTx.hash);
                    return [4 /*yield*/, setSushiTakerTx.wait()];
                case 5:
                    _a.sent();
                    console.log('🎉 Factory configured with SushiSwap taker');
                    _a.label = 6;
                case 6:
                    if (!addresses.uniswapV4) return [3 /*break*/, 9];
                    return [4 /*yield*/, factory.setTaker(5, addresses.uniswapV4, txOptions)];
                case 7:
                    tx = _a.sent();
                    console.log('  setTaker(UNISWAPV4):', tx.hash);
                    return [4 /*yield*/, tx.wait()];
                case 8:
                    _a.sent();
                    console.log('  ✅ Factory wired to UniswapV4 taker');
                    _a.label = 9;
                case 9:
                    if (!addresses.curveTaker) return [3 /*break*/, 12];
                    return [4 /*yield*/, factory.setTaker(4, addresses.curveTaker, txOptions)];
                case 10:
                    setCurveTakerTx = _a.sent();
                    console.log('✅ Curve configuration tx:', setCurveTakerTx.hash);
                    return [4 /*yield*/, setCurveTakerTx.wait()];
                case 11:
                    _a.sent();
                    console.log('🎉 Factory configured with Curve taker');
                    _a.label = 12;
                case 12: return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 1000); })];
                case 13:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    });
}
function verifyDeployment(deployer, addresses) {
    return __awaiter(this, void 0, void 0, function () {
        var factoryArtifact, factory, hasUniswapTaker, registeredTaker, factoryOwner, takerArtifact, taker, takerOwner, authorizedFactory;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('\n🔍 Step 4: Verifying deployment...');
                    if (!addresses.factory) {
                        throw new Error('Factory address is missing from deployment');
                    }
                    factoryArtifact = require(path.join(__dirname, '..', 'artifacts', 'contracts', 'factories', 'AjnaKeeperTakerFactory.sol', 'AjnaKeeperTakerFactory.json'));
                    factory = new ethers_1.ethers.Contract(addresses.factory, factoryArtifact.abi, deployer);
                    return [4 /*yield*/, factory.hasConfiguredTaker(2)];
                case 1:
                    hasUniswapTaker = _a.sent();
                    return [4 /*yield*/, factory.takerContracts(2)];
                case 2:
                    registeredTaker = _a.sent();
                    return [4 /*yield*/, factory.owner()];
                case 3:
                    factoryOwner = _a.sent();
                    console.log('📋 Verification Results:');
                    console.log("- Factory Owner: ".concat(factoryOwner));
                    console.log("- Expected Owner: ".concat(deployer.address));
                    console.log("- UniswapV3 Configured: ".concat(hasUniswapTaker));
                    console.log("- Registered Taker: ".concat(registeredTaker));
                    console.log("- Expected Taker: ".concat(addresses.uniswapTaker));
                    if (!addresses.uniswapTaker) return [3 /*break*/, 6];
                    takerArtifact = require(path.join(__dirname, '..', 'artifacts', 'contracts', 'takers', 'UniswapV3KeeperTaker.sol', 'UniswapV3KeeperTaker.json'));
                    taker = new ethers_1.ethers.Contract(addresses.uniswapTaker, takerArtifact.abi, deployer);
                    return [4 /*yield*/, taker.owner()];
                case 4:
                    takerOwner = _a.sent();
                    return [4 /*yield*/, taker.authorizedFactory()];
                case 5:
                    authorizedFactory = _a.sent();
                    console.log("- Taker Owner: ".concat(takerOwner));
                    console.log("- Authorized Factory: ".concat(authorizedFactory));
                    console.log("- Expected Factory: ".concat(addresses.factory));
                    // Validation checks
                    if (!hasUniswapTaker || registeredTaker !== addresses.uniswapTaker) {
                        throw new Error('❌ Factory configuration verification failed');
                    }
                    if (authorizedFactory !== addresses.factory) {
                        throw new Error('❌ Taker authorization verification failed');
                    }
                    if (takerOwner !== deployer.address || factoryOwner !== deployer.address) {
                        throw new Error('❌ Owner verification failed');
                    }
                    _a.label = 6;
                case 6:
                    console.log('✅ All verification checks passed');
                    return [2 /*return*/];
            }
        });
    });
}
function generateConfigUpdate(addresses, configPath, chainName) {
    console.log('\n🎉 DEPLOYMENT COMPLETE!');
    console.log('\n📝 Update your configuration file:');
    console.log("\uD83D\uDCC1 File: ".concat(configPath));
    console.log('\n```typescript');
    console.log('// ADD/UPDATE these lines in your config:');
    if (addresses.factory) {
        console.log("keeperTakerFactory: '".concat(addresses.factory, "',"));
    }
    if (addresses.uniswapTaker || addresses.sushiTaker || addresses.curveTaker || addresses.uniswapV4) {
        console.log('takerContracts: {');
        if (addresses.uniswapTaker) {
            console.log("  'UniswapV3': '".concat(addresses.uniswapTaker, "',"));
        }
        if (addresses.sushiTaker) {
            console.log("  'SushiSwap': '".concat(addresses.sushiTaker, "'"));
        }
        if (addresses.curveTaker) {
            console.log("  'Curve': '".concat(addresses.curveTaker, "',"));
        }
        if (addresses.uniswapV4) {
            console.log("  'UniswapV4': '".concat(addresses.uniswapV4, "',"));
        }
        console.log('},');
    }
    console.log('```');
    console.log('\n📋 Deployed Contract Addresses:');
    if (addresses.factory) {
        console.log("\uD83C\uDFED AjnaKeeperTakerFactory: ".concat(addresses.factory));
    }
    if (addresses.uniswapTaker) {
        console.log("\uD83E\uDD84 UniswapV3KeeperTaker: ".concat(addresses.uniswapTaker));
    }
    if (addresses.sushiTaker) {
        console.log("\uD83C\uDF63 SushiSwapKeeperTaker: ".concat(addresses.sushiTaker));
    }
    if (addresses.uniswapV4) {
        console.log("\uD83E\uDD84 UniswapV4KeeperTaker: ".concat(addresses.uniswapV4));
    }
    console.log('\n🚀 Next Steps:');
    console.log('1. Update your config file with the addresses above');
    console.log('2. Test with: yarn start --config your-config-file.ts');
    console.log('3. Expected result: "Type: factory, Valid: true"');
    console.log("4. Factory system ready for ".concat(chainName, "! \uD83C\uDF8A"));
}
function main() {
    var _a, _b, _c, _d, _e, _f;
    return __awaiter(this, void 0, void 0, function () {
        var args, configPath, config, chainInfo, keystoreJson, pswd, wallet, provider, deployer, balance, minRequiredBalance, networkCheck, addresses, _g, _h, _j, _k, error_2;
        return __generator(this, function (_l) {
            switch (_l.label) {
                case 0:
                    args = process.argv.slice(2);
                    if (args.length !== 1) {
                        console.error('Usage: npx ts-node scripts/deploy-factory-system.ts <config-file-path>');
                        console.error('Example: npx ts-node scripts/deploy-factory-system.ts hemi-conf-settlement.ts');
                        console.error('\n Prerequisites:');
                        console.error('1. Compile contracts: yarn compile');
                        console.error('2. Have your keystore.json file ready');
                        console.error('3. Ensure sufficient ETH balance (recommended: >0.01 ETH)');
                        process.exit(1);
                    }
                    configPath = args[0];
                    _l.label = 1;
                case 1:
                    _l.trys.push([1, 23, , 24]);
                    console.log('🚀 Universal Factory System Deployment');
                    console.log('=====================================');
                    // Step 1: Load and validate configuration
                    console.log("\uD83D\uDCD6 Loading configuration from: ".concat(configPath));
                    return [4 /*yield*/, (0, config_types_1.readConfigFile)(configPath)];
                case 2:
                    config = _l.sent();
                    return [4 /*yield*/, validateConfig(config)];
                case 3:
                    _l.sent();
                    return [4 /*yield*/, detectChainInfo(config)];
                case 4:
                    chainInfo = _l.sent();
                    console.log("\uD83C\uDF10 Target Network: ".concat(chainInfo.name, " (Chain ID: ").concat(chainInfo.chainId, ")"));
                    // Step 3: Load wallet from keystore
                    console.log('\n🔐 Loading wallet from keystore...');
                    keystoreJson = (0, fs_1.readFileSync)(config.keeperKeystore, 'utf8');
                    return [4 /*yield*/, getKeystorePassword()];
                case 5:
                    pswd = _l.sent();
                    return [4 /*yield*/, ethers_1.ethers.Wallet.fromEncryptedJson(keystoreJson, pswd)];
                case 6:
                    wallet = _l.sent();
                    console.log('👤 Loaded wallet:', wallet.address);
                    provider = new ethers_1.ethers.providers.JsonRpcProvider(config.ethRpcUrl);
                    deployer = wallet.connect(provider);
                    return [4 /*yield*/, deployer.getBalance()];
                case 7:
                    balance = _l.sent();
                    console.log('💰 Account balance:', ethers_1.ethers.utils.formatEther(balance), 'ETH');
                    minRequiredBalance = ethers_1.ethers.utils.parseEther('0.0005');
                    if (balance.lt(minRequiredBalance)) {
                        console.warn('⚠️  WARNING: Low balance detected!');
                        console.warn('💡 You may need more ETH for deployment');
                    }
                    else {
                        console.log('✅ Balance sufficient for Hemi deployment');
                    }
                    return [4 /*yield*/, provider.getNetwork()];
                case 8:
                    networkCheck = _l.sent();
                    if (networkCheck.chainId !== chainInfo.chainId) {
                        throw new Error("Network mismatch! Config suggests ".concat(chainInfo.chainId, ", connected to ").concat(networkCheck.chainId));
                    }
                    console.log('\n📋 Deployment Configuration:');
                    console.log("- Network: ".concat(chainInfo.name, " (").concat(chainInfo.chainId, ")"));
                    console.log("- Ajna Pool Factory: ".concat(config.ajna.erc20PoolFactory));
                    console.log("- Deployer: ".concat(deployer.address));
                    addresses = {};
                    // Deploy factory FIRST
                    _g = addresses;
                    return [4 /*yield*/, deployFactory(deployer, config.ajna.erc20PoolFactory, chainInfo.chainId)];
                case 9:
                    // Deploy factory FIRST
                    _g.factory = _l.sent();
                    // ADD DELAY AFTER FACTORY DEPLOYMENT
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 2000); })];
                case 10:
                    // ADD DELAY AFTER FACTORY DEPLOYMENT
                    _l.sent(); // 2 second delay
                    if (!config.universalRouterOverrides) return [3 /*break*/, 13];
                    _h = addresses;
                    return [4 /*yield*/, deployUniswapTaker(deployer, config.ajna.erc20PoolFactory, addresses.factory, // Pass factory address for authorization
                        chainInfo.chainId)];
                case 11:
                    _h.uniswapTaker = _l.sent();
                    // ADD DELAY AFTER UNISWAP DEPLOYMENT
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 2000); })];
                case 12:
                    // ADD DELAY AFTER UNISWAP DEPLOYMENT
                    _l.sent(); // 2 second delay
                    _l.label = 13;
                case 13:
                    if (!config.sushiswapRouterOverrides) return [3 /*break*/, 16];
                    _j = addresses;
                    return [4 /*yield*/, deploySushiSwapTaker(deployer, config.ajna.erc20PoolFactory, addresses.factory, chainInfo.chainId)];
                case 14:
                    _j.sushiTaker = _l.sent();
                    // ADD DELAY AFTER UNISWAP DEPLOYMENT
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 2000); })];
                case 15:
                    // ADD DELAY AFTER UNISWAP DEPLOYMENT
                    _l.sent(); // 2 second delay
                    _l.label = 16;
                case 16:
                    if (!config.uniswapV4RouterOverrides) return [3 /*break*/, 19];
                    // ✅ Validate poolManager exists
                    if (!config.uniswapV4RouterOverrides.poolManager) {
                        throw new Error('Missing uniswapV4RouterOverrides.poolManager address');
                    }
                    if (!addresses.factory) {
                        throw new Error('Factory must be deployed before UniswapV4KeeperTaker');
                    }
                    _k = addresses;
                    return [4 /*yield*/, deployUniswapV4KeeperTaker(deployer, config.uniswapV4RouterOverrides.poolManager, addresses.factory, // Pass factory address for authorization
                        chainInfo.chainId)];
                case 17:
                    _k.uniswapV4 = _l.sent();
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 2000); })];
                case 18:
                    _l.sent();
                    _l.label = 19;
                case 19:
                    // Deploy curve taker if configured
                    // if (config.curveRouterOverrides) {
                    //   addresses.curveTaker = await deployCurveKeeperTaker(
                    //   deployer,
                    //   config.ajna.erc20PoolFactory,
                    //   addresses.factory,
                    //   chainInfo.chainId
                    //   );
                    // // ADD DELAY AFTER CURVE DEPLOYMENT
                    // await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
                    // }
                    // ADD DELAY BEFORE CONFIGURATION
                    console.log('\n⏳ Waiting before configuration...');
                    return [4 /*yield*/, new Promise(function (resolve) { return setTimeout(resolve, 3000); })];
                case 20:
                    _l.sent(); // 3 second delay
                    // Step 7: Configure factory
                    if (!addresses.factory) {
                        throw new Error('Missing factory address for configuration');
                    }
                    return [4 /*yield*/, configureFactory(deployer, addresses.factory, addresses, chainInfo.chainId)];
                case 21:
                    _l.sent(); // ✅ ADD chainInfo.chainId
                    // Step 8: Verify everything works
                    return [4 /*yield*/, verifyDeployment(deployer, addresses)];
                case 22:
                    // Step 8: Verify everything works
                    _l.sent();
                    // Step 9: Generate configuration update instructions
                    generateConfigUpdate(addresses, configPath, chainInfo.name);
                    return [3 /*break*/, 24];
                case 23:
                    error_2 = _l.sent();
                    console.error('\n💥 Deployment failed:', error_2.message);
                    // Provide helpful troubleshooting tips
                    if ((_a = error_2.message) === null || _a === void 0 ? void 0 : _a.includes('insufficient funds')) {
                        console.log('\n💡 Tip: Add more ETH to your wallet for deployment');
                        console.log('💰 Recommended: 0.01+ ETH for large contract deployments');
                    }
                    else if ((_b = error_2.message) === null || _b === void 0 ? void 0 : _b.includes('nonce')) {
                        console.log('\n💡 Tip: Try again - might be a nonce issue');
                        console.log('🔄 Or wait a few seconds and retry');
                    }
                    else if ((_c = error_2.message) === null || _c === void 0 ? void 0 : _c.includes('gas')) {
                        console.log('\n💡 Tip: Gas issues detected');
                        console.log('⛽ The script now uses manual gas limits');
                        console.log('💰 You may need more ETH for the deployment');
                        console.log('🔄 Try adding more ETH and retrying');
                    }
                    else if ((_d = error_2.message) === null || _d === void 0 ? void 0 : _d.includes('Contract artifacts not found')) {
                        console.log('\n💡 Tip: Compile contracts first: yarn compile');
                    }
                    else if ((_e = error_2.message) === null || _e === void 0 ? void 0 : _e.includes('Cannot find module')) {
                        console.log('\n💡 Tip: Make sure contracts are compiled: yarn compile');
                    }
                    else if ((_f = error_2.message) === null || _f === void 0 ? void 0 : _f.includes('incorrect password')) {
                        console.log('\n💡 Tip: Check your keystore password and try again');
                    }
                    process.exit(1);
                    return [3 /*break*/, 24];
                case 24: return [2 /*return*/];
            }
        });
    });
}
// Handle script execution
if (require.main === module) {
    main()
        .then(function () { return process.exit(0); })
        .catch(function (error) {
        console.error('Unhandled error:', error);
        process.exit(1);
    });
}
exports.default = main;
//# sourceMappingURL=deploy-factory-system.js.map