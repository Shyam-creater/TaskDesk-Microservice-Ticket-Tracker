import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { apiRoutes } from './routes/index.js';
import { errorHandler } from './middleware/error.middleware.js';
import { globalLimiter } from './middleware/rateLimiter.middleware.js';

export const app = express();

app.use(helmet());
app.use(
  cors({
    origin: '*',
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(globalLimiter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes mounted on /api
app.use('/api', apiRoutes);

// Centralized error handler
app.use(errorHandler);
