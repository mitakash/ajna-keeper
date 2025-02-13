import {
  CurrencyAmount,
  Percent,
  Token,
  TradeType,
  WETH9,
} from '@uniswap/sdk-core';
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/UniswapV3Factory.sol/UniswapV3Factory.json';
import { abi as NonfungiblePositionManagerABI } from '@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json';
import { abi as UniswapABI } from '@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json';
import {
  FeeAmount,
  Route,
  Trade,
  Pool as UniswapV3Pool,
} from '@uniswap/v3-sdk';
import { expect } from 'chai';
import { BigNumber, Contract, ethers, Signer } from 'ethers';
import ERC20_ABI from '../abis/erc20.abi.json';
import { MAINNET_CONFIG } from './test-config';
import { getProvider, impersonateSigner, setBalance } from './test-utils';

const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

let uniswapRouter: Contract;

const POSITION_MANAGER_ADDRESS = '0xC36442b4a4522E871399CD717aBDD847Ab11FE88';

type AddLiquidityParams = {
  signer1: Signer;
  signer2: Signer;
  tokenA: Token;
  tokenB: Token;
  amountA: BigNumber;
  amountB: BigNumber;
  fee: FeeAmount;
};

async function addLiquidity({
  signer1,
  signer2,
  tokenA,
  tokenB,
  amountA,
  amountB,
  fee,
}: AddLiquidityParams): Promise<void> {
  const positionManager = new Contract(
    POSITION_MANAGER_ADDRESS,
    NonfungiblePositionManagerABI,
    signer2
  );
  const provider = getProvider();
  const address1 = await signer1.getAddress();
  await setBalance(address1, '0x10000000000000000000000000');

  const tokenAContract = new ethers.Contract(
    tokenA.address,
    ERC20_ABI,
    signer1
  );
  const tokenBContract = new ethers.Contract(
    tokenB.address,
    ERC20_ABI,
    signer2
  );

  await tokenAContract
    .connect(signer1)
    .approve(tokenA.address, amountA, { gasLimit: 3000000 });
  await tokenBContract
    .connect(signer1)
    .approve(tokenB.address, amountB, { gasLimit: 3000000 });

  await tokenAContract
    .connect(signer1)
    .transfer(tokenA.address, amountA, { gasLimit: 3000000 });
  await tokenBContract
    .connect(signer2)
    .transfer(tokenB.address, amountB, { gasLimit: 3000000 });

  await tokenAContract.approve(POSITION_MANAGER_ADDRESS, amountA);
  await tokenBContract.approve(POSITION_MANAGER_ADDRESS, amountB);

  await tokenAContract.approve(
    '0xc36442b4a4522e871399cd717abdd847ab11fe88',
    amountA
  );
  await tokenBContract.approve(
    '0xc36442b4a4522e871399cd717abdd847ab11fe88',
    amountB
  );

  const currentBlock = await provider.getBlock('latest');
  const currentBlockTimestamp = currentBlock.timestamp;

  const tx = await positionManager.mint(
    {
      token0: tokenA.address,
      token1: tokenB.address,
      fee,
      tickLower: -138000,
      tickUpper: -115000,
      amount0Desired: ethers.utils.parseUnits('100', 6),
      amount1Desired: ethers.utils.parseUnits('0.05', 18),
      amount0Min: 0,
      amount1Min: 0,
      recipient: await signer1.getAddress(),
      deadline: currentBlockTimestamp + 60 * 60 * 24,
    },
    { gasLimit: 3000000 }
  );
  await tx.wait();
}

describe('Uniswap V3 Integration Tests', function () {
  let signer1: Signer;
  let signer2: Signer;
  before(async () => {
    uniswapRouter = new Contract(UNISWAP_V3_ROUTER, UniswapABI, signer1);
    signer1 = await impersonateSigner(
      MAINNET_CONFIG.WBTC_USDC_POOL.collateralWhaleAddress
    );
    signer2 = await impersonateSigner(
      MAINNET_CONFIG.SOL_WETH_POOL.collateralWhaleAddress
    );
  });
  it('Should add liquidity to the pool', async function () {
    const provider = getProvider();
    const chainId = (await provider.getNetwork()).chainId;
    const tokenA = new Token(
      chainId,
      MAINNET_CONFIG.WBTC_USDC_POOL.collateralAddress.toLowerCase(),
      6,
      'USDC',
      'USD Coin'
    );
    const tokenB = new Token(
      chainId,
      MAINNET_CONFIG.SOL_WETH_POOL.collateralAddress
        .toLowerCase()
        .toLowerCase(),
      18,
      'WETH',
      'Wrapped Ether'
    );

    await addLiquidity({
      signer1,
      signer2,
      tokenA,
      tokenB,
      amountA: ethers.utils.parseUnits('10', 6),
      amountB: ethers.utils.parseUnits('1', 6),
      fee: FeeAmount.MEDIUM,
    });
  });
  it('Should fetch pool info correctly', async function () {
    const provider = getProvider();
    const chainId = (await provider.getNetwork()).chainId;
    const address = await signer1.getAddress();
    const tokenA = new Token(chainId, address, 6, 'USDC', 'USD Coin');
    const tokenB = new Token(
      chainId,
      WETH9[chainId].address,
      18,
      'WETH',
      'Wrapped Ether'
    );

    const poolAddress = UniswapV3Pool.getAddress(tokenA, tokenB, FeeAmount.LOW);

    const poolContract = new Contract(
      poolAddress,
      IUniswapV3PoolABI.abi,
      provider
    );

    const [liquidity, slot0] = await Promise.all([
      poolContract.liquidity(),
      poolContract.slot0(),
    ]);

    expect(liquidity).to.be.a('BigNumber');
    expect(slot0[0]).to.be.a('BigNumber');
  });

  it('Should perform a swap on Uniswap V3', async function () {
    const provider = getProvider();
    const chainId = (await provider.getNetwork()).chainId;
    const signerAddress = await signer1.getAddress();

    const tokenA = new Token(chainId, signerAddress, 6, 'USDC', 'USD Coin');
    const tokenB = new Token(
      chainId,
      '0xfD3e0cEe740271f070607aEddd0Bf4Cf99C92204',
      18,
      'WETH',
      'Wrapped Ether'
    );

    const poolInfo = {
      sqrtPriceX96: ethers.BigNumber.from('79228162514264337593543950336'),
      liquidity: ethers.BigNumber.from('1000000000000000000'),
      tick: 0,
    };

    const pool = new UniswapV3Pool(
      tokenA,
      tokenB,
      FeeAmount.LOW,
      poolInfo.sqrtPriceX96.toString(),
      poolInfo.liquidity.toString(),
      poolInfo.tick
    );

    const route = new Route([pool], tokenA, tokenB);
    const trade = Trade.createUncheckedTrade({
      route,
      inputAmount: CurrencyAmount.fromRawAmount(tokenA, '1000000'),
      outputAmount: CurrencyAmount.fromRawAmount(
        tokenB,
        poolInfo.sqrtPriceX96.toString()
      ),
      tradeType: TradeType.EXACT_INPUT,
    });

    const slippageTolerance = new Percent(5, 100);
    const minOut = ethers.BigNumber.from(
      trade.minimumAmountOut(slippageTolerance).quotient.toString()
    );

    const uniswapRouterWithSigner = uniswapRouter.connect(signerAddress);

    const tx = await uniswapRouterWithSigner.exactInputSingle(
      {
        tokenIn: tokenA.address,
        tokenOut: tokenB.address,
        fee: FeeAmount.LOW,
        recipient: signerAddress,
        deadline: Math.floor(Date.now() / 1000) + 60 * 5,
        amountIn: ethers.BigNumber.from('1000000'),
        amountOutMinimum: minOut,
        sqrtPriceLimitX96: poolInfo.sqrtPriceX96,
      },
      { gasLimit: 5000000 }
    );

    const receipt = await tx.wait();
    expect(receipt.status).to.equal(1);
  });
});
