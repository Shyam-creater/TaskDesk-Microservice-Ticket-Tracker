import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { authRoutes, internalAuthRoutes } from './routes/auth.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { serviceObservability, authMetricsHandler } from './middleware/observability.middleware.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(serviceObservability);

// Observability & Telemetry
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'auth-service', timestamp: new Date().toISOString() });
});
app.get('/metrics', authMetricsHandler);

// Internal Inter-Service Endpoints
app.use('/internal', internalAuthRoutes);

// Public & Protected API Routes (Direct or via Gateway proxy)
app.use('/api/auth', authRoutes);
app.use('/auth', authRoutes);
app.use('/', authRoutes);

// Centralized error handler
app.use(errorHandler);
