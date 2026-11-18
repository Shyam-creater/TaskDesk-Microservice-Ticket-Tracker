import { z } from 'zod';

export const registerSchema = z
  .object({
    name: z
      .string({ required_error: 'Name is required' })
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name cannot exceed 100 characters'),
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Please enter a valid email address'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(8, 'Password must be at least 8 characters long')
      .max(100, 'Password cannot exceed 100 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain at least one uppercase letter, one lowercase letter, and one number'
      ),
    role: z.enum(['user', 'admin']).optional().default('user'),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z
      .string({ required_error: 'Email is required' })
      .trim()
      .toLowerCase()
      .email('Please enter a valid email address'),
    password: z
      .string({ required_error: 'Password is required' })
      .min(1, 'Password is required'),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
