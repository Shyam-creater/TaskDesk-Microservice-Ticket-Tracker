import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { notificationRoutes, internalNotificationRoutes } from './routes/notification.routes.js';
import { errorHandler } from './middleware/error.middleware.js';
import { serviceObservability, notificationMetricsHandler } from './middleware/observability.middleware.js';

export const app = express();

app.use(helmet());
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '1mb' }));
app.use(serviceObservability);

// Observability & Telemetry
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'notification-service', timestamp: new Date().toISOString() });
});
app.get('/metrics', notificationMetricsHandler);

// Internal Inter-Service Endpoints
app.use('/internal', internalNotificationRoutes);

// Public/Authenticated API Routes (Direct or via Gateway proxy)
app.use('/api/notifications', notificationRoutes);
app.use('/notifications', notificationRoutes);
app.use('/', notificationRoutes);

// Centralized error handler
app.use(errorHandler);
