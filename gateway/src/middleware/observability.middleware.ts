import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

interface GatewayMetrics {
  startTime: number;
  totalRequests: number;
  activeRequests: number;
  statusCounts: Record<string, number>;
}

const metrics: GatewayMetrics = {
  startTime: Date.now(),
  totalRequests: 0,
  activeRequests: 0,
  statusCounts: {},
};

declare global {
  namespace Express {
    interface Request {
      correlationId?: string;
      startTime?: number;
      trustedUser?: {
        id: string;
        email: string;
        role: string;
        name: string;
      };
    }
  }
}

/**
 * Strips client-supplied identity headers to prevent spoofing,
 * assigns/propagates X-Correlation-ID, extracts and verifies JWT to populate trusted identity headers.
 */
export const gatewaySecurityAndTracing = (req: Request, res: Response, next: NextFunction): void => {
  // 1. Strip any client-supplied spoofed identity headers
  delete req.headers['x-user-id'];
  delete req.headers['x-user-role'];
  delete req.headers['x-user-name'];
  delete req.headers['x-user-email'];

  // 2. Correlation ID
  const incomingCorrelationId = req.headers['x-correlation-id'] as string;
  const correlationId = incomingCorrelationId || crypto.randomUUID();
  req.correlationId = correlationId;
  req.startTime = Date.now();
  res.setHeader('X-Correlation-ID', correlationId);

  // 3. JWT Inspection & Trusted Identity Header setting
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const secret = process.env.JWT_SECRET;
    if (secret) {
      try {
        const decoded = jwt.verify(token, secret) as {
          id: string;
          email: string;
          role: string;
          name: string;
        };
        req.trustedUser = decoded;
      } catch {
        // Token invalid/expired - let downstream service handle 401 or proxy forward as-is
      }
    }
  }

  // 4. Metrics & Structured JSON Logging
  metrics.totalRequests += 1;
  metrics.activeRequests += 1;

  res.on('finish', () => {
    metrics.activeRequests = Math.max(0, metrics.activeRequests - 1);
    const durationMs = req.startTime ? Date.now() - req.startTime : 0;
    const statusCode = res.statusCode;
    const statusBucket = `${Math.floor(statusCode / 100)}xx`;

    metrics.statusCounts[statusBucket] = (metrics.statusCounts[statusBucket] || 0) + 1;
    metrics.statusCounts[statusCode.toString()] = (metrics.statusCounts[statusCode.toString()] || 0) + 1;

    const logEntry = {
      timestamp: new Date().toISOString(),
      level: statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info',
      service: 'api-gateway',
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

export const gatewayMetricsHandler = (req: Request, res: Response): void => {
  const uptimeSeconds = Math.floor((Date.now() - metrics.startTime) / 1000);
  const memoryUsage = process.memoryUsage();

  if (req.headers.accept?.includes('application/json') || req.path.includes('/api/metrics')) {
    res.status(200).json({
      data: {
        service: 'api-gateway',
        uptimeSeconds,
        totalRequests: metrics.totalRequests,
        activeRequests: metrics.activeRequests,
        statusCounts: metrics.statusCounts,
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

  let output = '';
  output += '# HELP gateway_uptime_seconds Total API Gateway uptime in seconds\n';
  output += '# TYPE gateway_uptime_seconds counter\n';
  output += `gateway_uptime_seconds ${uptimeSeconds}\n\n`;

  output += '# HELP gateway_http_requests_total Total HTTP requests handled by gateway\n';
  output += '# TYPE gateway_http_requests_total counter\n';
  output += `gateway_http_requests_total ${metrics.totalRequests}\n\n`;

  output += '# HELP gateway_active_requests Currently in-flight HTTP requests\n';
  output += '# TYPE gateway_active_requests gauge\n';
  output += `gateway_active_requests ${metrics.activeRequests}\n\n`;

  output += '# HELP gateway_requests_by_status HTTP requests grouped by status code\n';
  output += '# TYPE gateway_requests_by_status counter\n';
  for (const [status, count] of Object.entries(metrics.statusCounts)) {
    output += `gateway_requests_by_status{status="${status}"} ${count}\n`;
  }
  output += '\n';

  res.setHeader('Content-Type', 'text/plain; version=0.0.4');
  res.status(200).send(output);
};
