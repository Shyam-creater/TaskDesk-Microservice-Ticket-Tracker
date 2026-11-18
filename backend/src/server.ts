import { app } from './app.js';
import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import { seedDatabase } from './seed.js';

async function startServer() {
  try {
    await connectDB();
    await seedDatabase();

    const server = app.listen(config.PORT, () => {
      console.log(`🚀 TaskDesk Backend running on http://localhost:${config.PORT}`);
      console.log(`📁 Environment: ${config.NODE_ENV}`);
      console.log(`📡 API Endpoints active at: http://localhost:${config.PORT}/api`);
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
