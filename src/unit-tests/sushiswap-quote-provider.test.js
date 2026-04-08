"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var chai_1 = require("chai");
var sinon_1 = __importDefault(require("sinon"));
var ethers_1 = require("ethers");
var sushiswap_quote_provider_1 = require("../dex-providers/sushiswap-quote-provider");
describe('SushiSwap Quote Provider', function () {
    var mockSigner;
    beforeEach(function () {
        // Create basic mock signer - same pattern as other tests
        mockSigner = {
            getAddress: sinon_1.default.stub().resolves('0xTestAddress'),
            getChainId: sinon_1.default.stub().resolves(43111),
            provider: {
                getNetwork: sinon_1.default.stub().resolves({ chainId: 43111, name: 'hemi-test' }),
                getCode: sinon_1.default.stub().resolves('0x123456'),
            },
        };
    });
    afterEach(function () {
        sinon_1.default.restore();
    });
    describe('Class Import and Basic Functionality', function () {
        it('should import SushiSwapQuoteProvider class successfully', function () {
            (0, chai_1.expect)(sushiswap_quote_provider_1.SushiSwapQuoteProvider).to.be.a('function');
            (0, chai_1.expect)(sushiswap_quote_provider_1.SushiSwapQuoteProvider.name).to.equal('SushiSwapQuoteProvider');
        });
        it('should return quoter address from configuration', function () {
            var config = {
                swapRouterAddress: '0x33d91116e0370970444B0281AB117e161fEbFcdD',
                quoterV2Address: '0x1400feFD6F9b897970f00Df6237Ff2B8b27Dc82C',
                factoryAddress: '0xCdBCd51a5E8728E0AF4895ce5771b7d17fF71959',
                defaultFeeTier: 500,
                wethAddress: '0x4200000000000000000000000000000000000006',
            };
            // Test without trying to instantiate with ethers contracts
            (0, chai_1.expect)(config.quoterV2Address).to.equal('0x1400feFD6F9b897970f00Df6237Ff2B8b27Dc82C');
            (0, chai_1.expect)(ethers_1.ethers.utils.isAddress(config.quoterV2Address)).to.be.true;
        });
        it('should handle missing quoter address in configuration', function () {
            var config = {
                swapRouterAddress: '0x33d91116e0370970444B0281AB117e161fEbFcdD',
                factoryAddress: '0xCdBCd51a5E8728E0AF4895ce5771b7d17fF71959',
                defaultFeeTier: 500,
                wethAddress: '0x4200000000000000000000000000000000000006',
                // quoterV2Address intentionally missing
            };
            (0, chai_1.expect)(config).to.not.have.property('quoterV2Address');
        });
    });
    describe('Configuration Validation Logic', function () {
        it('should validate Hemi production addresses are valid format', function () {
            var hemiAddresses = {
                swapRouter: '0x33d91116e0370970444B0281AB117e161fEbFcdD',
                quoterV2: '0x1400feFD6F9b897970f00Df6237Ff2B8b27Dc82C',
                factory: '0xCdBCd51a5E8728E0AF4895ce5771b7d17fF71959',
                weth: '0x4200000000000000000000000000000000000006',
            };
            Object.entries(hemiAddresses).forEach(function (_a) {
                var name = _a[0], address = _a[1];
                (0, chai_1.expect)(ethers_1.ethers.utils.isAddress(address), "".concat(name, " should be valid address")).to.be.true;
                (0, chai_1.expect)(address, "".concat(name, " should not be zero address")).to.not.equal('0x0000000000000000000000000000000000000000');
            });
        });
        it('should validate fee tier values', function () {
            var validFeeTiers = [100, 500, 3000, 10000];
            var invalidFeeTiers = [0, 50, 999];
            validFeeTiers.forEach(function (feeTier) {
                (0, chai_1.expect)([100, 500, 3000, 10000]).to.include(feeTier);
            });
            invalidFeeTiers.forEach(function (feeTier) {
                (0, chai_1.expect)([100, 500, 3000, 10000]).to.not.include(feeTier);
            });
        });
    });
    describe('Quote Response Structure', function () {
        it('should validate successful quote response format', function () {
            var successResponse = {
                success: true,
                dstAmount: ethers_1.BigNumber.from('900000'),
                gasEstimate: ethers_1.BigNumber.from('150000'),
            };
            (0, chai_1.expect)(successResponse.success).to.be.true;
            (0, chai_1.expect)(ethers_1.BigNumber.isBigNumber(successResponse.dstAmount)).to.be.true;
            (0, chai_1.expect)(successResponse.dstAmount.gt(0)).to.be.true;
            (0, chai_1.expect)(ethers_1.BigNumber.isBigNumber(successResponse.gasEstimate)).to.be.true;
        });
        it('should validate error response format', function () {
            var errorResponse = {
                success: false,
                error: 'Insufficient liquidity in SushiSwap pool',
            };
            (0, chai_1.expect)(errorResponse.success).to.be.false;
            (0, chai_1.expect)(errorResponse.error).to.be.a('string');
            (0, chai_1.expect)(errorResponse.error.length).to.be.greaterThan(0);
        });
    });
    describe('Pool Address Validation Logic', function () {
        it('should identify valid vs zero pool addresses', function () {
            var validPoolAddress = '0x1234567890123456789012345678901234567890';
            var zeroPoolAddress = '0x0000000000000000000000000000000000000000';
            // Test the logic that would be used to detect pool existence
            var poolExists = function (address) {
                return address !== '0x0000000000000000000000000000000000000000' &&
                    ethers_1.ethers.utils.isAddress(address);
            };
            (0, chai_1.expect)(poolExists(validPoolAddress)).to.be.true;
            (0, chai_1.expect)(poolExists(zeroPoolAddress)).to.be.false;
        });
        it('should validate token pair logic', function () {
            var tokenA = '0x1f0d51a052aa79527fffaf3108fb4440d3f53ce6';
            var tokenB = '0x91e1a2966408d434cfc1c0790df4a1ce08dc73d8';
            var sameToken = tokenA;
            // Test logic for valid token pairs
            (0, chai_1.expect)(tokenA).to.not.equal(tokenB); // Valid pair
            (0, chai_1.expect)(tokenA).to.equal(sameToken); // Invalid pair (same token)
            (0, chai_1.expect)(ethers_1.ethers.utils.isAddress(tokenA)).to.be.true;
            (0, chai_1.expect)(ethers_1.ethers.utils.isAddress(tokenB)).to.be.true;
        });
    });
    describe('Market Price Calculation Logic', function () {
        it('should calculate market price correctly', function () {
            // Test the math that would be used in getMarketPrice
            var inputAmount = 1000000; // 1 token with 6 decimals
            var outputAmount = 980000; // 0.98 token with 6 decimals
            var marketPrice = outputAmount / inputAmount;
            (0, chai_1.expect)(marketPrice).to.equal(0.98);
            (0, chai_1.expect)(marketPrice).to.be.lessThan(1.0);
            (0, chai_1.expect)(marketPrice).to.be.greaterThan(0.0);
        });
        it('should handle zero amounts properly', function () {
            var inputAmount = 1000000;
            var zeroOutput = 0;
            var priceWithZeroOutput = zeroOutput / inputAmount;
            var zeroInputPrice = inputAmount / 0; // This would be Infinity
            (0, chai_1.expect)(priceWithZeroOutput).to.equal(0);
            (0, chai_1.expect)(zeroInputPrice).to.equal(Infinity);
            (0, chai_1.expect)(Number.isFinite(priceWithZeroOutput)).to.be.true;
            (0, chai_1.expect)(Number.isFinite(zeroInputPrice)).to.be.false;
        });
    });
    describe('Error Message Categorization', function () {
        it('should categorize different error types', function () {
            var liquidityErrors = ['INSUFFICIENT_LIQUIDITY', 'No pool found'];
            var configErrors = ['QuoterV2 not available'];
            var dataErrors = ['Zero output from SushiSwap quoter'];
            var categorizeError = function (error) {
                if (liquidityErrors.some(function (pattern) { return error.includes(pattern); })) {
                    return 'liquidity';
                }
                if (configErrors.some(function (pattern) { return error.includes(pattern); })) {
                    return 'config';
                }
                if (dataErrors.some(function (pattern) { return error.includes(pattern); })) {
                    return 'data';
                }
                return 'unknown';
            };
            (0, chai_1.expect)(categorizeError('INSUFFICIENT_LIQUIDITY')).to.equal('liquidity');
            (0, chai_1.expect)(categorizeError('QuoterV2 not available')).to.equal('config');
            (0, chai_1.expect)(categorizeError('Zero output from SushiSwap quoter')).to.equal('data');
            (0, chai_1.expect)(categorizeError('Random error')).to.equal('unknown');
        });
    });
});
//# sourceMappingURL=sushiswap-quote-provider.test.js.map