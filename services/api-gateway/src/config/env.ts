import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  JWT_SECRET: z.string().min(16).default('supersecret_jwt_signing_key_at_least_32_characters_long_for_security'),
  AUTH_SERVICE_URL: z.string().default('http://localhost:4001'),
  TICKET_SERVICE_URL: z.string().default('http://localhost:4002'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().default('http://localhost:4318/v1/traces'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  // eslint-disable-next-line no-console
  console.error('Invalid environment variables in api-gateway:', parsedEnv.error.format());
  throw new Error('Invalid environment configuration');
}

export const config = parsedEnv.data;
export type Config = z.infer<typeof envSchema>;
