import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodTypeAny } from 'zod';
import { BadRequestError } from './error.middleware.js';

/**
 * Middleware: Validates request body using a Zod schema.
 */
export const validateBody = (schema: ZodTypeAny) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.errors
          .map((e) => `${e.path.join('.') || 'body'}: ${e.message}`)
          .join(', ');
        next(new BadRequestError(`Validation failed: ${issues}`));
      } else {
        next(error);
      }
    }
  };
};

// ==============================================================================
// Zod Schemas for Request Validation
// ==============================================================================

export const registerSchema = z.object({
  name: z
    .string({ required_error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name cannot exceed 100 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email address format'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password cannot exceed 128 characters'),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email address format'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(1, 'Password is required'),
});

export const createTicketSchema = z.object({
  title: z
    .string({ required_error: 'Title is required' })
    .trim()
    .min(3, 'Title must be at least 3 characters long')
    .max(200, 'Title cannot exceed 200 characters'),
  description: z.string().trim().max(5000).optional().default(''),
  priority: z.enum(['low', 'medium', 'high']).optional().default('medium'),
});

export const updateTicketSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, 'Title must be at least 3 characters long')
    .max(200, 'Title cannot exceed 200 characters')
    .optional(),
  description: z.string().trim().max(5000).optional(),
});

export const updateStatusSchema = z.object({
  status: z.enum(['open', 'in_review', 'in_progress', 'resolved', 'closed'], {
    required_error: 'Status is required',
    invalid_type_error: 'Invalid status value',
  }),
});

export const reviewTicketSchema = z.object({
  priority: z.enum(['low', 'medium', 'high']).optional(),
});

export const postMessageSchema = z.object({
  body: z
    .string({ required_error: 'Message body is required' })
    .trim()
    .min(1, 'Message body cannot be empty')
    .max(2000, 'Message cannot exceed 2000 characters'),
});
