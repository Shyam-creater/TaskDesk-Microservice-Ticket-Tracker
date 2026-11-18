import rateLimit from 'express-rate-limit';
import { TooManyRequestsError } from './error.middleware';

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // Limit each IP to 30 requests per windowMs for auth routes
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new TooManyRequestsError('Too many attempts. Please try again after 15 minutes.'));
  },
});
