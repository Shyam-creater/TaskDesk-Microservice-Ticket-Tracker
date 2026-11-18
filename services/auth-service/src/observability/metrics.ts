import client from 'prom-client';
import { Request, Response, NextFunction } from 'express';

// Enable default metrics collection
export const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'auth_service_' });

// HTTP request duration histogram
export const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 1.5, 2, 5],
  registers: [register],
});

// Total HTTP requests counter
export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Business counters
export const userLoginsTotal = new client.Counter({
  name: 'user_logins_total',
  help: 'Total number of user login attempts',
  labelNames: ['status'], // 'success' | 'failure'
  registers: [register],
});

export const userRegistrationsTotal = new client.Counter({
  name: 'user_registrations_total',
  help: 'Total number of user registrations',
  labelNames: ['status'], // 'success' | 'failure'
  registers: [register],
});

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime();

  res.on('finish', () => {
    const elapsed = process.hrtime(start);
    const durationInSeconds = elapsed[0] + elapsed[1] / 1e9;
    const route = req.route ? req.route.path : req.path;
    const statusCode = res.statusCode.toString();

    httpRequestDurationMicroseconds
      .labels(req.method, route, statusCode)
      .observe(durationInSeconds);

    httpRequestsTotal
      .labels(req.method, route, statusCode)
      .inc();
  });

  next();
};
