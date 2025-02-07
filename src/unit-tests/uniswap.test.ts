import { Ether, Token } from "@uniswap/sdk-core";
import { FeeAmount } from "@uniswap/v3-sdk";
import chai, { expect } from "chai";
import chaiAsPromised from "chai-as-promised";
import { BigNumber, Contract, ethers, providers, utils, Wallet } from "ethers";
import sinon from "sinon";
import { getPoolInfo } from "../uniswap";
import * as erc20 from "../erc20";

chai.use(chaiAsPromised);

// Mock de provider y signer
const mockProvider = new providers.JsonRpcProvider();

const mockSigner = new Wallet(
  ethers.Wallet.createRandom().privateKey,
  mockProvider
);

// Mock de token
const mockERC20Token = new Token(
  1,
  utils.getAddress("0x964d9D1A532B5a5DaeacBAc71d46320DE313AE9C"),
  6,
  "USDC",
  "USD Coin"
);
const mockNativeToken = Ether.onChain(1).wrapped;

class CustomContract extends Contract {
  liquidity: sinon.SinonStub<any[], any>;
  slot0: sinon.SinonStub<any[], any>;
  decimals: sinon.SinonStub<any[], any>;
  exactInputSingle: sinon.SinonStub<any[], any>;

  constructor(address: string, abi: any, provider: providers.Provider) {
    super(address, abi, provider);
    this.liquidity = sinon.stub();
    this.slot0 = sinon.stub();
    this.decimals = sinon.stub();
    this.exactInputSingle = sinon.stub();
  }
}

describe("getPoolInfo", () => {
  let contractStub: CustomContract;

beforeEach(async () => {
  contractStub = new CustomContract(
    "0x964d9D1A532B5a5DaeacBAc71d46320DE313AE9C",
    [],
    mockProvider
  );

  contractStub.liquidity.resolves(BigNumber.from("1000000000000000000"));
  contractStub.slot0.resolves([BigNumber.from("79228162514264337593543950336"), 0]);
});


  afterEach(() => {
    sinon.restore();
  });

  it("should return pool info correctly", async () => {
    const poolInfo = await getPoolInfo(
      mockProvider,
      mockNativeToken,
      mockERC20Token,
      FeeAmount.MEDIUM,
      contractStub
    );

    expect(poolInfo).to.have.property("liquidity");
    expect(poolInfo).to.have.property("sqrtPriceX96");
    expect(poolInfo).to.have.property("tick");
    expect(poolInfo.liquidity.toString()).to.equal("1000000000000000000");
    expect(poolInfo.sqrtPriceX96.toString()).to.equal("79228162514264337593543950336");
  });
});

describe("exchangeForNative", () => {
  let swapRouterStub: CustomContract;
  let mockPoolContract: CustomContract;
  let mockERC20Token: Token;

  beforeEach(() => {
    swapRouterStub = new CustomContract(
      "0xE592427A0AEce92De3Edee1F18E0157C05861564",
      [],
      mockProvider
    );

    mockPoolContract = new CustomContract(
      "0x964d9D1A532B5a5DaeacBAc71d46320DE313AE9C",
      [],
      mockProvider
    );

    // Mock ERC20 Token
    mockERC20Token = new Token(
      1,
      "0x964d9D1A532B5a5DaeacBAc71d46320DE313AE9C",
      6,
      "USDC",
      "USD Coin"
    );

    sinon.stub(mockSigner, "getAddress").resolves("0x964d9D1A532B5a5DaeacBAc71d46320DE313AE9C");
    sinon.stub(erc20, "getDecimalsErc20").resolves(6);
  });

  afterEach(() => {
    sinon.restore();
  });


//   it("should execute a swap successfully", async () => {
//     const poolInfo = await getPoolInfo(
//       mockProvider,
//       mockNativeToken,
//       mockERC20Token,
//       FeeAmount.MEDIUM,
//       contractStub
//     );

//     expect(poolInfo).to.have.property("liquidity");
//     expect(poolInfo).to.have.property("sqrtPriceX96");
//     expect(poolInfo).to.have.property("tick");
//     expect(poolInfo.liquidity.toString()).to.equal("1000000000000000000");
//     expect(poolInfo.sqrtPriceX96.toString()).to.equal("79228162514264337593543950336");
//   });


//   it("should fail if there isn't enpugh liquidity", async () => {
//     const poolInfo = await getPoolInfo(
//       mockProvider,
//       mockNativeToken,
//       mockERC20Token,
//       FeeAmount.MEDIUM,
//       contractStub
//     );

//     expect(poolInfo).to.have.property("liquidity");
//     expect(poolInfo).to.have.property("sqrtPriceX96");
//     expect(poolInfo).to.have.property("tick");
//     expect(poolInfo.liquidity.toString()).to.equal("1000000000000000000");
//     expect(poolInfo.sqrtPriceX96.toString()).to.equal("79228162514264337593543950336");
//   });
});
