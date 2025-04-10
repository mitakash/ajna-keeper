import { register, Counter, Gauge, Histogram } from 'prom-client';
import { createServer, Server } from 'http';
import { AlertSeverity } from './logging';
import { logger } from './logging';

// Prometheus metrics server configuration
const DEFAULT_METRICS_PORT = 9091;

// Metrics registry
export class MetricsService {
  private server: Server | null = null;
  private port: number;
  private isInitialized: boolean = false;

  // Define metrics
  private alertCounter: Counter;
  private poolErrorCounter: Counter;
  private componentErrorCounter: Counter;
  private lastErrorTimestamp: Gauge;
  private operationDuration: Histogram;

  constructor(port: number = DEFAULT_METRICS_PORT) {
    this.port = port;

    // Initialize metrics
    this.alertCounter = new Counter({
      name: 'ajna_keeper_alerts_total',
      help: 'Count of alerts by severity',
      labelNames: ['severity']
    });

    this.poolErrorCounter = new Counter({
      name: 'ajna_keeper_pool_errors_total',
      help: 'Count of errors by pool address',
      labelNames: ['pool_address', 'pool_name']
    });

    this.componentErrorCounter = new Counter({
      name: 'ajna_keeper_component_errors_total',
      help: 'Count of errors by component',
      labelNames: ['component']
    });

    this.lastErrorTimestamp = new Gauge({
      name: 'ajna_keeper_last_error_timestamp',
      help: 'Timestamp of the last error',
      labelNames: ['severity', 'component', 'pool_address']
    });

    this.operationDuration = new Histogram({
      name: 'ajna_keeper_operation_duration_seconds',
      help: 'Duration of operations in seconds',
      labelNames: ['operation', 'pool_address'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60]
    });
  }

  /**
   * Initialize the metrics server
   */
  public initialize(): void {
    if (this.isInitialized) {
      return;
    }

    // Create HTTP server for Prometheus to scrape
    this.server = createServer(async (req, res) => {
      if (req.url === '/metrics') {
        res.setHeader('Content-Type', register.contentType);
        res.end(await register.metrics());
      } else {
        res.statusCode = 404;
        res.end('Not found');
      }
    });

    // Start the server
    this.server.listen(this.port, () => {
      logger.info(`Metrics server started on port ${this.port}`);
    });

    this.isInitialized = true;
  }

  /**
   * Record an alert event
   * @param severity The severity of the alert
   * @param component The component that generated the alert
   * @param poolAddress The address of the pool (if applicable)
   * @param poolName The name of the pool (if applicable)
   */
  public recordAlert(
    severity: AlertSeverity,
    component: string,
    poolAddress?: string,
    poolName?: string
  ): void {
    // Increment alert counter by severity
    this.alertCounter.inc({ severity });

    // Increment component error counter
    this.componentErrorCounter.inc({ component });

    // Record timestamp of the error
    const timestamp = Date.now() / 1000;
    const labels: Record<string, string> = {
      severity,
      component
    };

    if (poolAddress) {
      labels.pool_address = poolAddress;
      // Increment pool error counter if pool address is provided
      this.poolErrorCounter.inc({ 
        pool_address: poolAddress,
        pool_name: poolName || 'unknown'
      });
    }

    this.lastErrorTimestamp.set(labels, timestamp);
  }

  /**
   * Start timing an operation
   * @param operation The name of the operation
   * @param poolAddress The address of the pool (if applicable)
   * @returns A function to call when the operation is complete
   */
  public startTimer(operation: string, poolAddress?: string): () => void {
    const end = this.operationDuration.startTimer({
      operation,
      pool_address: poolAddress || 'none'
    });
    return end;
  }

  /**
   * Shutdown the metrics server
   */
  public shutdown(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
      this.isInitialized = false;
    }
  }
}

// Singleton instance
export const metricsService = new MetricsService();
