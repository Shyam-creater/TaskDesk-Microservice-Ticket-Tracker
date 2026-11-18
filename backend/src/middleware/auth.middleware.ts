import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UnauthorizedError, ForbiddenError } from './error.middleware.js';
import { UserRole } from '../models/user.model.js';

const JWT_SECRET =
  process.env.JWT_SECRET || 'supersecret_jwt_signing_key_at_least_32_characters_long_for_security';

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
    const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
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
