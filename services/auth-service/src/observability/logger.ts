import pino from 'pino';
import { config } from '../config/env';

export const logger = pino({
  name: 'auth-service',
  level: config.LOG_LEVEL,
  redact: {
    paths: ['req.headers.authorization', 'password', 'passwordHash', 'token'],
    censor: '[REDACTED]',
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  formatters: {
    level(label) {
      return { level: label };
    },
  },
});

export const createChildLogger = (correlationId?: string) => {
  return logger.child({ correlationId: correlationId || 'unknown' });
};
