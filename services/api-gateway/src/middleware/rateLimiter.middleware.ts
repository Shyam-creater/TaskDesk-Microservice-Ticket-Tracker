import rateLimit from 'express-rate-limit';
import { TooManyRequestsError } from './error.middleware';

export const globalRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per windowMs across the gateway
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, _res, next) => {
    next(new TooManyRequestsError('Rate limit exceeded. Please slow down and try again later.'));
  },
});
