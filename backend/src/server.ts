import dotenv from 'dotenv';
import path from 'path';

// Load .env directly
dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { app } from './app.js';
import { connectDB } from './config/db.js';
import { seedDatabase } from './seed.js';

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 4000;
const NODE_ENV = process.env.NODE_ENV || 'development';

async function startServer() {
  try {
    await connectDB();
    await seedDatabase();

    const server = app.listen(PORT, () => {
      console.log(`🚀 TaskDesk Backend running on http://localhost:${PORT}`);
      console.log(`📁 Environment: ${NODE_ENV}`);
      console.log(`📡 API Endpoints active at: http://localhost:${PORT}/api`);
    });

    const shutdown = async () => {
      console.log('Shutting down server gracefully...');
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    console.error('❌ Failed to start TaskDesk Backend server:', error);
    process.exit(1);
  }
}

startServer();
