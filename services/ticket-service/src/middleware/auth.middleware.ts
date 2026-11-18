import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { UnauthorizedError, ForbiddenError } from './error.middleware';

export interface UserPayload {
  id: string;
  email: string;
  role: 'user' | 'admin';
  name?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserPayload;
    }
  }
}

export const authenticateToken = (req: Request, _res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    next(new UnauthorizedError('Authentication token is required'));
    return;
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as UserPayload;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      next(new UnauthorizedError('Token has expired'));
      return;
    }
    next(new UnauthorizedError('Invalid authentication token'));
  }
};

export const requireAdmin = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'admin') {
    next(new ForbiddenError('Access forbidden: administrator privileges required'));
    return;
  }
  next();
};

export const requireUser = (req: Request, _res: Response, next: NextFunction): void => {
  if (!req.user || req.user.role !== 'user') {
    next(new ForbiddenError('Access forbidden: administrators cannot create tickets'));
    return;
  }
  next();
};

export const requireRole = (role: 'user' | 'admin') => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user || req.user.role !== role) {
      next(new ForbiddenError(`Access forbidden: ${role} privileges required`));
      return;
    }
    next();
  };
};
