import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      correlationId?: string;
    }
  }
}

export const correlationMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const incomingId = req.headers['x-correlation-id'] as string | undefined;
  const correlationId = incomingId || uuidv4();

  req.correlationId = correlationId;
  req.headers['x-correlation-id'] = correlationId;
  res.setHeader('x-correlation-id', correlationId);

  next();
};
