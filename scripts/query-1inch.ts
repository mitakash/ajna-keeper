#!/usr/bin/env ts-node

import yargs from 'yargs/yargs';

import { configureAjna, readConfigFile } from "../src/config-types";
import { AjnaSDK, FungiblePool } from '@ajna-finance/sdk';
import { JsonRpcProvider } from '../src/provider';

const argv = yargs(process.argv.slice(2))
  .options({
    config: {
      type: 'string',
      demandOption: true,
      describe: 'Path to the config file',
    },
    poolName: {
      type: 'string',
      demandOption: true,
      describe: 'Name of the pool identifying tokens to query',
    }
    // TODO: add option to either get a quote or request swap calldata
  })
  .parseSync();

async function main() {
  const config = await readConfigFile(argv.config);
  const provider = new JsonRpcProvider(config.ethRpcUrl);

  const poolConfig = config.pools.find(pool => pool.name === argv.poolName);
  if (!poolConfig) throw new Error(`Pool with name ${argv.poolName} not found in config`);
  configureAjna(config.ajna);
  const ajna = new AjnaSDK(provider);
  const pool: FungiblePool = await ajna.fungiblePoolFactory.getPoolByAddress(poolConfig.address);

  console.log('Found pool quoting', pool.collateralAddress, 'in', pool.quoteAddress)

  // TODO: handle user request from parameters
}

main();
