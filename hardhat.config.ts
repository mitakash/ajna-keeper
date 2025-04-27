import dotenv from 'dotenv';
import { HardhatUserConfig } from "hardhat/config";
import '@typechain/hardhat'
import '@nomicfoundation/hardhat-ethers'
import "@nomicfoundation/hardhat-verify";

dotenv.config();

const config: HardhatUserConfig = {
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
      url: `https://avax-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    },
    base: {
      chainId: 8453,
      url: `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
    }
  },
  sourcify: { enabled: true },
  etherscan: { apiKey: process.env.ETHERSCAN_API_KEY },
};

export default config;
