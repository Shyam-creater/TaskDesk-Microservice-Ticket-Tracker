import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

interface TicketMetrics {
  startTime: number;
  totalRequests: number;
  activeRequests: number;
  statusCounts: Record<string, number>;
}

const metrics: TicketMetrics = {
  startTime: Date.now(),
  totalRequests: 0,
  activeRequests: 0,
  statusCounts: {},
};

export const serviceObservability = (req: Request, res: Response, next: NextFunction): void => {
  const correlationId = (req.headers['x-correlation-id'] as string) || crypto.randomUUID();
  (req as any).correlationId = correlationId;
  (req as any).startTime = Date.now();
  res.setHeader('X-Correlation-ID', correlationId);

  metrics.totalRequests += 1;
  metrics.activeRequests += 1;

  res.on('finish', () => {
    metrics.activeRequests = Math.max(0, metrics.activeRequests - 1);
    const durationMs = (req as any).startTime ? Date.now() - (req as any).startTime : 0;
    const statusCode = res.statusCode;
    const statusBucket = `${Math.floor(statusCode / 100)}xx`;

    metrics.statusCounts[statusBucket] = (metrics.statusCounts[statusBucket] || 0) + 1;
    metrics.statusCounts[statusCode.toString()] = (metrics.statusCounts[statusCode.toString()] || 0) + 1;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level: statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info',
      service: 'ticket-service',
      correlationId,
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode,
      durationMs,
    };

    if (statusCode >= 500) {
      console.error(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  });

  next();
};

export const ticketMetricsHandler = (_req: Request, res: Response): void => {
  const uptimeSeconds = Math.floor((Date.now() - metrics.startTime) / 1000);
  const memoryUsage = process.memoryUsage();

  let output = '';
  output += '# HELP ticket_uptime_seconds Total Ticket Service uptime in seconds\n';
  output += '# TYPE ticket_uptime_seconds counter\n';
  output += `ticket_uptime_seconds ${uptimeSeconds}\n\n`;

  output += '# HELP ticket_http_requests_total Total HTTP requests handled by ticket-service\n';
  output += '# TYPE ticket_http_requests_total counter\n';
  output += `ticket_http_requests_total ${metrics.totalRequests}\n\n`;

  output += '# HELP ticket_active_requests Currently in-flight HTTP requests\n';
  output += '# TYPE ticket_active_requests gauge\n';
  output += `ticket_active_requests ${metrics.activeRequests}\n\n`;

  output += '# HELP ticket_requests_by_status HTTP requests grouped by status code\n';
  output += '# TYPE ticket_requests_by_status counter\n';
  for (const [status, count] of Object.entries(metrics.statusCounts)) {
    output += `ticket_requests_by_status{status="${status}"} ${count}\n`;
  }
  output += '\n';

  output += '# HELP process_memory_bytes Node.js process memory metrics\n';
  output += '# TYPE process_memory_bytes gauge\n';
  output += `process_memory_bytes{type="rss"} ${memoryUsage.rss}\n`;
  output += `process_memory_bytes{type="heapTotal"} ${memoryUsage.heapTotal}\n`;
  output += `process_memory_bytes{type="heapUsed"} ${memoryUsage.heapUsed}\n`;

  res.setHeader('Content-Type', 'text/plain; version=0.0.4');
  res.status(200).send(output);
};
