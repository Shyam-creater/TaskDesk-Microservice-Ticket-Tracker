import dotenv from 'dotenv';
import path from 'path';

// Load root .env
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { app } from './app.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;

const server = app.listen(PORT, () => {
  console.log(`🚀 TaskDesk API Gateway running on http://localhost:${PORT}`);
  console.log(`📡 Ingress routing: /api/auth -> :4001, /api/tickets -> :4002, /api/notifications -> :4003`);
});

const shutdown = () => {
  console.log('Shutting down API Gateway gracefully...');
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
