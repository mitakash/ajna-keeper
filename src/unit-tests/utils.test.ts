import { FungiblePool } from '@ajna-finance/sdk';
import { promises as fs } from 'fs';
import { expect } from 'chai';
import { BigNumber, providers, Wallet } from 'ethers';
import { KeeperConfig } from '../config-types';
import {
  overrideMulticall,
  decimaledToWei,
  weiToDecimaled,
  tokenChangeDecimals,
} from '../utils';
import Utils from '../utils';
import sinon from 'sinon';
import * as inquirer from "@inquirer/prompts";

const mockAddress = '0x123456abcabc123456abcabcd123456abcdabcd1';

describe('bigToWadNumber', () => {
  const convertsWeiToEth = (inStr: string, out: number) => {
    it(`converts wei:${inStr} to Eth:${out.toString()}`, () => {
      expect(weiToDecimaled(BigNumber.from(inStr))).to.equal(out);
    });
  };

  convertsWeiToEth('0', 0);
  convertsWeiToEth('10000000000000', 1e-5);
  convertsWeiToEth('11000000000000', 1.1e-5);
  convertsWeiToEth('100000000000000000', 0.1);
  convertsWeiToEth('110000000000000000', 0.11);
  convertsWeiToEth('1000000000000000000', 1);
  convertsWeiToEth('1100000000000000000', 1.1);
  convertsWeiToEth('10000000000000000000', 10);
  convertsWeiToEth('11000000000000000000', 11);
  convertsWeiToEth('100000000000000000000000', 1e5);
  convertsWeiToEth('110000000000000000000000', 1.1e5);
  convertsWeiToEth('-10000000000000', -1e-5);
  convertsWeiToEth('-11000000000000', -1.1e-5);
  convertsWeiToEth('-100000000000000000', -0.1);
  convertsWeiToEth('-110000000000000000', -0.11);
  convertsWeiToEth('-1000000000000000000', -1);
  convertsWeiToEth('-1100000000000000000', -1.1);
  convertsWeiToEth('-10000000000000000000', -10);
  convertsWeiToEth('-11000000000000000000', -11);
  convertsWeiToEth('-110000000000000000000000', -1.1e5);
  convertsWeiToEth('-111111111111100000000000', -1.111111111111e5);
});

describe('weiToDecimaled', () => {
  const convertsEthToWei = (inNumb: number, outStr: string) => {
    it(`converts Eth:${inNumb.toString()} to wei:${outStr}`, () => {
      expect(decimaledToWei(inNumb).toString()).to.equal(outStr);
    });
  };

  convertsEthToWei(0, '0');
  convertsEthToWei(1e-5, '10000000000000');
  convertsEthToWei(1.1e-5, '11000000000000');
  convertsEthToWei(0.1, '100000000000000000');
  convertsEthToWei(0.11, '110000000000000000');
  convertsEthToWei(1, '1000000000000000000');
  convertsEthToWei(1.1, '1100000000000000000');
  convertsEthToWei(10, '10000000000000000000');
  convertsEthToWei(11, '11000000000000000000');
  convertsEthToWei(1e5, '100000000000000000000000');
  convertsEthToWei(1.1e5, '110000000000000000000000');
  convertsEthToWei(-1e-5, '-10000000000000');
  convertsEthToWei(-1.1e-5, '-11000000000000');
  convertsEthToWei(-0.1, '-100000000000000000');
  convertsEthToWei(-0.11, '-110000000000000000');
  convertsEthToWei(-1, '-1000000000000000000');
  convertsEthToWei(-1.1, '-1100000000000000000');
  convertsEthToWei(-10, '-10000000000000000000');
  convertsEthToWei(-11, '-11000000000000000000');
  convertsEthToWei(-1.1e5, '-110000000000000000000000');
});

describe('overrideMulticall', () => {
  let mockFungiblePool: FungiblePool;
  let mockChainConfig: KeeperConfig;

  beforeEach(() => {
    mockFungiblePool = {
      ethcallProvider: {
        multicall3: {},
      },
    } as unknown as FungiblePool;

    mockChainConfig = {
      multicallAddress: mockAddress,
      multicallBlock: 100,
    } as KeeperConfig;
  });

  it('should override multicall3 if multicallAddress and multicallBlock are defined', () => {
    overrideMulticall(mockFungiblePool, mockChainConfig);

    expect(mockFungiblePool.ethcallProvider.multicall3).deep.equal({
      address: mockChainConfig.multicallAddress,
      block: mockChainConfig.multicallBlock,
    });
  });

  it('should not modify multicall3 if chainConfig is missing required fields', () => {
    const originalMulticall = {
      ...mockFungiblePool.ethcallProvider.multicall3,
    };
    overrideMulticall(mockFungiblePool, {} as KeeperConfig);

    expect(mockFungiblePool.ethcallProvider.multicall3).deep.equal(
      originalMulticall
    );
  });
});

describe("getProviderAndSigner", function () {
  const fakeRpcUrl = "http://localhost:8545";
  const fakeKeystorePath = "/fake/path/keystore.json";
  let addAccountStub: sinon.SinonStub;
  let fakeWallet: Wallet;

  beforeEach(async () => {
    fakeWallet = {
      address: "0x1234567890abcdef",
      provider: new providers.JsonRpcProvider(fakeRpcUrl),
      signTransaction: sinon.stub().resolves("0xSignedTransaction"),
      connect: sinon.stub().returnsThis(),
      signMessage: sinon.stub().resolves("0xSignedMessage"),
    } as unknown as Wallet;
    
    addAccountStub = sinon.stub(Utils, 'addAccountFromKeystore').callsFake(async () => {
      return fakeWallet;
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should return provider and signer", async function () {
    const result = await Utils.getProviderAndSigner(fakeKeystorePath, fakeRpcUrl);
    expect(result).to.have.property("provider");
    expect(result).to.have.property("signer");
    expect(addAccountStub.calledOnceWith(fakeKeystorePath)).to.be.true;
    expect(result.signer).to.have.property("address", fakeWallet.address);
  });
});

describe('tokenChangeDecimals', () => {
  const testConvertDecimals = (
    tokenWei: string,
    currDecimals: number,
    targetDecimals: number,
    expectedStr: string
  ) => {
    return it(`Converts ${tokenWei} with ${currDecimals} decimals to ${expectedStr} with ${targetDecimals} decimals`, () => {
      const result = tokenChangeDecimals(
        BigNumber.from(tokenWei),
        currDecimals,
        targetDecimals
      );
      expect(result.toString()).equals(expectedStr);
    });
  };

  testConvertDecimals('1000000', 6, 18, '1000000000000000000');
  testConvertDecimals('1000000000000000000', 18, 6, '1000000');
  testConvertDecimals('1000000000000000000', 18, 18, '1000000000000000000');
});
