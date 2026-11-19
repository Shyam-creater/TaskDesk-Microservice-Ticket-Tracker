import dotenv from 'dotenv';
import path from 'path';

// Load root .env
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

import { app } from './app.js';
import { connectDB } from './config/db.js';

const PORT = process.env.TICKET_SERVICE_PORT ? parseInt(process.env.TICKET_SERVICE_PORT, 10) : 4002;

async function startServer() {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`🚀 TaskDesk Ticket Service running on http://localhost:${PORT}`);
      console.log(`📡 Endpoints: /api/tickets, /metrics, /health`);
    });

    const shutdown = () => {
      console.log('Shutting down Ticket Service gracefully...');
      server.close(() => {
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('❌ Failed to start Ticket Service:', error);
    process.exit(1);
  }
}

startServer();
