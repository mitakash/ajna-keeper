"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
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
var graphql_request_1 = require("graphql-request");
function getLoans(subgraphUrl, poolAddress) {
    return __awaiter(this, void 0, void 0, function () {
        var query, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    query = (0, graphql_request_1.gql)(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n    query {\n      loans (where: {inLiquidation: false, poolAddress: \"", "\"}){\n        borrower\n        thresholdPrice\n      }\n    }\n  "], ["\n    query {\n      loans (where: {inLiquidation: false, poolAddress: \"", "\"}){\n        borrower\n        thresholdPrice\n      }\n    }\n  "])), poolAddress.toLowerCase());
                    return [4 /*yield*/, (0, graphql_request_1.request)(subgraphUrl, query)];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result];
            }
        });
    });
}
function getLiquidations(subgraphUrl, poolAddress, minCollateral) {
    return __awaiter(this, void 0, void 0, function () {
        var query, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    query = (0, graphql_request_1.gql)(templateObject_2 || (templateObject_2 = __makeTemplateObject(["\n    query {\n      pool (id: \"", "\") {\n        hpb\n        hpbIndex\n        liquidationAuctions (where: {collateralRemaining_gt: \"", "\"}) {\n          borrower\n        }\n      }\n    }\n  "], ["\n    query {\n      pool (id: \"", "\") {\n        hpb\n        hpbIndex\n        liquidationAuctions (where: {collateralRemaining_gt: \"", "\"}) {\n          borrower\n        }\n      }\n    }\n  "])), poolAddress.toLowerCase(), minCollateral);
                    return [4 /*yield*/, (0, graphql_request_1.request)(subgraphUrl, query)];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result];
            }
        });
    });
}
function getHighestMeaningfulBucket(subgraphUrl, poolAddress, minDeposit) {
    return __awaiter(this, void 0, void 0, function () {
        var query, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    query = (0, graphql_request_1.gql)(templateObject_3 || (templateObject_3 = __makeTemplateObject(["\n    query {\n      buckets(\n        where: {\n          deposit_gt: \"", "\"\n          poolAddress: \"", "\"\n        }\n        first: 1\n        orderBy: bucketPrice\n        orderDirection: desc\n      ) {\n        bucketIndex\n      }\n    }\n  "], ["\n    query {\n      buckets(\n        where: {\n          deposit_gt: \"", "\"\n          poolAddress: \"", "\"\n        }\n        first: 1\n        orderBy: bucketPrice\n        orderDirection: desc\n      ) {\n        bucketIndex\n      }\n    }\n  "])), minDeposit, poolAddress.toLowerCase());
                    return [4 /*yield*/, (0, graphql_request_1.request)(subgraphUrl, query)];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result];
            }
        });
    });
}
function getUnsettledAuctions(subgraphUrl, poolAddress) {
    return __awaiter(this, void 0, void 0, function () {
        var query, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    query = (0, graphql_request_1.gql)(templateObject_4 || (templateObject_4 = __makeTemplateObject(["\n    query GetUnsettledAuctions($poolId: String!) {\n      liquidationAuctions(\n        where: {\n          pool: $poolId,\n          settled: false\n        }\n      ) {\n        borrower\n        kickTime\n        debtRemaining\n        collateralRemaining\n        neutralPrice\n        debt\n        collateral\n      }\n    }\n  "], ["\n    query GetUnsettledAuctions($poolId: String!) {\n      liquidationAuctions(\n        where: {\n          pool: $poolId,\n          settled: false\n        }\n      ) {\n        borrower\n        kickTime\n        debtRemaining\n        collateralRemaining\n        neutralPrice\n        debt\n        collateral\n      }\n    }\n  "])));
                    return [4 /*yield*/, (0, graphql_request_1.request)(subgraphUrl, query, {
                            poolId: poolAddress.toLowerCase()
                        })];
                case 1:
                    result = _a.sent();
                    return [2 /*return*/, result];
            }
        });
    });
}
// Exported as default module to enable mocking in tests.
exports.default = {
    getLoans: getLoans,
    getLiquidations: getLiquidations,
    getHighestMeaningfulBucket: getHighestMeaningfulBucket,
    getUnsettledAuctions: getUnsettledAuctions
};
var templateObject_1, templateObject_2, templateObject_3, templateObject_4;
//# sourceMappingURL=subgraph.js.map