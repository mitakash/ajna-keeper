import { ethers } from 'hardhat';

async function main() {
  const factoryAddress = '0x834521A865Dd8AEE8C87a7eD3Fb23ac9Ecf9e87b';
  const expectedV4Taker = '0x9052DB22564077E732CB3fAE3Ad019A1eF07dF7a';
  
  const factory = await ethers.getContractAt(
    ['function takerContracts(uint8) view returns (address)'],
    factoryAddress
  );
  
  const currentV4Taker = await factory.takerContracts(5); // 5 = UniswapV4
  
  console.log('Expected V4 taker:', expectedV4Taker);
  console.log('Current V4 taker: ', currentV4Taker);
  console.log('Match:', currentV4Taker.toLowerCase() === expectedV4Taker.toLowerCase());
}

main().catch(console.error);
