import { Token } from '@uniswap/sdk-core';
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';
import { abi as UniswapABI } from '@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json';
import { FeeAmount, Pool as UniswapV3Pool } from '@uniswap/v3-sdk';
import { Contract, ethers, Signer } from 'ethers';
import ERC20_ABI from '../abis/erc20.abi.json';
import { MAINNET_CONFIG } from './test-config';
import {
  getProvider,
  impersonateSigner,
  resetHardhat,
  setBalance,
} from './test-utils';
import { addLiquidity } from './uniswap-helpers';
import { expect } from 'chai';
import { getPoolInfo, swapToWETH } from '../uniswap';
import sinon from 'sinon';
import { logger } from '../logging';

const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';
const NONFUNGIBLE_POSITION_MANAGER_ADDRESS =
  '0xC36442b4a4522E871399CD717aBDD847Ab11FE88';

let uniswapRouter: Contract;

describe('Uniswap V3 Integration Tests', function () {
  let wbtcSigner: Signer;
  let wethSigner: Signer;
  let wbtcSignerAddress: string;
  let wethSignerAddress: string;

  before(async () => {
    await resetHardhat();
    wbtcSigner = await impersonateSigner(
      MAINNET_CONFIG.WBTC_USDC_POOL.collateralWhaleAddress
    );
    wethSigner = await impersonateSigner(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress
    );
    wbtcSignerAddress = await wbtcSigner.getAddress();
    wethSignerAddress = await wethSigner.getAddress();
    await setBalance(wbtcSignerAddress, '0x10000000000000000000000000');
    await setBalance(wethSignerAddress, '0x10000000000000000000000000');
    uniswapRouter = new Contract(UNISWAP_V3_ROUTER, UniswapABI, wbtcSigner);
  });

  it('Should add liquidity to the pool', async function () {
    const wbtcContract = new Contract(
      MAINNET_CONFIG.WBTC_USDC_POOL.collateralAddress,
      ERC20_ABI,
      wbtcSigner
    );
    const wethContract = new Contract(
      MAINNET_CONFIG.SOL_WETH_POOL.quoteAddress,
      ERC20_ABI,
      wethSigner
    );

    const amountToSend = ethers.utils.parseUnits('100', 18);
    const approveTx = await wethContract
      .connect(wethSigner)
      .approve(wbtcSignerAddress, amountToSend);
    await approveTx.wait();

    const tx = await wethContract
      .connect(wethSigner)
      .transfer(wbtcSignerAddress, amountToSend, { gasLimit: 100000 });
    await tx.wait();

    await wbtcContract
      .connect(wbtcSigner)
      .approve(
        NONFUNGIBLE_POSITION_MANAGER_ADDRESS,
        ethers.utils.parseUnits('1', 8),
        { gasLimit: 3000000 }
      );
    await wethContract
      .connect(wbtcSigner)
      .approve(
        NONFUNGIBLE_POSITION_MANAGER_ADDRESS,
        ethers.utils.parseUnits('20', 18),
        { gasLimit: 3000000 }
      );

    const status = await addLiquidity({
      signer: wbtcSigner,
      tokenA: wbtcContract,
      tokenB: wethContract,
      amountA: ethers.utils.parseUnits('1', 8),
      amountB: ethers.utils.parseUnits('20', 18),
      fee: FeeAmount.MEDIUM,
    });

    expect(status).to.equal(1);
  });

  it('Should fetch pool info correctly', async function () {
    const provider = getProvider();
    const chainId = (await provider.getNetwork()).chainId;

    const wbtctoken = new Token(
      chainId,
      MAINNET_CONFIG.WBTC_USDC_POOL.collateralAddress,
      8,
      'WBTC',
      'Wrapped Bitcoin'
    );

    const wethToken = new Token(
      chainId,
      MAINNET_CONFIG.SOL_WETH_POOL.quoteAddress,
      18,
      'WETH',
      'Wrapped Ether'
    );

    const poolAddress = UniswapV3Pool.getAddress(
      wbtctoken,
      wethToken,
      FeeAmount.MEDIUM
    );

    const poolContract = new Contract(
      poolAddress,
      IUniswapV3PoolABI.abi,
      provider
    );

    const poolInfoFromApi = await getPoolInfo(poolContract);

    const { liquidity, sqrtPriceX96, tick } = poolInfoFromApi;

    expect(liquidity.toString()).to.equal('42631052882170131');
    expect(sqrtPriceX96.toString()).to.equal(
      '45439762258452960921888508325218226'
    );
    expect(tick.toString()).to.equal('265204');
  });

  it('Should perform a swap on Uniswap V3', async function () {
    const provider = getProvider();
    const chainId = (await provider.getNetwork()).chainId;

    const wbtctoken = new Token(
      chainId,
      MAINNET_CONFIG.WBTC_USDC_POOL.collateralAddress,
      8,
      'WBTC',
      'Wrapped Bitcoin'
    );
    const tokenToSwapContract = new Contract(
      MAINNET_CONFIG.WBTC_USDC_POOL.collateralAddress,
      ERC20_ABI,
      wbtcSigner
    );
    const weth = new Contract(
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
      ERC20_ABI,
      wbtcSigner
    );

    const signerAddress = await wbtcSigner.getAddress();
    const tokenToSwapBalanceBefore =
      await tokenToSwapContract.balanceOf(signerAddress);
    const wethBalanceBefore = await weth.balanceOf(signerAddress);

    await swapToWETH(
      wbtcSigner,
      wbtctoken.address,
      ethers.utils.parseUnits('0.1', 8),
      FeeAmount.MEDIUM,
      '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2'
    );

    const tokenToSwapBalanceAfter =
      await tokenToSwapContract.balanceOf(signerAddress);
    const wethBalanceAfter = await weth.balanceOf(signerAddress);
    expect(tokenToSwapBalanceAfter.lt(tokenToSwapBalanceBefore)).to.be.true;
    expect(wethBalanceAfter.gt(wethBalanceBefore)).to.be.true;
  });
});
