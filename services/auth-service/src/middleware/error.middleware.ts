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

export class ConflictError extends AppError {
  readonly statusCode = 409;
  readonly errorCode = 'CONFLICT';
}

export class TooManyRequestsError extends AppError {
  readonly statusCode = 429;
  readonly errorCode = 'TOO_MANY_REQUESTS';
}

export class InternalServerError extends AppError {
  readonly statusCode = 500;
  readonly errorCode = 'INTERNAL_SERVER_ERROR';
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
    }, 'Application error occurred');

    res.status(err.statusCode).json({
      error: {
        code: err.errorCode,
        message: err.message,
      },
      correlationId,
    });
    return;
  }

  // Handle Mongoose duplicate key error
  if ((err as { code?: number }).code === 11000) {
    logger.warn({
      correlationId,
      errorCode: 'CONFLICT',
      statusCode: 409,
      message: 'Duplicate key error',
      path: req.originalUrl,
      method: req.method,
    }, 'Mongoose duplicate key error');

    res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: 'A resource with this identifier already exists',
      },
      correlationId,
    });
    return;
  }

  // Unhandled / 500 error
  logger.error({
    correlationId,
    err,
    message: err.message,
    path: req.originalUrl,
    method: req.method,
  }, 'Unhandled internal server error');

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected internal server error occurred',
    },
    correlationId,
  });
};
