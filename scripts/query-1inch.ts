#!/usr/bin/env ts-node

import yargs from 'yargs/yargs';
import { AjnaSDK, FungiblePool } from '@ajna-finance/sdk';
import { ContractFactory, ethers } from 'ethers';
import { promises as fs } from 'fs';

import { configureAjna, readConfigFile } from "../src/config-types";
import { approveErc20, getAllowanceOfErc20, transferErc20 } from '../src/erc20';
import { DexRouter } from '../src/dex-router';
import { getProviderAndSigner } from '../src/utils';
import { decodeSwapCalldata, SwapCalldata } from '../src/1inch';
import { exit } from 'process';

const PATH_TO_COMPILER_OUTPUT = 'artifacts/contracts/AjnaKeeperTaker.sol/AjnaKeeperTaker.json';

const argv = yargs(process.argv.slice(2))
  .options({
    config: {
      type: 'string',
      demandOption: true,
      describe: 'Path to the config file',
    },
    poolName: {
      type: 'string',
      describe: 'Name of the pool identifying tokens to query',
    },
    action: {
      type: 'string',
      demandOption: true,
      describe: 'Action to perform',
      choices: ['approve', 'deploy', 'quote', 'send', 'swap'],
    },
    amount: {
      type: 'number',
      describe: 'Amount to swap or set allowance',
    }
  })
  .parseSync();

async function main() {
  // validate script arguments
  if (argv.action in ['approve', 'quote', 'send', 'swap']) {
    if (!argv.poolName) throw new Error('Pool name is required for this action');
    if (!argv.amount) throw new Error('Amount is required for this action');
  }
  // read config file and unlock keystore
  const config = await readConfigFile(argv.config);
  const { provider, signer } = await getProviderAndSigner(
    config.keeperKeystore,
    config.ethRpcUrl
  );
  const chainId = await signer.getChainId()

  if (argv.action === 'deploy') {
    const compilerOutput = await fs.readFile(PATH_TO_COMPILER_OUTPUT, 'utf8');
    const keeperTakerFactory: ContractFactory = ContractFactory.fromSolidity(compilerOutput, signer);
    const keeperTaker = await keeperTakerFactory.deploy(config.ajna.erc20PoolFactory);
    await keeperTaker.deployed();
    console.log("AjnaKeeperTaker deployed to:", keeperTaker.address);
    console.log('Update config.keeperTaker with this address');

    exit(0);
  }

  // load pool from SDK
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
  const amount = ethers.utils.parseEther(argv.amount!!.toString());

  if (argv.action === 'approve' && pool && dexRouter) {
    // 1inch API will error out if approval not run before calling API
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
      }
    }

  } else if (argv.action === 'quote' && pool && dexRouter) {
    const quote = await dexRouter.getQuoteFromOneInch(
      chainId,
      amount,
      pool.collateralAddress,
      pool.quoteAddress,
    );
    console.log('Quote:', quote);

  } else if (argv.action === 'send' && pool && config.keeperTaker) {
    try {
      console.log('Sending', amount.toString(), 'to keeperTaker at', config.keeperTaker);
      await transferErc20(signer, pool.collateralAddress, config.keeperTaker, amount);
    } catch (error) {
      console.error(`Failed to send token ${pool.collateralAddress}: ${error}`);
    }

  } else if (argv.action === 'swap' && pool && dexRouter) {
    const swapData = await dexRouter.getSwapDataFromOneInch(
      chainId,
      amount,
      pool.collateralAddress,
      pool.quoteAddress,
      1,
      signer.address,
      true,
    );
    const swapCalldata: SwapCalldata = decodeSwapCalldata(swapData.data);
    console.log('Decoded swap data: ', swapCalldata);

    if (config.keeperTaker) {
      console.log('Attempting to transact with keeperTaker at', config.keeperTaker);
      const compilerOutput = await fs.readFile(PATH_TO_COMPILER_OUTPUT, 'utf8');
      const keeperTaker = new ethers.Contract(
        config.keeperTaker,
        JSON.parse(compilerOutput).abi,
        signer
      );
      const tx = await keeperTaker.testOneInchSwapWithCalldataMutation(
        pool.poolAddress,
        dexRouter.getRouter(chainId)!!,
        swapCalldata.aggregationExecutor,
        swapCalldata.swapDescription,
        swapCalldata.encodedCalls,
        amount.mul(9).div(10), // 90% of the amount
      );
      console.log('Transaction hash:', tx.hash);
      await tx.wait();
      console.log('Transaction confirmed');
    }

  } else {
    throw new Error(`Unknown action: ${argv.action}`);
  }
}

main();
