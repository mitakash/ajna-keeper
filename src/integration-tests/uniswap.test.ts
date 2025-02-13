import { expect } from 'chai';
import hre from 'hardhat';
import { BigNumber, Contract, ethers, Signer } from 'ethers';
import { abi as UniswapABI } from '@uniswap/v3-periphery/artifacts/contracts/SwapRouter.sol/SwapRouter.json';
import {
  FeeAmount,
  Pool as UniswapV3Pool,
  Route,
  Trade,
} from '@uniswap/v3-sdk';
import {
  CurrencyAmount,
  Percent,
  Token,
  TradeType,
  WETH9,
} from '@uniswap/sdk-core';
import { getProvider, impersonateSigner, setBalance } from './test-utils';
import { MAINNET_CONFIG } from './test-config';
import { abi as NonfungiblePositionManagerABI } from '@uniswap/v3-periphery/artifacts/contracts/NonfungiblePositionManager.sol/NonfungiblePositionManager.json';
import ERC20_ABI from '../abis/erc20.abi.json';
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json';

const UNISWAP_V3_ROUTER = '0xE592427A0AEce92De3Edee1F18E0157C05861564';

const HARDHAT_CHAIN_ID = 31337;

const WETH_HARDHAT_ADDRESS = '0xfD3e0cEe740271f070607aEddd0Bf4Cf99C92204';

WETH9[HARDHAT_CHAIN_ID] = new Token(
  HARDHAT_CHAIN_ID,
  WETH_HARDHAT_ADDRESS,
  18,
  'WETH',
  'Wrapped Ether'
);

let uniswapRouter: Contract;

const POSITION_MANAGER_ADDRESS = '0xC36442b4a4522E871399CD717aBDD847Ab11FE88';

type AddLiquidityParams = {
  signer: Signer;
  tokenA: Token;
  tokenB: Token;
  amountA: BigNumber;
  amountB: BigNumber;
  fee: FeeAmount;
};

async function addLiquidity({
  signer,
  tokenA,
  tokenB,
  amountA,
  amountB,
  fee,
}: AddLiquidityParams): Promise<void> {
  const positionManager = new Contract(
    POSITION_MANAGER_ADDRESS,
    NonfungiblePositionManagerABI,
    signer
  );
    const tokenAContract = new ethers.Contract(tokenA.address, ERC20_ABI, signer);
    const tokenBContract = new ethers.Contract(tokenB.address, ERC20_ABI, signer);

    const address = await signer.getAddress();

    await impersonateSigner(tokenA.address);
    await impersonateSigner(tokenB.address);

    await tokenAContract.connect(signer).transfer(address, ethers.utils.parseUnits("100", 18));
    await tokenBContract.connect(signer).transfer(address, ethers.utils.parseUnits("100", 18));

    await tokenAContract.approve(POSITION_MANAGER_ADDRESS, amountA);
    await tokenBContract.approve(POSITION_MANAGER_ADDRESS, amountB);

    const [token0, token1] =
        tokenA.address.toLowerCase() < tokenB.address.toLowerCase()
        ? [tokenA, tokenB]
        : [tokenB, tokenA];

    const tx = await positionManager.mint(
        {
        token0: token0.address,
        token1: token1.address,
        fee,
        tickLower: -60000,
        tickUpper: 60000,
        amount0Desired: amountA,
        amount1Desired: amountB,
        amount0Min: 0,
        amount1Min: 0,
        recipient: await signer.getAddress(),
        deadline: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
        },
        { gasLimit: 5000000 }
    );

    await tx.wait();
}

describe('Uniswap V3 Integration Tests', function () {
  let signer: Signer;
  before(async () => {
    uniswapRouter = new Contract(UNISWAP_V3_ROUTER, UniswapABI, signer);
    signer = await impersonateSigner(
      MAINNET_CONFIG.SOL_WETH_POOL.quoteWhaleAddress2
    );
  });
  it('Should add liquidity to the pool', async function () {
    const provider = getProvider();
    const chainId = (await provider.getNetwork()).chainId;
    const address = await signer.getAddress();
    const tokenA = new Token(chainId, address, 6, 'USDC', 'USD Coin');
    const tokenB = new Token(
      chainId,
      WETH9[chainId].address,
      18,
      'WETH',
      'Wrapped Ether'
    );

    await addLiquidity({
      signer,
      tokenA,
      tokenB,
      amountA: ethers.utils.parseUnits('1000', 6),
      amountB: ethers.utils.parseUnits('1', 18),
      fee: FeeAmount.MEDIUM,
    });
  });
  it('Should fetch pool info correctly', async function () {
    const provider = getProvider();
    const chainId = (await provider.getNetwork()).chainId;
    const address = await signer.getAddress();
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
    const signerAddress = await signer.getAddress();
    const address = await signer.getAddress();

    const tokenA = new Token(chainId, address, 6, 'USDC', 'USD Coin');
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

    const uniswapRouterWithSigner = uniswapRouter.connect(signer);

    const tx = await uniswapRouterWithSigner.exactInputSingle({
      tokenIn: tokenA.address,
      tokenOut: tokenB.address,
      fee: FeeAmount.LOW,
      recipient: signerAddress,
      deadline: Math.floor(Date.now() / 1000) + 60 * 5,
      amountIn: ethers.BigNumber.from('1000000'),
      amountOutMinimum: minOut,
      sqrtPriceLimitX96: poolInfo.sqrtPriceX96,
    },
    { gasLimit: 5000000 });

    const receipt = await tx.wait();
    expect(receipt.status).to.equal(1);
  });
});
