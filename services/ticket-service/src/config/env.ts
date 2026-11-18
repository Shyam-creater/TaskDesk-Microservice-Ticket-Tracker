import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load local and root .env
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const resolveMongoUri = (): string => {
  if (process.env.TICKET_MONGO_URI) return process.env.TICKET_MONGO_URI;
  if (process.env.MONGO_URI) return process.env.MONGO_URI;
  if (process.env.MONGODB_URI) {
    const uri = process.env.MONGODB_URI;
    return uri.replace(/\/[^/?]+(\?|$)/, '/ticket_db$1');
  }
  return 'mongodb://localhost:27017/ticket_db';
};

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4002),
  MONGO_URI: z.string().default(resolveMongoUri()),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters long').default('supersecret_jwt_signing_key_at_least_32_characters_long_for_security'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().default('http://localhost:4318/v1/traces'),
  CORS_ORIGIN: z.string().default('*'),
});

const parsedEnv = envSchema.safeParse({
  ...process.env,
  MONGO_URI: process.env.MONGO_URI || process.env.TICKET_MONGO_URI || resolveMongoUri(),
});

if (!parsedEnv.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment variables in ticket-service:', parsedEnv.error.format());
  throw new Error('Invalid environment configuration');
}

export const config = parsedEnv.data;
export type Config = z.infer<typeof envSchema>;
