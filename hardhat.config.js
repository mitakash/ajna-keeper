"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var dotenv_1 = __importDefault(require("dotenv"));
require("@typechain/hardhat");
require("@nomiclabs/hardhat-ethers");
require("@nomicfoundation/hardhat-verify");
dotenv_1.default.config();
var config = {
    //solidity: '0.8.28',
    solidity: {
        version: '0.8.28',
        settings: {
            optimizer: {
                enabled: true,
                runs: 200
            },
            viaIR: true,
            metadata: {
                bytecodeHash: "none" // Helps with verification
            },
        },
    },
    paths: {
        tests: './src/integration-tests',
    },
    networks: {
        hardhat: {
            chainId: 31337,
            forking: {
                url: "https://eth-mainnet.g.alchemy.com/v2/".concat(process.env.ALCHEMY_API_KEY),
                blockNumber: 21731352,
            },
        },
        avalanche: {
            chainId: 43114,
            url: "https://avax-mainnet.g.alchemy.com/v2/".concat(process.env.ALCHEMY_API_KEY),
        },
        base: {
            chainId: 8453,
            url: 'https://base-mainnet.g.alchemy.com/v2/BGrpE_7pmP_VQwKMWN6hz',
            accounts: {
                mnemonic: process.env.MNEMONIC || "your mnemonic here",
            },
        },
        hemi: {
            url: "https://boldest-soft-moon.hemi-mainnet.quiknode.pro/${process.env.QUICKNODE_API_KEY}",
            chainId: 43111,
            accounts: {
                mnemonic: process.env.MNEMONIC || "your mnemonic here",
                // Or use your keystore approach - whatever you prefer
            },
            gasPrice: 1000000000,
            gas: 8000000, // 8M gas limit
        },
    },
    sourcify: { enabled: true },
    //etherscan: { apiKey: process.env.ETHERSCAN_API_KEY },
    etherscan: {
        apiKey: {
            avalanche: "verifyContract",
            snowtrace: "verifyContract" // Alternative name
        },
        customChains: [
            {
                network: "avalanche",
                chainId: 43114,
                urls: {
                    apiURL: "https://api.routescan.io/v2/network/mainnet/evm/43114/etherscan/api",
                    browserURL: "https://snowtrace.io"
                }
            }
        ]
    }
};
exports.default = config;
//# sourceMappingURL=hardhat.config.js.map