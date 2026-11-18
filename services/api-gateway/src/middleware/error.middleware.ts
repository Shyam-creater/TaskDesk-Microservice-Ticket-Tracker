import { Request, Response, NextFunction } from 'express';
import { logger } from '../observability/logger';

export abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly errorCode: string;

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends AppError {
  readonly statusCode = 400;
  readonly errorCode = 'BAD_REQUEST';
}

export class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly errorCode = 'UNAUTHORIZED';
}

export class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly errorCode = 'FORBIDDEN';
}

export class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly errorCode = 'NOT_FOUND';
}

export class TooManyRequestsError extends AppError {
  readonly statusCode = 429;
  readonly errorCode = 'TOO_MANY_REQUESTS';
}

export class BadGatewayError extends AppError {
  readonly statusCode = 502;
  readonly errorCode = 'BAD_GATEWAY';
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
): void => {
  const correlationId = (req.headers['x-correlation-id'] as string) || (req as unknown as { correlationId?: string }).correlationId || 'unknown';

  if (err instanceof AppError) {
    logger.warn({
      correlationId,
      errorCode: err.errorCode,
      statusCode: err.statusCode,
      message: err.message,
      path: req.originalUrl,
      method: req.method,
    }, 'Gateway application error');

    res.status(err.statusCode).json({
      error: {
        code: err.errorCode,
        message: err.message,
      },
      correlationId,
    });
    return;
  }

  logger.error({
    correlationId,
    err,
    message: err.message,
    path: req.originalUrl,
    method: req.method,
  }, 'Unhandled Gateway error');

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Gateway encountered an unexpected error',
    },
    correlationId,
  });
};
