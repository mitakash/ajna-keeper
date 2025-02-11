import { Signer, Contract, BigNumber } from 'ethers';
import { FungiblePool } from '@ajna-finance/sdk';
import { addQuoteToken } from '@ajna-finance/sdk/dist/contracts/pool';
import Erc20PoolAbi from '@ajna-finance/sdk/dist/abis/ERC20Pool.json';
import Erc20Abi from '../abis/erc20.abi.json';
import { decimaledToWei } from '../utils';
import {
  impersonateSigner,
  latestBlockTimestamp,
  setBalance,
} from './test-utils';

interface DepostiQuoteParams {
  pool: FungiblePool;
  owner: string;
  amount: number;
  price: number;
}

export const depositQuoteToken = async ({
  pool,
  owner,
  amount,
  price,
}: DepostiQuoteParams) => {
  const whaleSigner = await impersonateSigner(owner);
  await setBalance(owner, '0x1000000000000000000000000');
  const bucket = await pool.getBucketByPrice(decimaledToWei(price));
  // const decimals = await getDecimalsErc20(whaleSigner, pool.quoteAddress);
  const amountBn = decimaledToWei(amount);

  const approveTx = await pool.quoteApprove(whaleSigner, amountBn);
  await approveTx.verifyAndSubmit();

  const currTimestamp = await latestBlockTimestamp();
  const contract = new Contract(pool.poolAddress, Erc20PoolAbi, whaleSigner);
  const addQuoteTx = await addQuoteToken(
    contract,
    amountBn,
    bucket.index,
    currTimestamp * 2
  );
  await addQuoteTx.verifyAndSubmit();
};

interface DrawDebtParams {
  pool: FungiblePool;
  owner: string;
  amountToBorrow: number;
  collateralToPledge: number;
}

export const drawDebt = async ({
  pool,
  owner,
  amountToBorrow,
  collateralToPledge,
}: DrawDebtParams) => {
  const signer = await impersonateSigner(owner);
  await setBalance(owner, '0x1000000000000000000000000');
  const collateralAmt = decimaledToWei(collateralToPledge);

  const qApproveTx = await pool.collateralApprove(signer, collateralAmt);
  await qApproveTx.verifyAndSubmit();

  const borrowAmt = decimaledToWei(amountToBorrow);
  const drawTx = await pool.drawDebt(signer, borrowAmt, collateralAmt);
  await drawTx.verifyAndSubmit();
};
