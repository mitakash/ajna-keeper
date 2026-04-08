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
var ethers_1 = require("ethers");
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var provider, factoryAddress, expectedV4Taker, factory, currentV4Taker;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    provider = new ethers_1.ethers.providers.JsonRpcProvider('https://base-mainnet.g.alchemy.com/v2/BGrpE_7pmP_VQwKMWN6hz');
                    factoryAddress = '0x834521A865Dd8AEE8C87a7eD3Fb23ac9Ecf9e87b';
                    expectedV4Taker = '0x9052DB22564077E732CB3fAE3Ad019A1eF07dF7a';
                    factory = new ethers_1.ethers.Contract(factoryAddress, ['function takerContracts(uint8) view returns (address)'], provider);
                    return [4 /*yield*/, factory.takerContracts(5)];
                case 1:
                    currentV4Taker = _a.sent();
                    console.log('\nFactory Configuration:');
                    console.log('Factory address: ', factoryAddress);
                    console.log('Expected V4 taker:', expectedV4Taker);
                    console.log('Actual V4 taker:  ', currentV4Taker);
                    console.log('\n✅ Match:', currentV4Taker.toLowerCase() === expectedV4Taker.toLowerCase() ? 'YES' : 'NO ❌');
                    return [2 /*return*/];
            }
        });
    });
}
main().catch(console.error);
//# sourceMappingURL=check-factory2.js.map