#!/usr/bin/env ts-node

/**
 * Non-interactive keeper launcher - reads KEEPER_PASSWORD from env
 * This wraps the normal startup flow but bypasses the interactive prompt.
 */

import { readConfigFile } from './src/config-types';
import { startKeeperFromConfig } from './src/run';
import { logger, setLoggerConfig } from './src/logging';
import { ethers } from 'ethers';
import * as fs from 'fs';

async function main() {
  const configPath = process.argv[2] || 'v4-config-sandbox.ts';
  const config = await readConfigFile(configPath);
  setLoggerConfig(config);

  logger.info(`Starting keeper with...  ETH_RPC_URL: ${config.ethRpcUrl}, SUBGRAPH_URL: ${config.subgraphUrl}`);

  // Read password from env instead of interactive prompt
  const password = process.env.KEEPER_PASSWORD;
  if (!password) {
    console.error('KEEPER_PASSWORD environment variable is required');
    process.exit(1);
  }

  // Override the getProviderAndSigner to use env password
  const keystoreJson = await fs.promises.readFile(config.keeperKeystore, 'utf-8');
  const wallet = await ethers.Wallet.fromEncryptedJson(keystoreJson, password);
  const provider = new ethers.providers.JsonRpcProvider(config.ethRpcUrl);
  const signer = wallet.connect(provider);

  logger.info(`Keeper wallet: ${wallet.address}`);
  logger.info(`Connected to chain, starting keeper loops...`);

  // Monkey-patch the utils module to skip the interactive prompt
  const utils = require('./src/utils');
  utils.getProviderAndSigner = async () => ({ provider, signer });

  await startKeeperFromConfig(config);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
