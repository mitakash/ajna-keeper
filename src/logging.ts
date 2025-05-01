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
  const timestampFormat = format.timestamp({
    format: () => {
      const now = new Date();
      // Format: YYYY-MM-DD HH:MM:SS
      return now.toISOString().slice(0, 10) + ' ' + 
       now.toLocaleTimeString('en-US', { 
        hour12: false,
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit'
      });
    }
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
      })(),
      format.json()
    ),
    transports: [
      new CustomConsoleTransport({ level: logLevel }),
      new transports.File({
        filename: `${LOGS_FOLDER}/debug.log`,
        level: 'debug',
        options: { mode: 0o600 },
	format: format.combine(
          timestampFormat,
          format.json()
        )
      }),
      new transports.File({
        filename: `${LOGS_FOLDER}/info.log`,
        level: 'info',
        format: format.combine(
          timestampFormat,
          format((info) => (info.level === 'info' ? info : false))(),
          format.json()
        ),
        options: { mode: 0o600 },
      }),
      new transports.File({
        filename: `${LOGS_FOLDER}/error.log`,
        level: 'error',
        format: format.combine(
          timestampFormat,
          format((info) => (info.level === 'error' ? info : false))(),
          format.json()
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
