import { ethers } from 'ethers';

async function main() {
  const provider = new ethers.providers.JsonRpcProvider('https://base-mainnet.g.alchemy.com/v2/BGrpE_7pmP_VQwKMWN6hz');
  const factoryAddress = '0x834521A865Dd8AEE8C87a7eD3Fb23ac9Ecf9e87b';
  const expectedV4Taker = '0x9052DB22564077E732CB3fAE3Ad019A1eF07dF7a';
  
  const factory = new ethers.Contract(
    factoryAddress,
    ['function takerContracts(uint8) view returns (address)'],
    provider
  );
  
  const currentV4Taker = await factory.takerContracts(5); // 5 = UniswapV4
  
  console.log('\nFactory Configuration:');
  console.log('Factory address: ', factoryAddress);
  console.log('Expected V4 taker:', expectedV4Taker);
  console.log('Actual V4 taker:  ', currentV4Taker);
  console.log('\n✅ Match:', currentV4Taker.toLowerCase() === expectedV4Taker.toLowerCase() ? 'YES' : 'NO ❌');
}

main().catch(console.error);
