import { expect } from 'chai';
import { BigNumber, utils } from 'ethers';
import { ethToWei, weiToEth } from '../utils';

describe('bigToWadNumber', () => {
  const convertsWeiToEth = (inStr: string, out: number) => {
    it(`converts wei:${inStr} to Eth:${out.toString()}`, () => {
      expect(weiToEth(BigNumber.from(inStr))).to.equal(out);
    });
  };

  convertsWeiToEth('0', 0);
  convertsWeiToEth('10000000000000', 1e-5);
  convertsWeiToEth('100000000000000000', 0.1);
  convertsWeiToEth('1000000000000000000', 1);
  convertsWeiToEth('1000000000000000000', 1);
  convertsWeiToEth('10000000000000000000', 10);
  convertsWeiToEth('100000000000000000000000', 1e5);
});

describe('ethToWei', () => {
  const convertsEthToWei = (inNumb: number, outStr: string) => {
    it(`converts Eth:${inNumb.toString()} to wei:${outStr}`, () => {
      expect(ethToWei(inNumb).toString()).to.equal(outStr);
    });
  };

  convertsEthToWei(0, '0');
  convertsEthToWei(1e-5, '10000000000000');
  convertsEthToWei(0.1, '100000000000000000');
  convertsEthToWei(1, '1000000000000000000');
  convertsEthToWei(10, '10000000000000000000');
  convertsEthToWei(1e5, '100000000000000000000000');
});
