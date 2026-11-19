import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiRoutes } from './routes/index.js';
import { errorHandler } from './middleware/error.middleware.js';
import { globalLimiter } from './middleware/rateLimiter.middleware.js';
import { correlationAndLogging, metricsHandler } from './middleware/observability.middleware.js';

export const app = express();

// Security Headers & Correlation Tracing
app.use(helmet());
app.use(correlationAndLogging);

// Strict CORS Policy (Restricted to Frontend Origin)
const allowedOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
app.use(
  cors({
    origin: allowedOrigin === '*' ? '*' : allowedOrigin.split(',').map((o) => o.trim()),
    credentials: true,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(globalLimiter);

// Observability & Health endpoints
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Prometheus & JSON Telemetry Metrics endpoint
app.get('/metrics', metricsHandler);
app.get('/api/metrics', metricsHandler);

// API Routes mounted on /api
app.use('/api', apiRoutes);

// Centralized error handler
app.use(errorHandler);
