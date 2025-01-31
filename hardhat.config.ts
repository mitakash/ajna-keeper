/** @type import('hardhat/config').HardhatUserConfig */
require('dotenv').config()

module.exports = {
  solidity: '0.8.28',
  paths: {
    tests: './src/test'
  },
  networks: {
    hardhat: {
      forking: {
        url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
        blockNumber: 21731352
      },
    }
  }
};
