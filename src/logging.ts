import { createLogger, transports, LogEntry, Logger, format } from 'winston';
import Transport, { TransportStreamOptions } from 'winston-transport';
import { metricsService } from './metrics';

const LOGS_FOLDER = 'logs';

// Define alert severity levels for Grafana filtering
export enum AlertSeverity {
  NONE = 'none',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

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
      format.timestamp(),
      format((info) => {
        const levels = ['error', 'info', 'debug'];
        const globalLevelIndex = levels.indexOf(logLevel);
        const logLevelIndex = levels.indexOf(info.level);
        return logLevelIndex <= globalLevelIndex ? info : false;
      })(),
      format.json()
    ),
    defaultMeta: { 
      service: 'ajna-keeper',
    },
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

export function setLoggerConfig(config: { logLevel?: string; enableMetrics?: boolean }) {
  logger = createCustomLogger(config.logLevel || 'debug');
  
  // Initialize metrics server if enabled
  if (config.enableMetrics) {
    metricsService.initialize();
  }
}

// Helper functions for logging alertable events
export function logAlert(message: string, severity: AlertSeverity, metadata: Record<string, any> = {}) {
  logger.error(message, { 
    ...metadata, 
    alertSeverity: severity,
    alertable: true
  });
  
  // Send metrics for alertable events
  if (metadata.component) {
    metricsService.recordAlert(
      severity, 
      metadata.component, 
      metadata.poolAddress, 
      metadata.poolName || (metadata.pool?.name)
    );
  }
}

export function logWarning(message: string, severity: AlertSeverity = AlertSeverity.MEDIUM, metadata: Record<string, any> = {}) {
  logger.warn(message, { 
    ...metadata, 
    alertSeverity: severity,
    alertable: true
  });
  
  // Send metrics for warning events
  if (metadata.component) {
    metricsService.recordAlert(
      severity, 
      metadata.component, 
      metadata.poolAddress, 
      metadata.poolName || (metadata.pool?.name)
    );
  }
}

export function setLogsFolderPermissions() {}
