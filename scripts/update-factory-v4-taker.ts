// scripts/update-factory-v4-taker.ts
import { ethers } from 'hardhat';

async function main() {
  const factoryAddress = '0x286F8c091933C7767baF5f9D03CD302E64efAaAE';
  const newV4TakerAddress = '0x0abF6fBb7Dc6DD3885A05500E16b7C2f18734dDD';

  console.log('\n🔄 Updating V4 taker in factory...\n');

  const [signer] = await ethers.getSigners();
  console.log('Signer:', await signer.getAddress());

  const factory = await ethers.getContractAt(
    [
      'function owner() view returns (address)',
      'function takerContracts(uint8) view returns (address)',
      'function updateTakerContract(uint8,address)',
    ],
    factoryAddress,
    signer
  );

  // Check current owner
  const owner = await factory.owner();
  const signerAddress = await signer.getAddress();

  console.log('Factory owner:', owner);
  console.log('Your address:', signerAddress);

  if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
    console.error('\n❌ Error: You are not the factory owner!');
    console.error('You cannot update the taker contract.');
    process.exit(1);
  }

  // Check current V4 taker
  const currentTaker = await factory.takerContracts(5); // 5 = UniswapV4
  console.log('\nCurrent V4 taker:', currentTaker);
  console.log('New V4 taker:    ', newV4TakerAddress);

  if (currentTaker.toLowerCase() === newV4TakerAddress.toLowerCase()) {
    console.log('\n✅ Factory already using the correct taker!');
    return;
  }

  // Update to new taker
  console.log('\n⏳ Updating factory...');
  const tx = await factory.updateTakerContract(5, newV4TakerAddress);
  console.log('Tx hash:', tx.hash);

  await tx.wait();

  // Verify
  const updatedTaker = await factory.takerContracts(5);
  console.log('\n✅ Factory updated!');
  console.log('New V4 taker:', updatedTaker);
  console.log('');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
