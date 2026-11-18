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
  })
  .strict()
  .refine(
    (data) => data.title !== undefined || data.description !== undefined,
    { message: 'At least title or description must be provided for update' }
  );

export const updateStatusSchema = z
  .object({
    status: z.enum(['open', 'in_review', 'in_progress', 'resolved', 'closed'], {
      errorMap: (issue) => {
        if (issue.code === 'invalid_type') {
          return { message: 'Status is required' };
        }
        return { message: 'Status must be one of: open, in_review, in_progress, resolved, closed' };
      },
    }),
  })
  .strict();

export const reviewTicketSchema = z
  .object({
    priority: z.enum(['low', 'medium', 'high']).optional(),
  })
  .strict();

export const createMessageSchema = z
  .object({
    body: z
      .string({ required_error: 'Message body is required' })
      .trim()
      .min(1, 'Message cannot be empty')
      .max(1000, 'Message cannot exceed 1000 characters'),
  })
  .strict();

export const ticketQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    status: z.enum(['open', 'in_review', 'in_progress', 'resolved', 'closed']).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
  })
  .strict();

export const ticketIdParamSchema = z
  .object({
    id: z.string().regex(/^([0-9a-fA-F]{24}|[A-Za-z0-9_-]+)$/, 'Invalid ticket ID format'),
  })
  .strict();

export type CreateTicketInput = z.infer<typeof createTicketSchema>;
export type UpdateTicketInput = z.infer<typeof updateTicketSchema>;
export type UpdateStatusInput = z.infer<typeof updateStatusSchema>;
export type ReviewTicketInput = z.infer<typeof reviewTicketSchema>;
export type CreateMessageInput = z.infer<typeof createMessageSchema>;
export type TicketQueryInput = z.infer<typeof ticketQuerySchema>;
