import { createLogger, transports, LogEntry, Logger, format } from 'winston';
import Transport, { TransportStreamOptions } from 'winston-transport';

// FIXME: this always writes a log folder in the module location, which is not always desirable
const LOGS_FOLDER = 'logs';

class CustomConsoleTransport extends Transport {
  constructor(opts: TransportStreamOptions) {
    super(opts);
  }

  log(entry: LogEntry, callback: any) {
    const { level, message, timestamp, ...meta } = entry;
    if (level === 'error') {
      console.error(`${timestamp} [${level}]: ${message}`);
    } else {
      console.log(`${timestamp} [${level}]: ${message}`);
    }
    callback();
  }
}

function createCustomLogger(logLevel: string = 'debug'): Logger {
  // Simpler timestamp format
  const timestampFormat = format.timestamp({
    format: () => {
      const now = new Date();
      return now.toISOString().replace('T', ' ').slice(0, 19); // Simple YYYY-MM-DD HH:MM:SS
    }
  });

  // For file logging, we can use a custom format that makes the timestamp appear first
  const fileFormat = format.printf(({ level, message, timestamp }) => {
    return `${timestamp} [${level}]: ${message}`;
  });
  
  return createLogger({
    level: logLevel,
    format: format.combine(
      timestampFormat,
      format((info) => {
        const levels = ['error', 'info', 'debug'];
        const globalLevelIndex = levels.indexOf(logLevel);
        const logLevelIndex = levels.indexOf(info.level);
        return logLevelIndex <= globalLevelIndex ? info : false;
      })()
    ),
    transports: [
      new CustomConsoleTransport({ level: logLevel }),
      new transports.File({
        filename: `${LOGS_FOLDER}/debug.log`,
        level: 'debug',
        options: { mode: 0o600 },
        format: format.combine(
          timestampFormat,
          fileFormat  // Use our custom format for files
        )
      }),
      new transports.File({
        filename: `${LOGS_FOLDER}/info.log`,
        level: 'info',
        format: format.combine(
          timestampFormat,
          format((info) => (info.level === 'info' ? info : false))(),
          fileFormat  // Use our custom format for files
        ),
        options: { mode: 0o600 },
      }),
      new transports.File({
        filename: `${LOGS_FOLDER}/error.log`,
        level: 'error',
        format: format.combine(
          timestampFormat,
          format((info) => (info.level === 'error' ? info : false))(),
          fileFormat  // Use our custom format for files
        ),
        options: { mode: 0o600 },
      }),
    ],
  });
}

export let logger: Logger = createCustomLogger('debug');

export function setLoggerConfig(config: { logLevel?: string }) {
  logger = createCustomLogger(config.logLevel || 'debug');
}

export function setLogsFolderPermissions() {}
