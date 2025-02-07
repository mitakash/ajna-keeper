import { FungiblePool } from '@ajna-finance/sdk';
import { expect } from 'chai';
import { BigNumber, providers } from 'ethers';
import sinon from 'sinon';
import { KeeperConfig } from '../config';
import {
  getProviderAndSigner,
  overrideMulticall,
  decimaledToWei,
  weiToDecimaled,
} from '../utils';

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

describe('getProviderAndSigner', () => {
  const mockKeystorePath = 'mock/path/keystore.json';
  const mockRpcUrl = 'https://mock-rpc-url';
  let mockProvider;
  let addAccountStub;

  beforeEach(() => {
    mockProvider = sinon.createStubInstance(providers.JsonRpcProvider);
    sinon.stub(providers, 'JsonRpcProvider').returns(mockProvider);
    addAccountStub = sinon.stub().resolves({
      address: mockAddress,
      signMessage: sinon.stub().resolves('mock-signature'),
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should return a provider and a signer', async () => {
    const { provider, signer } = await getProviderAndSigner(
      mockKeystorePath,
      mockRpcUrl
    );

    expect(provider).to.be.instanceOf(providers.JsonRpcProvider);
    expect(signer).to.have.property('address').that.is.a('string');
    expect(signer).to.have.property('signMessage').that.is.a('function');
  });
});
