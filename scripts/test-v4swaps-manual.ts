import { ethers, BigNumber } from 'ethers';
import { DexRouter } from '../src/dex-router';
import { PostAuctionDex } from '../src/config-types';
import config from '../example-uniswapV4-config copy';
import { getProviderAndSigner } from '../src/utils';

async function testManualSwap() {
  console.log('🔄 Testing Manual V4 Swap...\n');

  const { provider, signer } = await getProviderAndSigner(
    config.keeperKeystore,
    config.ethRpcUrl
  );
  
  const signerAddress = await signer.getAddress();
  const chainId = await signer.getChainId();
  
  console.log(`Chain: ${chainId}`);
  console.log(`Wallet: ${signerAddress}\n`);

  // CRITICAL FIX: Add tokenAddresses to DexRouter initialization
  const dexRouter = new DexRouter(signer, {
    oneInchRouters: config.oneInchRouters ?? {},
    connectorTokens: config.connectorTokens ?? [],
  });

  // Get token addresses - USE B_T2 and B_T4 (both 6 decimals)
  const b_t2 = config.tokenAddresses!['b_t2'];
  const b_t4 = config.tokenAddresses!['b_t4'];

  const ERC20_ABI = [
    'function balanceOf(address) view returns (uint256)',
    'function decimals() view returns (uint8)',
    'function symbol() view returns (string)',
    // ✅ add allowance + approve for Permit2
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
  ];
  
  const tokenContract = new ethers.Contract(b_t2, ERC20_ABI, provider);
  const balance = await tokenContract.balanceOf(signerAddress);
  const decimalsRaw = await tokenContract.decimals();
  const symbol = await tokenContract.symbol();
  const decimals = typeof decimalsRaw === 'number' ? decimalsRaw : decimalsRaw.toNumber();
  
  console.log(`Current ${symbol} balance: ${ethers.utils.formatUnits(balance, decimals)}`);
  console.log(`Token decimals: ${decimals}\n`);

  if (balance.eq(0)) {
    console.log('❌ No tokens to swap!');
    return;
  }

  // Use a sane not-too-small amount
  const swapAmountNative = ethers.utils.parseUnits('0.01', decimals);

  // Convert to WAD for your DexRouter
  const swapAmountWAD = decimals < 18 
    ? swapAmountNative.mul(BigNumber.from(10).pow(18 - decimals))
    : decimals > 18
      ? swapAmountNative.div(BigNumber.from(10).pow(decimals - 18))
      : swapAmountNative;

  console.log('🔄 Attempting swap:');
  console.log(`  Amount (native): ${ethers.utils.formatUnits(swapAmountNative, decimals)} ${symbol}`);
  console.log(`  Amount (native wei): ${swapAmountNative.toString()}`);
  console.log(`  Amount (WAD): ${ethers.utils.formatEther(swapAmountWAD)}`);
  console.log(`  Amount (WAD wei): ${swapAmountWAD.toString()}`);
  console.log(`  From: ${b_t2}`);
  console.log(`  To: ${b_t4}`);
  console.log(`  Slippage: 2%`);
  console.log(`  DEX: Uniswap V4\n`);

  if (swapAmountWAD.isZero()) {
    console.error('❌ ERROR: Swap amount is 0 after conversion! Increase the amount.');
    return;
  }

  const combinedSettings = {
    uniswap: {
      ...config.uniswapOverrides,
      ...config.universalRouterOverrides
    },
    sushiswap: config.sushiswapRouterOverrides,
    uniswapV4: config.uniswapV4RouterOverrides
  };

  // ✅ Permit2: approve once if needed (payerIsUser=true path)
  const PERMIT2 = '0x000000000022D473030F116dDEE9F6B43aC78BA3';
  const tokenForApprove = new ethers.Contract(b_t2, ERC20_ABI, signer);
  const currentAllowance = await tokenForApprove.allowance(signerAddress, PERMIT2);
  if (currentAllowance.lt(swapAmountNative)) {
    console.log(`Approving Permit2 for ${symbol}…`);
    const tx = await tokenForApprove.approve(PERMIT2, ethers.constants.MaxUint256);
    console.log(`  tx: ${tx.hash}`);
    await tx.wait();
    console.log('✅ Permit2 approved\n');
  } else {
    console.log('Permit2 already approved — skipping\n');
  }

  try {
    const result = await dexRouter.swap(
      chainId,
      swapAmountWAD,     // WAD amount
      b_t2,              // From
      b_t4,              // To
      signerAddress,     // Recipient
      PostAuctionDex.UNISWAP_V4,
      5,                 // 5% slippage (increased to account for quote variance)
      3000,              // fee (unused for V4 in your stack)
      combinedSettings
    );

    if (result.success) {
      console.log('\n✅ Swap successful!');
      if ((result as any).receipt) {
        const receipt = (result as any).receipt;
        console.log(`   Transaction hash: ${receipt.transactionHash}`);
        console.log(`   Block number: ${receipt.blockNumber}`);
        console.log(`   Gas used: ${receipt.gasUsed.toString()}`);
      }
    } else {
      console.log('\n❌ Swap failed:', result.error);
    }
  } catch (error) {
    console.error('\n❌ Error during swap:', error);
  }
}

testManualSwap()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Test failed:', error);
    process.exit(1);
  });
