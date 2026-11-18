import { initTracer, shutdownTracer } from './observability/tracer';
// Initialize OpenTelemetry tracing before importing other application code
initTracer();

import mongoose from 'mongoose';
import { app } from './app';
import { config } from './config/env';
import { logger } from './observability/logger';

let server: ReturnType<typeof app.listen>;

const startServer = async (): Promise<void> => {
  try {
    logger.info({ mongoUri: config.MONGO_URI }, 'Connecting to MongoDB...');
    await mongoose.connect(config.MONGO_URI);
    logger.info('Connected to MongoDB successfully');

    server = app.listen(config.PORT, () => {
      logger.info(
        { port: config.PORT, env: config.NODE_ENV },
        `Auth Service is running on http://localhost:${config.PORT}`
      );
    });
  } catch (error) {
    logger.fatal({ err: error }, 'Failed to start Auth Service');
    process.exit(1);
  }
};

const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info({ signal }, 'Received shutdown signal, starting graceful shutdown...');

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed');

      try {
        await mongoose.connection.close(false);
        logger.info('MongoDB connection closed');
        await shutdownTracer();
        logger.info('Graceful shutdown complete');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error during shutdown');
        process.exit(1);
      }
    });

    // Force close if it takes too long
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000).unref();
  } else {
    process.exit(0);
  }
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

startServer();
