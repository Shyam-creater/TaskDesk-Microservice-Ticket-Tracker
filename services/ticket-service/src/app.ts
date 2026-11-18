import express, { Request, Response } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pinoHttp from 'pino-http';
import { logger } from './observability/logger';
import { register, metricsMiddleware } from './observability/metrics';
import { correlationMiddleware } from './middleware/correlation.middleware';
import { errorHandler, NotFoundError } from './middleware/error.middleware';
import { ticketRoutes } from './routes/ticket.routes';
import { config } from './config/env';

export const createApp = (): express.Application => {
  const app = express();

  app.use(helmet());

  app.use(
    cors({
      origin: config.CORS_ORIGIN === '*' ? '*' : config.CORS_ORIGIN.split(','),
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id', 'x-user-id', 'x-user-role'],
    })
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.use(correlationMiddleware);

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

  app.use(metricsMiddleware);

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      service: 'ticket-service',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  app.get('/metrics', async (_req: Request, res: Response) => {
    try {
      res.set('Content-Type', register.contentType);
      const metrics = await register.metrics();
      res.send(metrics);
    } catch (error) {
      res.status(500).send(error);
    }
  });

  // Mount at both /tickets and /api/tickets
  app.use('/tickets', ticketRoutes);
  app.use('/api/tickets', ticketRoutes);

  app.use((req: Request, _res: Response, next) => {
    next(new NotFoundError(`Route not found: ${req.method} ${req.originalUrl}`));
  });

  app.use(errorHandler);

  return app;
};

export const app = createApp();
