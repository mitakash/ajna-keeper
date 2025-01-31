import { expect } from "chai";
import { getProvider } from "./test-utils";

describe('Hardhat config', async () => {
  it('gets block number', async () => {
    const provider = getProvider();
    const blocknumber = await provider.getBlockNumber();
    expect(blocknumber == 21731352)
  })
});
