import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { UnauthorizedError, ForbiddenError } from './error.middleware.js';
import { UserRole } from '../models/user.model.js';

export interface UserPayload {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: UserPayload;
}

export const authenticateToken = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or malformed Authorization header'));
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as UserPayload;
    req.user = decoded;
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
};

export const requireRole = (role: UserRole) => {
  return (req: AuthenticatedRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }
    if (req.user.role !== role) {
      return next(new ForbiddenError(`Access forbidden: requires ${role} role`));
    }
    next();
  };
};
