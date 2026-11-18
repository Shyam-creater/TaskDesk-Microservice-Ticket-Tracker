import { z } from 'zod';

export const createTicketSchema = z
  .object({
    title: z
      .string({ required_error: 'Title is required' })
      .trim()
      .min(3, 'Title must be between 3 and 100 characters')
      .max(100, 'Title must be between 3 and 100 characters'),
    description: z
      .string()
      .trim()
      .max(1000, 'Description cannot exceed 1000 characters')
      .optional()
      .default(''),
    priority: z
      .enum(['low', 'medium', 'high'], {
        errorMap: () => ({ message: 'Priority must be one of: low, medium, high' }),
      })
      .optional()
      .default('medium'),
  })
  .strict();

export const updateTicketSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(3, 'Title must be between 3 and 100 characters')
      .max(100, 'Title must be between 3 and 100 characters')
      .optional(),
    description: z
      .string()
      .trim()
      .max(1000, 'Description cannot exceed 1000 characters')
      .optional(),
    status: z
      .enum(['open', 'in_progress', 'closed'], {
        errorMap: () => ({ message: 'Status must be one of: open, in_progress, closed' }),
      })
      .optional(),
    priority: z
      .enum(['low', 'medium', 'high'], {
        errorMap: () => ({ message: 'Priority must be one of: low, medium, high' }),
      })
      .optional(),
  })
  .strict()
  .refine(
    (data) => data.title !== undefined || data.description !== undefined || data.status !== undefined || data.priority !== undefined,
    { message: 'At least one field must be provided for update' }
  );

export const ticketQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    status: z.enum(['open', 'in_progress', 'closed']).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
  })
  .strict();

export const ticketIdParamSchema = z
  .object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ticket ID format'),
  })
  .strict();

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type TicketQueryInput = z.infer<typeof ticketQuerySchema>;
