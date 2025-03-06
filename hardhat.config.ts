/** @type import('hardhat/config').HardhatUserConfig */
require('dotenv').config();

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
      avalanche: {
        url: "https://api.avax.network/ext/bc/C/rpc",
        chainId: 43114,
        accounts: [process.env.PRIVATE_KEY]
      }
    },
  },
};
