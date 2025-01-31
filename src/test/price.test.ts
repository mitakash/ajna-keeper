import { AjnaSDK, Pool } from '@ajna-finance/sdk';
import { expect } from 'chai';
import { providers } from 'ethers';
import { configureAjna, PriceOriginPoolReference } from '../config';
import { getPoolPrice } from '../price';
import { getProvider, resetHardhat} from './test-utils';
import { LOCAL_MAIN_NET_CONFIG } from './test-config';


describe('getPoolPrice', () => {
  const poolAddress = LOCAL_MAIN_NET_CONFIG.WSTETH_WETH_POOL.poolAddress;
  let provider: providers.JsonRpcProvider;
  let ajna: AjnaSDK;
  let fungiblePool: Pool

  before(async () => {
    await resetHardhat();
    provider = getProvider();
    configureAjna(LOCAL_MAIN_NET_CONFIG.AJNA_CONFIG)
    ajna = new AjnaSDK(provider);
    fungiblePool = await ajna.fungiblePoolFactory.getPoolByAddress(poolAddress);
  });

  it('should find price for hpb', async () => {
    const hpbPrice = await getPoolPrice(fungiblePool, PriceOriginPoolReference.HPB);
    expect(hpbPrice).to.equal(1.149872);
  });

  it('should find price for htp', async () => {
    const htpPrice = await getPoolPrice(fungiblePool, PriceOriginPoolReference.HTP);
    expect(htpPrice).to.equal(0.702218);
  });

  it('should find price for lup', async () => {
    const lupPrice = await getPoolPrice(fungiblePool, PriceOriginPoolReference.LUP);
    expect(lupPrice).to.equal(1.138459);
  });

  it('should find price for llb', async () => {
    const llbPrice = await getPoolPrice(fungiblePool, PriceOriginPoolReference.LLB);
    expect(llbPrice).to.equal(1004968987.606512);
  });
});