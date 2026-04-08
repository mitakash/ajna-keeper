"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setLogsFolderPermissions = exports.setLoggerConfig = exports.logger = void 0;
var winston_1 = require("winston");
var winston_transport_1 = __importDefault(require("winston-transport"));
// FIXME: this always writes a log folder in the module location, which is not always desirable
var LOGS_FOLDER = 'logs';
var CustomConsoleTransport = /** @class */ (function (_super) {
    __extends(CustomConsoleTransport, _super);
    function CustomConsoleTransport(opts) {
        return _super.call(this, opts) || this;
    }
    CustomConsoleTransport.prototype.log = function (entry, callback) {
        var level = entry.level, message = entry.message, timestamp = entry.timestamp, meta = __rest(entry, ["level", "message", "timestamp"]);
        if (level === 'error') {
            console.error("".concat(timestamp, " [").concat(level, "]: ").concat(message));
        }
        else {
            console.log("".concat(timestamp, " [").concat(level, "]: ").concat(message));
        }
        callback();
    };
    return CustomConsoleTransport;
}(winston_transport_1.default));
function createCustomLogger(logLevel) {
    if (logLevel === void 0) { logLevel = 'debug'; }
    // Simpler timestamp format
    var timestampFormat = winston_1.format.timestamp({
        format: function () {
            var now = new Date();
            return now.toISOString().replace('T', ' ').slice(0, 19); // Simple YYYY-MM-DD HH:MM:SS
        }
    });
    // For file logging, we can use a custom format that makes the timestamp appear first
    var fileFormat = winston_1.format.printf(function (_a) {
        var level = _a.level, message = _a.message, timestamp = _a.timestamp;
        return "".concat(timestamp, " [").concat(level, "]: ").concat(message);
    });
    return (0, winston_1.createLogger)({
        level: logLevel,
        format: winston_1.format.combine(timestampFormat, (0, winston_1.format)(function (info) {
            var levels = ['error', 'info', 'debug'];
            var globalLevelIndex = levels.indexOf(logLevel);
            var logLevelIndex = levels.indexOf(info.level);
            return logLevelIndex <= globalLevelIndex ? info : false;
        })()),
        transports: [
            new CustomConsoleTransport({ level: logLevel }),
            new winston_1.transports.File({
                filename: "".concat(LOGS_FOLDER, "/debug.log"),
                level: 'debug',
                options: { mode: 384 },
                format: winston_1.format.combine(timestampFormat, fileFormat // Use our custom format for files
                )
            }),
            new winston_1.transports.File({
                filename: "".concat(LOGS_FOLDER, "/info.log"),
                level: 'info',
                format: winston_1.format.combine(timestampFormat, (0, winston_1.format)(function (info) { return (info.level === 'info' ? info : false); })(), fileFormat // Use our custom format for files
                ),
                options: { mode: 384 },
            }),
            new winston_1.transports.File({
                filename: "".concat(LOGS_FOLDER, "/error.log"),
                level: 'error',
                format: winston_1.format.combine(timestampFormat, (0, winston_1.format)(function (info) { return (info.level === 'error' ? info : false); })(), fileFormat // Use our custom format for files
                ),
                options: { mode: 384 },
            }),
        ],
    });
}
exports.logger = createCustomLogger('debug');
function setLoggerConfig(config) {
    exports.logger = createCustomLogger(config.logLevel || 'debug');
}
exports.setLoggerConfig = setLoggerConfig;
function setLogsFolderPermissions() { }
exports.setLogsFolderPermissions = setLogsFolderPermissions;
//# sourceMappingURL=logging.js.map