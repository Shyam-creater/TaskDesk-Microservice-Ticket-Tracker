import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { logger } from './observability/logger';
import { register, metricsMiddleware } from './observability/metrics';
import { correlationMiddleware } from './middleware/correlation.middleware';
import { globalRateLimiter } from './middleware/rateLimiter.middleware';
import { errorHandler, NotFoundError } from './middleware/error.middleware';
import { proxyRoutes } from './routes/proxy.routes';
import { config } from './config/env';

export const createApp = (): express.Application => {
  const app = express();

  // Security headers
  app.use(helmet());

  // Strict CORS: configured to allow frontend origin
  app.use(
    cors({
      origin: config.CORS_ORIGIN === '*' ? '*' : config.CORS_ORIGIN.split(','),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
      exposedHeaders: ['x-correlation-id'],
    })
  );

  // Correlation ID propagation on all requests
  app.use(correlationMiddleware);

  // Global rate limiter
  app.use(globalRateLimiter);

  // Structured Logging
  app.use(
    pinoHttp({
      logger,
      customProps: (req) => ({
        correlationId: (req as Request).correlationId,
      }),
      autoLogging: {
        ignore: (req) => req.url === '/health' || req.url === '/metrics',
      },
    })
  );

  // Prometheus Metrics Collection
  app.use(metricsMiddleware);

  // Health endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'api-gateway',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Prometheus scraping endpoint
  app.get('/metrics', async (_req: Request, res: Response) => {
    try {
      res.set('Content-Type', register.contentType);
      const metrics = await register.metrics();
      res.send(metrics);
    } catch (error) {
      res.status(500).send(error);
    }
  });

  // Proxy routes mounted at /api
  app.use('/api', proxyRoutes);

  // 404 handler
  app.use((req: Request, _res: Response, next) => {
    next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
  });

  // Central error handling
  app.use(errorHandler);

  return app;
};

export const app = createApp();
