import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import readline from "readline";

// Your existing config file
const cfg = require("../example-uniswapV4-config copy").default as any;

// ====== EDIT THESE TWO IF NEEDED ======
const FACTORY_ADDRESS = "0x1729Fc45642D0713Fac14803b7381e601c27A8A4";
const FACTORY_ARTIFACT_PATH =
  "artifacts/contracts/AjnaKeeperTakerFactory.sol/AjnaKeeperTakerFactory.json";
// =====================================

// This script assumes your factory method name is this.
// If your factory ABI has a different name for selector 0x2d9a6183, update it.
const METHOD_NAME = "takeWithAtomicSwap";

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    })
  );
}

function loadArtifact(p: string): { abi: any[] } {
  const full = path.join(process.cwd(), p);
  if (!fs.existsSync(full)) throw new Error(`Missing artifact: ${full}`);
  const json = JSON.parse(fs.readFileSync(full, "utf8"));
  return { abi: json.abi };
}

function decodeRevert(iface: ethers.utils.Interface, data?: string): string {
  if (!data || typeof data !== "string" || !data.startsWith("0x")) return "(no revert data)";
  try {
    const parsed = iface.parseError(data);
    const args = parsed.args?.map((x: any) => (x?.toString ? x.toString() : String(x))) ?? [];
    return `CustomError: ${parsed.name}(${args.join(", ")})`;
  } catch {}
  try {
    if (data.slice(0, 10).toLowerCase() === "0x08c379a0") {
      const [reason] = ethers.utils.defaultAbiCoder.decode(["string"], "0x" + data.slice(10));
      return `Revert(string): ${reason}`;
    }
  } catch {}
  return `Raw revert data: ${data}`;
}

// ---- Types used by your taker contract swapData ----
type PoolKeyLike = {
  currency0: { addr: string };
  currency1: { addr: string };
  fee: number;
  tickSpacing: number;
  hooks: string;
};

type V4SwapDetails = {
  poolKey: PoolKeyLike;
  amountOutMinimum: ethers.BigNumberish;
  sqrtPriceLimitX96: ethers.BigNumberish;
  deadline: ethers.BigNumberish;
};

function buildSwapDataFromConfig(): string {
  // You MUST map from your config to these fields.
  // Your config already has uniswapV4RouterOverrides.poolManager in it 
  // but poolKey + minOut etc must come from where your bot computes them.
  //
  // So we support BOTH:
  // 1) cfg.debugSwapDetails already present (recommended)
  // 2) fall back to cfg.uniswapV4RouterOverrides.debugSwapDetails if you store it there

  const d: any = cfg.debugSwapDetails ?? cfg.uniswapV4RouterOverrides?.debugSwapDetails;
  if (!d) {
    throw new Error(
      "Missing swap details in config.\n" +
        "Add `debugSwapDetails` to your config with poolKey/amountOutMinimum/sqrtPriceLimitX96/deadline."
    );
  }

  const details: V4SwapDetails = {
    poolKey: {
      currency0: { addr: d.poolKey.currency0 },
      currency1: { addr: d.poolKey.currency1 },
      fee: Number(d.poolKey.fee),
      tickSpacing: Number(d.poolKey.tickSpacing),
      hooks: d.poolKey.hooks,
    },
    amountOutMinimum: d.amountOutMinimum,
    sqrtPriceLimitX96: d.sqrtPriceLimitX96,
    deadline: d.deadline,
  };

  const abiCoder = ethers.utils.defaultAbiCoder;
  return abiCoder.encode(
    [
      "tuple(tuple(address addr) currency0, tuple(address addr) currency1, uint24 fee, int24 tickSpacing, address hooks, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96, uint256 deadline)",
    ],
    [
      [
        { addr: details.poolKey.currency0.addr },
        { addr: details.poolKey.currency1.addr },
        details.poolKey.fee,
        details.poolKey.tickSpacing,
        details.poolKey.hooks,
        details.amountOutMinimum,
        details.sqrtPriceLimitX96,
        details.deadline,
      ],
    ]
  );
}

async function main() {
  console.log("\n🧪 Live V4 Take Debugger (no error.log)\n");

  const rpcUrl = cfg.ethRpcUrl;
  const keystorePath = cfg.keeperKeystore;
  if (!rpcUrl) throw new Error("config.ethRpcUrl missing");
  if (!keystorePath) throw new Error("config.keeperKeystore missing");

  const provider = new ethers.providers.JsonRpcProvider(rpcUrl);

  const password = await prompt("Enter keystore password (input visible): ");
  const encryptedJson = fs.readFileSync(keystorePath, "utf8");
  const wallet = await ethers.Wallet.fromEncryptedJson(encryptedJson, password);
  const signer = wallet.connect(provider);

  console.log("Signer:", await signer.getAddress());
  console.log("Chain :", (await provider.getNetwork()).chainId);

  const { abi } = loadArtifact(FACTORY_ARTIFACT_PATH);
  const factory = new ethers.Contract(FACTORY_ADDRESS, abi, signer);
  const iface = new ethers.utils.Interface(abi);

  // ---- You must provide the target liquidation inputs in config ----
  // Put these in config as cfg.debugTake = { pool, borrower, auctionPrice, collateral, source, router }
  const t = cfg.debugTake;
  if (!t) {
    throw new Error(
      "Missing debugTake in config.\n" +
        "Add:\n" +
        "debugTake: { pool, borrower, auctionPrice, collateral, source, router }\n"
    );
  }

  const swapData = buildSwapDataFromConfig();

  const args = [
    t.pool,
    t.borrower,
    t.auctionPrice,
    t.collateral,
    t.source,
    t.router,
    swapData,
  ];

  console.log("\nCall:");
  console.log("factory:", FACTORY_ADDRESS);
  console.log("method :", METHOD_NAME);
  args.forEach((a, i) => console.log(`  [${i}]`, a));

  // ---- callStatic first (best signal) ----
  console.log("\n🧪 callStatic...");
  try {
    // @ts-ignore
    const res = await factory.callStatic[METHOD_NAME](...args);
    console.log("✅ callStatic success:", res);
  } catch (err: any) {
    const data = err?.error?.data ?? err?.data;
    console.log("❌ callStatic reverted");
    console.log("message:", err?.reason || err?.message);
    console.log("decoded:", decodeRevert(iface, data));
    console.log("raw   :", data);

    // fallback: raw provider.call using encoded tx data
    console.log("\n🔎 fallback provider.call on encoded calldata...");
    try {
      const encoded = iface.encodeFunctionData(METHOD_NAME, args);
      await provider.call({ from: await signer.getAddress(), to: FACTORY_ADDRESS, data: encoded });
      console.log("✅ provider.call succeeded (unexpected if callStatic reverted)");
    } catch (e2: any) {
      const d2 = e2?.error?.data ?? e2?.data;
      console.log("❌ provider.call reverted");
      console.log("message:", e2?.reason || e2?.message);
      console.log("decoded:", decodeRevert(iface, d2));
      console.log("raw   :", d2);
    }

    // Optional: force send
    if (process.env.FORCE_SEND === "1") {
      console.log("\n🚨 FORCE_SEND=1: sending tx (costs gas)...");
      const tx = await factory[METHOD_NAME](...args, { gasLimit: 4_000_000 });
      console.log("tx:", tx.hash);
      const r = await tx.wait();
      console.log("receipt status:", r.status, "block:", r.blockNumber);
    }

    process.exit(1);
  }
}

main().catch((e) => {
  console.error("\nFatal:", e);
  process.exit(1);
});
