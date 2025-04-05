#!/usr/bin/env ts-node

import yargs from 'yargs/yargs';
import { AjnaSDK, FungiblePool } from '@ajna-finance/sdk';
import { ethers } from 'ethers';

import { configureAjna, readConfigFile } from "../src/config-types";
import { approveErc20, getAllowanceOfErc20 } from '../src/erc20';
import { DexRouter } from '../src/dex-router';
import { getProviderAndSigner } from '../src/utils';
import { decodeSwapCalldata } from '../src/1inch';

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
    },
    action: {
      type: 'string',
      demandOption: true,
      describe: 'Action to perform',
      choices: ['approve', 'quote', 'getSwapData'],
      // TODO: add choice to actually invoke the test function on the keeper contract using swap data
    },
    amount: {
      type: 'number',
      demandOption: true,
      describe: 'Amount to swap or set allowance',
    }
  })
  .parseSync();

async function main() {
  const config = await readConfigFile(argv.config);
  const { provider, signer } = await getProviderAndSigner(
    config.keeperKeystore,
    config.ethRpcUrl
  );
  const chainId = await signer.getChainId()

  const poolConfig = config.pools.find(pool => pool.name === argv.poolName);
  if (!poolConfig) throw new Error(`Pool with name ${argv.poolName} not found in config`);
  configureAjna(config.ajna);
  const ajna = new AjnaSDK(provider);
  const pool: FungiblePool = await ajna.fungiblePoolFactory.getPoolByAddress(poolConfig.address);

  console.log('Found pool on chain', chainId, 'quoting', pool.collateralAddress, 'in', pool.quoteAddress)
  const dexRouter = new DexRouter(signer, {
    oneInchRouters: config?.oneInchRouters ?? {},
    connectorTokens: config?.connectorTokens ?? [],
  });

  const amount = ethers.utils.parseEther(argv.amount.toString());

  if (argv.action === 'approve') {
    // 1inch API will error out if approvals not run before calling API
    const oneInchRouter: string = dexRouter.getRouter(chainId)!!
    const currentAllowance = await getAllowanceOfErc20(
      signer,
      pool.collateralAddress,
      oneInchRouter,
    );
    console.log(`Current allowance: ${currentAllowance.toString()}, Amount: ${amount.toString()}`);
    if (currentAllowance.lt(amount)) {
      try {
        console.log(`Approving 1inch router ${oneInchRouter} for token: ${pool.collateralAddress}`);
        await approveErc20(signer, pool.collateralAddress, oneInchRouter, amount);
        console.log(`Approval successful for token ${pool.collateralAddress}`);
      } catch (error) {
        console.error(`Failed to approve token ${pool.collateralAddress} for 1inch: ${error}`);
        return { success: false, error: `Approval failed: ${error}` };
      }
    }
  }

  else if (argv.action === 'quote') {
    const quote = await dexRouter.getQuoteFromOneInch(
      chainId,
      amount,
      pool.collateralAddress,
      pool.quoteAddress,
    );
    console.log('Quote:', quote);

  } else if (argv.action === 'getSwapData') {
    const swapData = await dexRouter.getSwapDataFromOneInch(
      chainId,
      amount,
      pool.collateralAddress,
      pool.quoteAddress,
      1,
      signer.address,
      true,
    );
    console.log('Decoded swap data: ', decodeSwapCalldata(swapData.data));

  } else {
    throw new Error(`Unknown action: ${argv.action}`);
  }
}

main();
