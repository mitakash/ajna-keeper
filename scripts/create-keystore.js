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
var prompts_1 = require("@inquirer/prompts");
var fs_1 = require("fs");
function createKeystoreJson() {
    return __awaiter(this, void 0, void 0, function () {
        var filePath, key, isMnemonic, wallet, pswd, jsonKeystore;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, prompts_1.input)({
                        message: 'Enter path to save file',
                    })];
                case 1:
                    filePath = _a.sent();
                    if (!filePath) {
                        console.error('Error: Please enter a valid file path.');
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, (0, prompts_1.input)({
                            message: 'Enter your private key or mnemonic',
                            transformer: function (value, _a) {
                                var isFinal = _a.isFinal;
                                if (!isFinal)
                                    return value;
                                return '';
                            },
                        })];
                case 2:
                    key = _a.sent();
                    isMnemonic = ethers_1.utils.isValidMnemonic(key);
                    if (isMnemonic) {
                        console.log('Entered a Mnemonic phrase');
                    }
                    else {
                        console.log('Entered a private key');
                    }
                    wallet = undefined;
                    try {
                        wallet = isMnemonic ? ethers_1.Wallet.fromMnemonic(key) : new ethers_1.Wallet(key);
                    }
                    catch (error) {
                        console.error("Error: Failed to create wallet from entered ".concat(isMnemonic ? 'mnemonic' : 'private key', "."));
                        return [2 /*return*/];
                    }
                    return [4 /*yield*/, (0, prompts_1.password)({
                            message: 'Please enter your keystore password',
                            mask: '*',
                        })];
                case 3:
                    pswd = _a.sent();
                    return [4 /*yield*/, wallet.encrypt(pswd)];
                case 4:
                    jsonKeystore = _a.sent();
                    return [4 /*yield*/, fs_1.promises.writeFile(filePath, jsonKeystore, { flag: 'w' })];
                case 5:
                    _a.sent();
                    console.log("Saved wallet with address: ".concat(wallet.address, " to encrypted file: ").concat(filePath));
                    return [2 /*return*/];
            }
        });
    });
}
createKeystoreJson();
//# sourceMappingURL=create-keystore.js.map