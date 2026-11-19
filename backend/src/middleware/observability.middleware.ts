import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// In-memory metrics registry
interface MetricsRegistry {
  startTime: number;
  totalRequests: number;
  activeRequests: number;
  statusCounts: Record<string, number>;
  routeCounts: Record<string, number>;
}

const metrics: MetricsRegistry = {
  startTime: Date.now(),
  totalRequests: 0,
  activeRequests: 0,
  statusCounts: {},
  routeCounts: {},
};

// Extend Express Request type to include correlationId
declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      startTime?: number;
    }
  }
}

/**
 * Middleware: Correlation ID & Structured JSON Request Logging
 * Attaches X-Correlation-ID header, tracks duration, and logs structured JSON telemetry.
 */
export const correlationAndLogging = (req: Request, res: Response, next: NextFunction): void => {
  const correlationId = (req.headers['x-correlation-id'] as string) || crypto.randomUUID();
  req.correlationId = correlationId;
  req.startTime = Date.now();
  res.setHeader('X-Correlation-ID', correlationId);

  metrics.totalRequests += 1;
  metrics.activeRequests += 1;

  res.on('finish', () => {
    metrics.activeRequests = Math.max(0, metrics.activeRequests - 1);
    const durationMs = req.startTime ? Date.now() - req.startTime : 0;
    const statusCode = res.statusCode;
    const statusBucket = `${Math.floor(statusCode / 100)}xx`;

    metrics.statusCounts[statusBucket] = (metrics.statusCounts[statusBucket] || 0) + 1;
    metrics.statusCounts[statusCode.toString()] = (metrics.statusCounts[statusCode.toString()] || 0) + 1;

    const routeKey = `${req.method} ${req.route ? req.baseUrl + req.route.path : req.path}`;
    metrics.routeCounts[routeKey] = (metrics.routeCounts[routeKey] || 0) + 1;

    // Structured JSON log output
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info',
      correlationId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode,
      durationMs,
      ip: req.ip || req.socket.remoteAddress || 'unknown',
    };

    // Output JSON line
    if (statusCode >= 500) {
      console.error(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  });

  next();
};

/**
 * Handler: Exposes /metrics in Prometheus plaintext format and /api/metrics in JSON
 */
export const metricsHandler = (req: Request, res: Response): void => {
  const uptimeSeconds = Math.floor((Date.now() - metrics.startTime) / 1000);
  const memoryUsage = process.memoryUsage();

  // If client requests JSON or route is /api/metrics
  if (req.headers.accept?.includes('application/json') || req.path.includes('/api/metrics')) {
    res.status(200).json({
      data: {
        uptimeSeconds,
        totalRequests: metrics.totalRequests,
        activeRequests: metrics.activeRequests,
        statusCounts: metrics.statusCounts,
        routeCounts: metrics.routeCounts,
        memoryUsage: {
          rssMb: (memoryUsage.rss / 1024 / 1024).toFixed(2),
          heapTotalMb: (memoryUsage.heapTotal / 1024 / 1024).toFixed(2),
          heapUsedMb: (memoryUsage.heapUsed / 1024 / 1024).toFixed(2),
        },
      },
      correlationId: req.correlationId,
    });
    return;
  }

  // Standard Prometheus Text Format
  let prometheusOutput = '';
  prometheusOutput += '# HELP taskdesk_uptime_seconds Total application uptime in seconds\n';
  prometheusOutput += '# TYPE taskdesk_uptime_seconds counter\n';
  prometheusOutput += `taskdesk_uptime_seconds ${uptimeSeconds}\n\n`;

  prometheusOutput += '# HELP taskdesk_http_requests_total Total HTTP requests processed\n';
  prometheusOutput += '# TYPE taskdesk_http_requests_total counter\n';
  prometheusOutput += `taskdesk_http_requests_total ${metrics.totalRequests}\n\n`;

  prometheusOutput += '# HELP taskdesk_active_requests Currently in-flight HTTP requests\n';
  prometheusOutput += '# TYPE taskdesk_active_requests gauge\n';
  prometheusOutput += `taskdesk_active_requests ${metrics.activeRequests}\n\n`;

  prometheusOutput += '# HELP taskdesk_requests_by_status HTTP requests grouped by status code\n';
  prometheusOutput += '# TYPE taskdesk_requests_by_status counter\n';
  for (const [status, count] of Object.entries(metrics.statusCounts)) {
    prometheusOutput += `taskdesk_requests_by_status{status="${status}"} ${count}\n`;
  }
  prometheusOutput += '\n';

  prometheusOutput += '# HELP process_memory_bytes Node.js process memory metrics\n';
  prometheusOutput += '# TYPE process_memory_bytes gauge\n';
  prometheusOutput += `process_memory_bytes{type="rss"} ${memoryUsage.rss}\n`;
  prometheusOutput += `process_memory_bytes{type="heapTotal"} ${memoryUsage.heapTotal}\n`;
  prometheusOutput += `process_memory_bytes{type="heapUsed"} ${memoryUsage.heapUsed}\n`;

  res.setHeader('Content-Type', 'text/plain; version=0.0.4');
  res.status(200).send(prometheusOutput);
};
