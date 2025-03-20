import {
  AjnaConfigParams,
  PoolConfig,
  PriceOrigin,
  PriceOriginSource,
} from '../config-types';
import { RequireFields } from '../utils';

export const HARDHAT_RPC_URL = 'http://127.0.0.1:8545';
// export const HARDHAT_RPC_URL = 'https://virtual.mainnet.rpc.tenderly.co/738d594f-ed95-4a37-848e-675cd79d758d';

export const USER1_MNEMONIC =
  'dragon empower index stage okay add nose worry grace play mail horse nurse rabbit blur';

export const MAINNET_CONFIG = {
  BLOCK_NUMBER: 21731352,
  WETH_ADDRESS: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  UNISWAP_V3_ROUTER: '0xE592427A0AEce92De3Edee1F18E0157C05861564',
  AJNA_CONFIG: {
    erc20PoolFactory: '0x6146DD43C5622bB6D12A5240ab9CF4de14eDC625',
    erc721PoolFactory: '0x27461199d3b7381De66a85D685828E967E35AF4c',
    poolUtils: '0x30c5eF2997d6a882DE52c4ec01B6D0a5e5B4fAAE',
    positionManager: '0x87B0F458d8F1ACD28A83A748bFFbE24bD6B701B1',
    ajnaToken: '0x9a96ec9B57Fb64FbC60B423d1f4da7691Bd35079',
    grantFund: '',
    burnWrapper: '',
    lenderHelper: '',
  } as AjnaConfigParams,
  WBTC_USDC_POOL: {
    collateralAddress: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
    collateralWhaleAddress: '0x5ee5bf7ae06d1be5997a1a72006fe6c607ec6de8',
    poolConfig: {
      name: 'WBTC/USDC',
      address: '0x3bb7c1e268a51b2d933c0490e282e20b906f8652',
      price: {
        source: PriceOriginSource.FIXED,
        value: 1,
      } as PriceOrigin,
      kick: {
        minDebt: 0,
        priceFactor: 0.9,
      },
      take: {
        minCollateral: 0,
        withdrawRewardLiquidity: true,
        priceFactor: 0.99,
      },
    } as RequireFields<PoolConfig, 'kick' | 'take'>,
  },
  SOL_WETH_POOL: {
    quoteAddress: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
    quoteDecimals: 18,
    collateralAddress: '0xd31a59c85ae9d8edefec411d448f90841571b89c',
    quoteWhaleAddress: '0xF04a5cC80B1E94C69B48f5ee68a08CD2F09A7c3E',
    quoteWhaleAddress2: '0x554adc35ccD8090566BfcA842537fd39b82489C1',
    collateralWhaleAddress: '0x127452F3f9cDc0389b0Bf59ce6131aA3Bd763598',
    collateralWhaleAddress2: '0xD48573cDA0fed7144f2455c5270FFa16Be389d04',
    poolConfig: {
      name: 'SOL/WETH',
      address: '0xe402b4af519c8c3a6e01949d4edb945d0d470a95',
      price: {
        source: PriceOriginSource.FIXED,
        value: 0.075,
      } as PriceOrigin,
      kick: {
        minDebt: 0,
        priceFactor: 0.9,
      },
      take: {
        minCollateral: 0,
        withdrawRewardLiquidity: true,
        priceFactor: 0.99,
      },
    } as RequireFields<PoolConfig, 'kick' | 'take'>,
  },
};
