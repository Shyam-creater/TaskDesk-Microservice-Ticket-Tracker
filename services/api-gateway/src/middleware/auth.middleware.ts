import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { UnauthorizedError } from './error.middleware';

export interface DecodedToken {
  id: string;
  email: string;
  role: 'user' | 'admin';
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: DecodedToken;
    }
  }
}

export const verifyGatewayAuth = (req: Request, _res: Response, next: NextFunction): void => {
  // Allow public endpoints through without authentication
  const publicRoutes = ['/api/auth/register', '/api/auth/login', '/health', '/metrics'];
  if (publicRoutes.includes(req.path) || publicRoutes.includes(req.originalUrl.split('?')[0])) {
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new UnauthorizedError('Missing or malformed Authorization header'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.JWT_SECRET) as DecodedToken;
    req.user = decoded;

    // Forward verified claims downstream
    req.headers['x-user-id'] = decoded.id;
    req.headers['x-user-role'] = decoded.role;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return next(new UnauthorizedError('Authentication token has expired'));
    }
    return next(new UnauthorizedError('Invalid authentication token'));
  }
};
