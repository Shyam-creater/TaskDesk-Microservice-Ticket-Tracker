import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { BadRequestError } from './error.middleware';

export const validate = (schema: ZodSchema) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
        next(new BadRequestError(`Validation error: ${issues}`));
      } else {
        next(error);
      }
    }
  };
};
