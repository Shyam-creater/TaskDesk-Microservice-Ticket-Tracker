import client from 'prom-client';
import { Request, Response, NextFunction } from 'express';

export const register = new client.Registry();
client.collectDefaultMetrics({ register, prefix: 'api_gateway_' });

export const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests through API Gateway in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 1.5, 2, 5],
  registers: [register],
});

export const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests processed by API Gateway',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const proxiedRequestsTotal = new client.Counter({
  name: 'proxied_requests_total',
  help: 'Total number of requests proxied downstream',
  labelNames: ['target_service', 'method', 'status_code'],
  registers: [register],
});

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime();

  res.on('finish', () => {
    const elapsed = process.hrtime(start);
    const durationInSeconds = elapsed[0] + elapsed[1] / 1e9;
    const route = req.baseUrl || req.path;
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
