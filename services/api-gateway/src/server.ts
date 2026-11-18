import { initTracer, shutdownTracer } from './observability/tracer';
initTracer();

import { app } from './app';
import { config } from './config/env';
import { logger } from './observability/logger';

const server = app.listen(config.PORT, () => {
  logger.info(
    { port: config.PORT, env: config.NODE_ENV },
    `API Gateway is running on http://localhost:${config.PORT}`
  );
  logger.info(`Auth target: ${config.AUTH_SERVICE_URL}`);
  logger.info(`Ticket target: ${config.TICKET_SERVICE_URL}`);
});

const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info({ signal }, 'Received shutdown signal in api-gateway, starting graceful shutdown...');

  server.close(async () => {
    logger.info('API Gateway HTTP server closed');
    try {
      await shutdownTracer();
      logger.info('Graceful shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during gateway shutdown');
      process.exit(1);
    }
  });

  setTimeout(() => {
    logger.error('Could not close gateway in time, forcefully shutting down');
    process.exit(1);
  }, 10000).unref();
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled Rejection at Promise');
});

process.on('uncaughtException', (error) => {
  logger.fatal({ error }, 'Uncaught Exception thrown');
  process.exit(1);
});
