const hre = require("hardhat");
const readline = require("readline");

async function main() {
  // --- CONFIGURATION ---
  // The Token you want to swap (e.g. USDC on Base)
  const TOKEN_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913"; 
  // The New Contract Address (The Spender)
  const SPENDER_ADDRESS = "0xD3DC2824D840C9e1A12f91e6e5EDE4F83220e909"; 
  // ---------------------

  // 1. Setup the prompter
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  // 2. Ask for the Private Key
  const privateKey = await new Promise((resolve) => {
    rl.question("🔑 Please paste your Private Key: ", (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });

  if (!privateKey.startsWith("0x")) {
    console.error("❌ Private key must start with 0x");
    return;
  }

  // 3. Create the Wallet manually using the input key
  const provider = hre.ethers.provider;
  const wallet = new hre.ethers.Wallet(privateKey, provider);
  console.log(`\n✅ Wallet connected: ${wallet.address}`);

  // 4. Connect to Token
  const token = await hre.ethers.getContractAt("IERC20", TOKEN_ADDRESS, wallet);

  // 5. Check & Approve
  console.log(`Checking allowance for ${SPENDER_ADDRESS}...`);
  const allowance = await token.allowance(wallet.address, SPENDER_ADDRESS);

  if (allowance.toString() === "0") {
      console.log("⚠️  Allowance is 0. Sending approval transaction...");
      
      const tx = await token.approve(SPENDER_ADDRESS, hre.ethers.constants.MaxUint256);
      console.log(`🚀 Tx sent: ${tx.hash}`);
      console.log("Waiting for confirmation...");
      
      await tx.wait();
      console.log("✅ Approved! You are ready to swap.");
  } else {
      console.log("✅ Allowance is already set! You don't need to do anything.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });