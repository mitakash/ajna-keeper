import { createLogger, transports, LogEntry, Logger, format } from 'winston';
import Transport, { TransportStreamOptions } from 'winston-transport';

// FIXME: this always writes a log folder in the module location, which is not always desirable
const LOGS_FOLDER = 'logs';

class CustomConsoleTransport extends Transport {
  constructor(opts: TransportStreamOptions) {
    super(opts);
  }

  log(entry: LogEntry, callback: any) {
    const { level, message, ...meta } = entry;
    if (level === 'error') {
      console.error(message);
    } else {
      console.log(message);
    }
    callback();
  }
}

function createCustomLogger(logLevel: string = 'debug'): Logger {
  return createLogger({
    level: logLevel,
    format: format.combine(
      format((info) => {
        const levels = ['error', 'info', 'debug'];
        const globalLevelIndex = levels.indexOf(logLevel);
        const logLevelIndex = levels.indexOf(info.level);
        return logLevelIndex <= globalLevelIndex ? info : false;
      })(),
      format.json()
    ),
    transports: [
      new CustomConsoleTransport({ level: logLevel }),
      new transports.File({
        filename: `${LOGS_FOLDER}/debug.log`,
        level: 'debug',
        options: { mode: 0o600 },
      }),
      new transports.File({
        filename: `${LOGS_FOLDER}/info.log`,
        level: 'info',
        format: format((info) => (info.level === 'info' ? info : false))(),
        options: { mode: 0o600 },
      }),
      new transports.File({
        filename: `${LOGS_FOLDER}/error.log`,
        level: 'error',
        format: format((info) => (info.level === 'error' ? info : false))(),
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
