#!/usr/bin/env ts-node

import yargs from 'yargs/yargs';

import { readConfigFile } from './config';
import { startKeeperFromConfig } from './run';

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
  console.log('Starting keeper with...');
  console.log('  ETH_RPC_URL ', config.ethRpcUrl);
  console.log('  SUBGRAPH_URL', config.subgraphUrl);

  startKeeperFromConfig(config);
}

main();
