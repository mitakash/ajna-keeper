#!/usr/bin/env ts-node

import yargs from 'yargs/yargs';

import { readConfigFile } from './config-types';
import { startKeeperFromConfig } from './run';
import { logger } from './logging';

const argv = yargs(process.argv.slice(2))
  .options({
    config: {
      type: 'string',
      demandOption: true,
      describe: 'Path to the config file',
    },
  })
  .parseSync();

async function main() {
  const config = await readConfigFile(argv.config);
  logger.info(
    `Starting keeper with...  ETH_RPC_URL: ${config.ethRpcUrl}, SUBGRAPH_URL: ${config.subgraphUrl}`
  );
  startKeeperFromConfig(config);
}

main();
