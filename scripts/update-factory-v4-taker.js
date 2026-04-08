"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
// scripts/update-factory-v4-taker.ts
var hardhat_1 = require("hardhat");
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var factoryAddress, newV4TakerAddress, signer, _a, _b, _c, factory, owner, signerAddress, currentTaker, tx, updatedTaker;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    factoryAddress = '0x286F8c091933C7767baF5f9D03CD302E64efAaAE';
                    newV4TakerAddress = '0x0abF6fBb7Dc6DD3885A05500E16b7C2f18734dDD';
                    console.log('\n🔄 Updating V4 taker in factory...\n');
                    return [4 /*yield*/, hardhat_1.ethers.getSigners()];
                case 1:
                    signer = (_d.sent())[0];
                    _b = (_a = console).log;
                    _c = ['Signer:'];
                    return [4 /*yield*/, signer.getAddress()];
                case 2:
                    _b.apply(_a, _c.concat([_d.sent()]));
                    return [4 /*yield*/, hardhat_1.ethers.getContractAt([
                            'function owner() view returns (address)',
                            'function takerContracts(uint8) view returns (address)',
                            'function updateTakerContract(uint8,address)',
                        ], factoryAddress, signer)];
                case 3:
                    factory = _d.sent();
                    return [4 /*yield*/, factory.owner()];
                case 4:
                    owner = _d.sent();
                    return [4 /*yield*/, signer.getAddress()];
                case 5:
                    signerAddress = _d.sent();
                    console.log('Factory owner:', owner);
                    console.log('Your address:', signerAddress);
                    if (owner.toLowerCase() !== signerAddress.toLowerCase()) {
                        console.error('\n❌ Error: You are not the factory owner!');
                        console.error('You cannot update the taker contract.');
                        process.exit(1);
                    }
                    return [4 /*yield*/, factory.takerContracts(5)];
                case 6:
                    currentTaker = _d.sent();
                    console.log('\nCurrent V4 taker:', currentTaker);
                    console.log('New V4 taker:    ', newV4TakerAddress);
                    if (currentTaker.toLowerCase() === newV4TakerAddress.toLowerCase()) {
                        console.log('\n✅ Factory already using the correct taker!');
                        return [2 /*return*/];
                    }
                    // Update to new taker
                    console.log('\n⏳ Updating factory...');
                    return [4 /*yield*/, factory.updateTakerContract(5, newV4TakerAddress)];
                case 7:
                    tx = _d.sent();
                    console.log('Tx hash:', tx.hash);
                    return [4 /*yield*/, tx.wait()];
                case 8:
                    _d.sent();
                    return [4 /*yield*/, factory.takerContracts(5)];
                case 9:
                    updatedTaker = _d.sent();
                    console.log('\n✅ Factory updated!');
                    console.log('New V4 taker:', updatedTaker);
                    console.log('');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .then(function () { return process.exit(0); })
    .catch(function (error) {
    console.error(error);
    process.exit(1);
});
//# sourceMappingURL=update-factory-v4-taker.js.map