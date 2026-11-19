import { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from './error.middleware.js';

export const requireInternalKey = (req: Request, _res: Response, next: NextFunction): void => {
  const internalKey = req.headers['x-internal-key'] as string;
  const configuredKey = process.env.INTERNAL_SERVICE_KEY;

  if (!internalKey) {
    throw new UnauthorizedError('Internal service key required');
  }

  if (!configuredKey || internalKey !== configuredKey) {
    throw new ForbiddenError('Invalid internal service key');
  }

  next();
};
