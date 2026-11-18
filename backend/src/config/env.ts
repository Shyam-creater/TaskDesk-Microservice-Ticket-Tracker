import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const envSchema = z.object({
  PORT: z.coerce.number().default(4000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  MONGODB_URI: z
    .string()
    .default('mongodb+srv://TASKDESK:SMAA5VZfA7rzR9qA@cluster0.rfz95.mongodb.net/TASKDESK?retryWrites=true&w=majority'),
  JWT_SECRET: z
    .string()
    .min(16)
    .default('supersecret_jwt_signing_key_at_least_32_characters_long_for_security'),
  CORS_ORIGIN: z.string().default('*'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid backend environment configuration:', parsed.error.format());
  throw new Error('Invalid environment configuration');
}

export const config = parsed.data;
