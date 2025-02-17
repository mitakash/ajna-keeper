import { expect } from 'chai';
import { getProvider, resetHardhat } from './test-utils';
import { BigNumber } from 'ethers';
import { decimaledToWei, weiToDecimaled } from '../utils';
import 'dotenv';
import { JsonRpcProvider } from '../provider';

describe.only('JsonRpcProvider', () => {
  beforeEach(async () => {
    await resetHardhat();
  });

  it('Uses EIP-1559 fee structure', async () => {
    const provider = getProvider();
    const feeData = await provider.getFeeData();

    expect(
      feeData.gasPrice?.lte(decimaledToWei(1e-8)),
      `gasPrice should be below 10Gwei`
    ).to.be.true;
    expect(
      feeData.maxFeePerGas?.lte(decimaledToWei(5e-8)),
      `maxFeePerGas should be below 50Gwei`
    ).to.be.true;
    expect(
      feeData.maxPriorityFeePerGas?.lte(decimaledToWei(1e-9)),
      `maxPriorityFeePerGas should be below 1Gwei`
    ).to.be.true;
    expect(
      feeData.lastBaseFeePerGas?.lte(decimaledToWei(1e-8)),
      `lastBaseFeePerGas should be below 10Gwei`
    ).to.be.true;
  });

  it('Uses EIP-1559 fee structure for L2 on Alchemy', async () => {
    expect(
      !!process.env.ALCHEMY_API_KEY,
      'Put your ALCHEMY_API_KEY in your .env file'
    ).to.be.true;

    const provider = new JsonRpcProvider(
      `https://base-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
    );
    const feeData = await provider.getFeeData();

    expect(
      feeData.gasPrice?.lt(decimaledToWei(1e-9)),
      'gasPrice should be below 1Gwei'
    ).to.be.true;
    expect(
      feeData.maxFeePerGas?.lt(decimaledToWei(1e-9)),
      'maxFeePerGas should be below 1Gwei'
    ).to.be.true;
    expect(
      feeData.maxPriorityFeePerGas?.lt(decimaledToWei(1e-9)),
      'maxPriorityFeePerGas should be below 1Gwei'
    ).to.be.true;
    expect(
      feeData.lastBaseFeePerGas?.lt(decimaledToWei(1e-9)),
      'lastBaseFeePerGas should be below 1Gwei'
    ).to.be.true;
  });
});
