/** @type import('hardhat/config').HardhatUserConfig */
require('dotenv').config();
require('@nomiclabs/hardhat-ethers');

module.exports = {
  solidity: '0.8.28',
  paths: {
    tests: './src/integration-tests',
  },
  networks: {
    hardhat: {
      forking: {
        url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
        blockNumber: 21731352,
      },
    },
  },
};
