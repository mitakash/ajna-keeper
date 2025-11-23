/**
 * create-kickable-loans.ts
 * 
 * IMPORTANT LIMITATION:
 * 18→18 (quote→collateral): lend ✅  borrow ✅
 * 6→18: lend ✅  borrow ❌
 * 18→6: lend ❌  borrow ❌
 * 6→6: untested
 * 
 * WHAT THIS DOES
 * --------------------------
 * This script automates a 3-signer routine for an Ajna ERC-20 pool to create 2 kickable loans:
 *   1) Loads three keystore wallets (A/B/C) against RPC_URL.
 *   2) Configures Ajna SDK addresses from env (factory, utils, etc.).
 *   3) Maps human price targets (PRICE_A/B/C) to actual pool bucket indexes.
 *   4) For each signer, optionally:
 *        - LENDS quote into the chosen bucket at that index (requires quote balance & allowance).
 *        - BORROWS quote by pledging collateral (requires collateral allowance).
 *   5) Shows a PLAN preview and asks for confirmation before sending txs.
 *
 * ENV OVERVIEW (all strings unless noted)
 * ---------------------------------------
 * RPC_URL                : JSON-RPC endpoint
 * POOL_ADDRESS           : ERC-20 Ajna pool address (quote/collateral pair)
 *
 * KEYSTORE_A/B/C         : ABSOLUTE paths to JSON keystore files for the 3 signers
 *
 * AJNA_ERC20_POOL_FACTORY   (required)
 * AJNA_POOL_UTILS           (required)
 * AJNA_POSITION_MANAGER     (required)
 * AJNA_TOKEN                (required)
 * (Optional extras if you have them in your project:)
 * AJNA_ERC721_POOL_FACTORY, AJNA_GRANT_FUND, AJNA_BURN_WRAPPER, AJNA_LENDER_HELPER
 *
 * LENDING (pair each LEND_* with PRICE_*; both set or both blank)
 * --------------------------------------------------------------
 * PRICE_A/B/C            : Human price targets (e.g. "1.00"). Mapped to nearest bucket by price.
 * LEND_A/B/C             : Human quote amounts per signer (e.g. "20"). If "0" or blank => skip.
 *
 * BORROWING (per signer, optional)
 * --------------------------------
 * BORROW_X_QUOTE         : Human quote to draw (e.g. "9.5")
 * BORROW_X_COLL          : Human collateral to pledge (e.g. "10")
 * If either side missing or ≤ 0, that signer’s borrow leg is skipped with an error.
 *
 * MISC
 * ----
 * EXPIRY_SECS            : Seconds the lending preflight (callStatic) is considered valid.
 *                          Defaults to 300 if not set.
 *
 * DECIMALS HANDLING
 * -----------------
 * - LEND amounts use the quote token’s decimals (6, 18, etc.) via parseUnits.
 * - BORROW amounts use each token’s *own* decimals (collateral & quote resolved separately).
 * - Price targets are mapped via Ajna bucket pricing; you provide human price (e.g. 0.88, 1.00).
 *
 * SAFETY & UX
 * -----------
 * - Validates required envs and keystore paths (must be absolute).
 * - Prints a detailed PLAN and asks for confirmation.
 * - Checks balances and allowances before spending gas.
 * - Uses SDK methods where available; otherwise falls back to direct contract calls.
 *
 * WALLET REQUIREMENTS
 * -----------
 * Each keystore (A/B/C) must already hold the Quote and Collateral ERC-20 tokens.
 * Each keystore must also have enough native gas on the target chain
 * (e.g., ETH on Arbitrum, AVAX on Avalanche) to pay for approvals and tx fees.
 * 
 * USAGE
 * -----
 *   yarn ts-node create-kickable-loans.ts -h/--help
 *   yarn ts-node create-kickable-loans.ts
 *
 * EXAMPLES
 * --------
 * 1) Lend only:
 *    PRICE_A=1.00  LEND_A=20
 *    PRICE_B=0.88  LEND_B=15
 *    # C unset -> no action
 *
 * 2) Lend + Borrow for A:
 *    PRICE_A=1.00  LEND_A=20
 *    BORROW_A_QUOTE=9.5  BORROW_A_COLL=10
 *
 * NOTES
 * -----
 * - You’ll be prompted for each keystore’s password.
 * - Set any LEND_* to 0 or leave blank to skip; PRICE_* must be blank too in that case.
 * - For a borrow leg, both *_QUOTE and *_COLL must be positive numbers.
 */

import 'dotenv/config';
import path from 'path';
import { promises as fs } from 'fs';
import { ethers, Wallet, BigNumber, utils } from 'ethers';
import { AjnaSDK, FungiblePool } from '@ajna-finance/sdk';
import { configureAjna, AjnaConfigParams } from '../src/config-types';
import { approveErc20, getDecimalsErc20, getAllowanceOfErc20, getBalanceOfErc20 } from '../src/erc20';
import { decimaledToWei, weiToDecimaled } from '../src/utils';
import { JsonRpcProvider } from '../src/provider';
import { password, confirm } from '@inquirer/prompts';

export interface TripleSigners {
  provider: JsonRpcProvider;
  A: Wallet;
  B: Wallet;
  C: Wallet;
}

// ---------- CLI Help ----------
const HELP = (() => {
  const lines = (s: string) => s.trim().replace(/\t/g, '  ');
  return lines(`
Usage:
  yarn ts-node create-kickable-loans.ts [--help]

Description:
  Automates a 3-signer plan for an Ajna ERC-20 pool to create two kickable loans: loads keystores A/B/C, configures
  Ajna addresses, maps human price targets to bucket indexes, ensures balances &
  allowances, lends quote into buckets, and optionally draws debt by pledging collateral.

Required env:
  RPC_URL, POOL_ADDRESS, KEYSTORE_A/B/C (absolute paths),
  AJNA_ERC20_POOL_FACTORY, AJNA_POOL_UTILS, AJNA_POSITION_MANAGER, AJNA_TOKEN

Lending:
  LEND_A/B/C = human quote (e.g. "20");  PRICE_A/B/C = human price (e.g. "1.00")
  Each LEND_* must have matching PRICE_* (both set or both empty).

Borrowing:
  BORROW_X_QUOTE and BORROW_X_COLL must both be positive to borrow for signer X.

Wallets:
  Keystores A/B/C must own the Quote & Collateral tokens and have native gas
  on the target chain (e.g., ETH on Arbitrum, AVAX on Avalanche) for approvals + txs.
  
Other:
  EXPIRY_SECS (default 300) controls addQuoteToken deadline.

Examples:
  PRICE_A=1.00 LEND_A=20
  PRICE_B=0.88 LEND_B=15
  BORROW_A_QUOTE=9.5 BORROW_A_COLL=10

Notes:
  - You’ll be prompted for each keystore password.
`);
})();

function wantHelpFlag(): boolean {
  const argv = process.argv.slice(2);
  return argv.includes('-h') || argv.includes('--help') || argv.includes('--help=true');
}

// ------ Env helpers ------
function needEnv(name: string): string {
  const v = process.env[name];
  if (!v || !v.trim()) throw new Error(`Missing env var: ${name}`);
  return v.trim();
}

function envOrEmpty(name: string): string {
  const v = process.env[name];
  return v && v.trim() ? v.trim() : '';
}

function getOptionalPositiveHuman(name: string): string {
  const v = envOrEmpty(name);
  if (!v) return '';
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) {
    throw new Error(`Env ${name} must be a non-negative number, got "${v}"`);
  }
  if (n === 0) return '';
  return v;
}

function assertLendPricePair(
  label: 'A' | 'B' | 'C',
  lendHuman: string,
  priceHuman: string
): void {
  const lendSet  = !!lendHuman;   // '' => false, '12.3' => true
  const priceSet = !!priceHuman;  // '' => false, '1.00' => true
  if (lendSet !== priceSet) {
    throw new Error(lendSet
      ? `LEND_${label} is set but PRICE_${label} is missing. Provide PRICE_${label} or clear LEND_${label}.`
      : `PRICE_${label} is set but LEND_${label} is missing. Provide LEND_${label} or clear PRICE_${label}.`);
  }
}

function getOptionalBorrowPair(qVar: string, cVar: string): { qHuman: string, cHuman: string } | null {
  const q = envOrEmpty(qVar);
  const c = envOrEmpty(cVar);
  if (!q && !c) return null;                   // both omitted -> skip
  const qn = Number(q || 0), cn = Number(c || 0);
  if (!(qn > 0) || !(cn > 0)) {
    throw new Error(`If borrowing, both ${qVar} and ${cVar} must be positive (got ${q || 0}, ${c || 0})`);
  }
  return { qHuman: q!, cHuman: c! };
}

function shortAddr(a: string) {
  return a ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

function ts(): string {
  const d = new Date();
  return d.toISOString().replace('T', ' ').replace('Z', '');
}

function ensureAbs(p: string, label: string): string {
  if (!path.isAbsolute(p)) throw new Error(`${label} must be an absolute path. Got: "${p}"`);
  return p;
}

// ------ Ajna wiring ------
function configureAjnaFromEnv(): void {
  const cfg: AjnaConfigParams = {
    erc20PoolFactory: envOrEmpty('AJNA_ERC20_POOL_FACTORY'),
    erc721PoolFactory:envOrEmpty('AJNA_ERC721_POOL_FACTORY'),
    poolUtils:        envOrEmpty('AJNA_POOL_UTILS'),
    positionManager:  envOrEmpty('AJNA_POSITION_MANAGER'),
    ajnaToken:        envOrEmpty('AJNA_TOKEN'),
    grantFund:        envOrEmpty('AJNA_GRANT_FUND'),
    burnWrapper:      envOrEmpty('AJNA_BURN_WRAPPER'),
    lenderHelper:     envOrEmpty('AJNA_LENDER_HELPER'),
  };
  const requiredMap: Record<string, string> = {
    AJNA_ERC20_POOL_FACTORY: cfg.erc20PoolFactory,
    AJNA_POOL_UTILS:         cfg.poolUtils,
    AJNA_POSITION_MANAGER:   cfg.positionManager,
    AJNA_TOKEN:              cfg.ajnaToken,
  };
  const missing = Object.entries(requiredMap).filter(([, v]) => v === '').map(([k]) => k);
  if (missing.length) throw new Error(`Missing required Ajna env vars: ${missing.join(', ')}`);

  configureAjna(cfg);
}
// Map human price --> nearest bucket 
function pickBucketByPrice(pool: FungiblePool, humanPrice: string | number) {
  const p = typeof humanPrice === 'number' ? humanPrice : parseFloat(humanPrice);
  if (!(p > 0)) throw new Error(`Invalid price: ${humanPrice}`);
  const bucket = pool.getBucketByPrice(decimaledToWei(p));
  const priceHuman = weiToDecimaled(bucket.price); // number
  return { index: bucket.index, priceHuman };
}

// ------ Signers ------
export async function loadTripleSignersFromEnv(): Promise<TripleSigners> {
  const rpcUrl = needEnv('RPC_URL');
  const ksA = ensureAbs(needEnv('KEYSTORE_A'), 'KEYSTORE_A');
  const ksB = ensureAbs(needEnv('KEYSTORE_B'), 'KEYSTORE_B');
  const ksC = ensureAbs(needEnv('KEYSTORE_C'), 'KEYSTORE_C');

  const provider = new JsonRpcProvider(rpcUrl);

  async function load(label: 'A' | 'B' | 'C', p: string): Promise<Wallet> {
    console.log(`(keystore ${label}) ${p}`);
    const jsonKeystore = (await fs.readFile(p)).toString();
    const pswd = await password({ message: 'Please enter your keystore password', mask: '*',});

    try {
      const w = Wallet.fromEncryptedJsonSync(jsonKeystore, String(pswd));
      console.log(`${ts()} [info]: Loaded wallet with address: ${w.address}`);
      return w.connect(provider);
    } catch (e) {
      console.error(`${ts()} [error]: Error decrypting keystore: ${(e as Error).message}`);
      throw new Error(`Keystore ${label} decrypt failed`);
    }
  }

  const A = await load('A', ksA);
  const B = await load('B', ksB);
  const C = await load('C', ksC);

  return { provider, A, B, C };
}

// ------ Allowance helper ------
export async function ensureAllowance(
  signer: ethers.Signer,
  token: string,
  spender: string,
  required: BigNumber
) {
  if (required.lte(ethers.constants.Zero)) return; // skip if no spend needed
  const current = await getAllowanceOfErc20(signer, token, spender);
  if (current.gte(required)) return;
  const dec = await getDecimalsErc20(signer, token);
  console.log(`[${await signer.getAddress()}] approving ${ethers.utils.formatUnits(required, dec)} for ${spender}`);
  await approveErc20(signer, token, spender, required);
}

// ------ Lend/Borrow operations ------
export async function lendOnce({
  pool,
  signer,
  bucketIndex,
  amount,
  expirySecs = 300,
}: {
  pool: FungiblePool;
  signer: Wallet;
  bucketIndex: number;
  amount: BigNumber;
  expirySecs?: number;
}) {
  const who = await signer.getAddress();
  const dec = await getDecimalsErc20(signer, pool.quoteAddress);
  
  const nowSec = Math.floor(Date.now() / 1000);
  const deadline = nowSec + expirySecs;
  
  // Prefer SDK method if available, else fallback to direct contract call
  if (typeof (pool as any).lendQuote === 'function') {
    console.log(`[${who}] lending ${utils.formatUnits(amount, dec)} quote to bucket #${bucketIndex}`);
    const tx = await (pool as any).lendQuote(signer, amount, bucketIndex, deadline);
    const rcpt = await tx.verifyAndSubmit?.() ?? await tx.wait();
    console.log(`  -> tx mined: ${rcpt.transactionHash}`);
    return;
  }
  
  const contract = pool.contract.connect(signer as any);
  console.log(`[${who}] lending ${utils.formatUnits(amount, dec)} quote to bucket #${bucketIndex}`);
  
  // Preflight callStatic
  try {
    await contract.callStatic.addQuoteToken(amount, bucketIndex, deadline, { from: who });
    console.log('[preflight] callStatic passed ✅');
  } catch (e: any) {
    const data = e?.error?.data ?? e?.data;
    if (data) {
      try {
        const parsed = contract.interface.parseError(data);
        console.error('[preflight revert]', parsed.name, parsed.args);
      } catch { console.error('[preflight raw revert data]', data); }
    } else {
      console.error('[preflight no revert data]', e);
    }
    throw e; // bail before spending gas
  }

  const gas = await contract.estimateGas.addQuoteToken(amount, bucketIndex, deadline);
  const tx  = await contract.addQuoteToken(amount, bucketIndex, deadline, { gasLimit: gas.mul(12).div(10) });
  const rcpt = await tx.wait();
  console.log(`  -> tx mined: ${rcpt.transactionHash}`);
}

export async function borrowOnce({
  pool,
  signer,
  collateralHuman,
  quoteHuman,
}: {
  pool: FungiblePool;
  signer: Wallet;           // any ethers.Signer works
  collateralHuman: string;
  quoteHuman: string;
}) {
  const collDec  = await getDecimalsErc20(signer, pool.collateralAddress);
  const quoteDec = await getDecimalsErc20(signer, pool.quoteAddress);
  const collWei  = ethers.utils.parseUnits(collateralHuman, collDec);
  const quoteWei = ethers.utils.parseUnits(quoteHuman,     quoteDec);
  
  const who = await signer.getAddress();

  // Ensure collateral allowance to the pool
  const current = await getAllowanceOfErc20(signer, pool.collateralAddress, pool.poolAddress);
  if (current.lt(collWei)) {
    console.log(`[${who}] approving ${collateralHuman} collateral to ${pool.poolAddress}`);
    const approveTx   = await pool.collateralApprove(signer, collWei);   // <-- pass signer, not contract
    const approveRcpt = await approveTx.verifyAndSubmit();
    console.log(`  -> approve tx: ${approveRcpt.transactionHash}`);
  } else {
    console.log(`[${who}] collateral allowance sufficient; skipping approve`);
  }

  // Draw debt (pledges collateral & borrows in one call; no price guard)
  console.log(`[${who}] drawing ${quoteHuman} quote with ${collateralHuman} collateral`);
  const drawTx   = await pool.drawDebt(signer, quoteWei, collWei);
  const drawRcpt = await drawTx.verifyAndSubmit();
  console.log(`  -> draw tx: ${drawRcpt.transactionHash}`);
}

// -------- Main --------
async function main() {
  if (wantHelpFlag()) {
    console.log(HELP);
    process.exit(0);
  }
  // 1) Load signers
  const { provider, A, B, C } = await loadTripleSignersFromEnv();
  const addrA = await A.getAddress();
  const addrB = await B.getAddress();
  const addrC = await C.getAddress();

  // 2) Ajna config
  configureAjnaFromEnv();
  const ajna = new AjnaSDK(provider);

  // 3) Pool
  const pool = await ajna.fungiblePoolFactory.getPoolByAddress(needEnv('POOL_ADDRESS'));
  console.log(`Loaded pool: ${pool.name} @ ${pool.poolAddress}`);
  console.log(`Quote token: ${pool.quoteAddress}`);
  console.log(`Collateral token: ${pool.collateralAddress}`);

  // 4) Decimals
  const quoteDecimals = await getDecimalsErc20(A, pool.quoteAddress);

  // 5) Lend amounts (human -> base units; zero/blank => skip)
  const lendAHuman = getOptionalPositiveHuman('LEND_A');
  const lendBHuman = getOptionalPositiveHuman('LEND_B');
  const lendCHuman = getOptionalPositiveHuman('LEND_C');

  const lendA = lendAHuman ? ethers.utils.parseUnits(lendAHuman, quoteDecimals) : ethers.constants.Zero;
  const lendB = lendBHuman ? ethers.utils.parseUnits(lendBHuman, quoteDecimals) : ethers.constants.Zero;
  const lendC = lendCHuman ? ethers.utils.parseUnits(lendCHuman, quoteDecimals) : ethers.constants.Zero;

  // 6) Prices (must pair with LEND_*)
  const priceAInput = getOptionalPositiveHuman('PRICE_A');
  const priceBInput = getOptionalPositiveHuman('PRICE_B');
  const priceCInput = getOptionalPositiveHuman('PRICE_C');
  
  assertLendPricePair('A', lendAHuman, priceAInput);
  assertLendPricePair('B', lendBHuman, priceBInput);
  assertLendPricePair('C', lendCHuman, priceCInput);

  // 7) Map to buckets
  const AChoice = (!lendA.isZero() && priceAInput) ? pickBucketByPrice(pool, priceAInput) : null;
  const BChoice = (!lendB.isZero() && priceBInput) ? pickBucketByPrice(pool, priceBInput) : null;
  const CChoice = (!lendC.isZero() && priceCInput) ? pickBucketByPrice(pool, priceCInput) : null;

  // 7) Borrow config (optional)
  const borrowA = getOptionalBorrowPair('BORROW_A_QUOTE', 'BORROW_A_COLL');
  const borrowB = getOptionalBorrowPair('BORROW_B_QUOTE', 'BORROW_B_COLL');
  const borrowC = getOptionalBorrowPair('BORROW_C_QUOTE', 'BORROW_C_COLL');

  const nothingToDo = lendA.isZero() && lendB.isZero() && lendC.isZero() && !borrowA && !borrowB && !borrowC;
  if (nothingToDo) {
    console.log('Nothing to do: all lend amounts are 0 and no borrows configured. Exiting.');
    return;
  }

  // 9) PLAN Preview
  const planLines: string[] = [];
  planLines.push('--- PLAN --------------------------------------------------');
  const anyLend = !lendA.isZero() || !lendB.isZero() || !lendC.isZero();
  if (anyLend) {
    planLines.push('LEND (quote per signer)');
    const lendLine = (
      label: 'A'|'B'|'C', 
      addr: string, 
      humanAmt: string, 
      priceIn: number, 
      choice: {index:number; priceHuman:number}
    ) => `  ${label} (${shortAddr(addr)}): lend=${humanAmt || '0 (skip)'} ` + `@ price target ${priceIn} → bucket #${choice.index} (≈ ${choice.priceHuman})`;
      if (!lendA.isZero()) planLines.push(lendLine('A', addrA, lendAHuman, Number(priceAInput), AChoice!));
      if (!lendB.isZero()) planLines.push(lendLine('B', addrB, lendBHuman, Number(priceBInput), BChoice!));
      if (!lendC.isZero()) planLines.push(lendLine('C', addrC, lendCHuman, Number(priceCInput), CChoice!));
  } else {
    planLines.push('LEND: (none)');
  }

  const anyBorrow = !!(borrowA || borrowB || borrowC);
  if (anyBorrow) {
    planLines.push('BORROW (per signer, optional)');
    if (borrowA) planLines.push(`  A (${shortAddr(addrA)}): collateral=${borrowA.cHuman}  quote=${borrowA.qHuman}`);
    if (borrowB) planLines.push(`  B (${shortAddr(addrB)}): collateral=${borrowB.cHuman}  quote=${borrowB.qHuman}`);
    if (borrowC) planLines.push(`  C (${shortAddr(addrC)}): collateral=${borrowC.cHuman}  quote=${borrowC.qHuman}`);
  } else {
    planLines.push('BORROW: (none)');
  }
  planLines.push('-----------------------------------------------------------');
  console.log(planLines.join('\n'));

  // 10) Confirm
  const proceed = await confirm({ message: 'Proceed with the plan above?', default: false });
  if (!proceed) {
    console.log('Aborted by user.');
    return;
  }

  // 10) Ensure sufficient balances for non-zero lends
  const lendEntries = [
    { signer: A, addr: addrA, amount: lendA },
    { signer: B, addr: addrB, amount: lendB },
    { signer: C, addr: addrC, amount: lendC },
  ];
  for (const { signer, addr, amount } of lendEntries) {
    if (amount.lte(ethers.constants.Zero)) continue;
    const bal = await getBalanceOfErc20(signer, pool.quoteAddress);
    if (bal.lt(amount)) {
      const dec = await getDecimalsErc20(signer, pool.quoteAddress);
      const need = ethers.utils.formatUnits(amount, quoteDecimals);
      const have = ethers.utils.formatUnits(bal, quoteDecimals);
      throw new Error(`[${addr}] insufficient quote balance. Need ${need}, have ${have}`);
    }
  }

  // 12) Approvals for lending
  await ensureAllowance(A, pool.quoteAddress, pool.poolAddress, lendA);
  await ensureAllowance(B, pool.quoteAddress, pool.poolAddress, lendB);
  await ensureAllowance(C, pool.quoteAddress, pool.poolAddress, lendC);

  // 12) Execute lends
  const expirySecs = Number(getOptionalPositiveHuman('EXPIRY_SECS') || '300');
  if (lendA.gt(ethers.constants.Zero)) {
    await lendOnce({ pool, signer: A, bucketIndex: AChoice!.index, amount: lendA, expirySecs });
  }
  if (lendB.gt(ethers.constants.Zero)) {
    await lendOnce({ pool, signer: B, bucketIndex: BChoice!.index, amount: lendB, expirySecs });
  }
  if (lendC.gt(ethers.constants.Zero)) {
    await lendOnce({ pool, signer: C, bucketIndex: CChoice!.index, amount: lendC, expirySecs });
  }

  // 14) Optional borrows
  type BorrowEntry = { label: 'A'|'B'|'C', signer: Wallet, addr: string, data: { qHuman: string, cHuman: string } | null };
  const borrows: BorrowEntry[] = [
    { label: 'A', signer: A, addr: addrA, data: borrowA },
    { label: 'B', signer: B, addr: addrB, data: borrowB },
    { label: 'C', signer: C, addr: addrC, data: borrowC },
  ];
  for (const b of borrows) {
    if (!b.data) continue;
    await borrowOnce({ pool, signer: b.signer, collateralHuman: b.data.cHuman, quoteHuman: b.data.qHuman });
  }

  console.log('✅ Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});