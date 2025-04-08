/** @type import('hardhat/config').HardhatUserConfig */
require('dotenv').config();
import "@nomicfoundation/hardhat-verify";
import { ethers } from "ethers";

module.exports = {
  solidity: '0.8.28',
  paths: {
    tests: './src/integration-tests',
  },
  networks: {
    hardhat: {
      chainId: 1,
      forking: {
        url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
        blockNumber: 21731352,
      },
    },
    avalanche: {
      chainId: 43114,
      url: 'https://api.avax.network/ext/bc/C/rpc',
    },
    base: {
      chainId: 8453,
      url: `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    }
  },
  etherscan: {
    apiKey: {
      base: process.env.ETHERSCAN_API_KEY_BASE,
    }
  },
};
