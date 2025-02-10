import { createLogger, transports, format, LogEntry, level } from 'winston';
import Transport, { TransportStreamOptions } from 'winston-transport';
import { Transports } from 'winston/lib/winston/transports';

const LOGS_FOLDER = 'logs';

class CustomConsoleTransport extends Transport {
  constructor(opts: TransportStreamOptions) {
    super(opts);
  }

  log(entry: LogEntry, callback: any) {
    const { level, message, ...meta } = entry;
    console.log(message);
    callback();
  }
}

const EPOCH_SECONDS = Date.now();

export const logger = createLogger({
  level: 'debug',
  transports: [
    new CustomConsoleTransport({ level: 'info' }),
    new transports.File({
      filename: `${LOGS_FOLDER}/${EPOCH_SECONDS}-debug.log`,
      level: 'debug',
    }),
    new transports.File({
      filename: `${LOGS_FOLDER}/${EPOCH_SECONDS}-info.log`,
      level: 'info',
    }),
    new transports.File({
      filename: `${LOGS_FOLDER}/${EPOCH_SECONDS}-error.log`,
      level: 'error',
    }),
  ],
});
