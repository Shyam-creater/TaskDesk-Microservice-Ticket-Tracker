import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { ticketRoutes } from './routes/ticket.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { serviceObservability, ticketMetricsHandler } from './middleware/observability.middleware.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(serviceObservability);

// Observability & Telemetry
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'ticket-service', timestamp: new Date().toISOString() });
});
app.get('/metrics', ticketMetricsHandler);

// Public/Authenticated API Routes (Direct or via Gateway proxy)
app.use('/api/tickets', ticketRoutes);
app.use('/tickets', ticketRoutes);
app.use('/', ticketRoutes);

// Centralized error handler
app.use(errorHandler);
