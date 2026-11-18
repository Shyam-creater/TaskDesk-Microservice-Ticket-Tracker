import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { logger } from './observability/logger';
import { register, metricsMiddleware } from './observability/metrics';
import { correlationMiddleware } from './middleware/correlation.middleware';
import { errorHandler, NotFoundError } from './middleware/error.middleware';
import { authRoutes } from './routes/auth.routes';
import { config } from './config/env';

export const createApp = (): express.Application => {
  const app = express();

  // Security headers
  app.use(helmet());

  // CORS configuration
  app.use(
    cors({
      origin: config.CORS_ORIGIN === '*' ? '*' : config.CORS_ORIGIN.split(','),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id'],
    })
  );

  // Body parser with size limit to prevent memory exhaustion attacks
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  // Correlation ID propagation
  app.use(correlationMiddleware);

  // HTTP Request Logging
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

  // Prometheus metrics collection
  app.use(metricsMiddleware);

  // Health check endpoint
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'auth-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Prometheus metrics scraping endpoint
  app.get('/metrics', async (_req: Request, res: Response) => {
    try {
      res.set('Content-Type', register.contentType);
      const metrics = await register.metrics();
      res.send(metrics);
    } catch (error) {
      res.status(500).send(error);
    }
  });

  // Routes - support both /auth and /api/auth prefix
  app.use('/auth', authRoutes);
  app.use('/api/auth', authRoutes);

  // 404 handler
  app.use((req: Request, _res: Response, next) => {
    next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
  });

  // Central error handling
  app.use(errorHandler);

  return app;
};

export const app = createApp();
