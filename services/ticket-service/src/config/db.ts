import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  const maskedUri = uri.replace(/\/\/[^:]+:[^@]+@/, '//****:****@');
  console.log(`📡 [ticket-service] Connecting to MongoDB: ${maskedUri} (db: taskdesk_tickets)`);

  await mongoose.connect(uri, {
    dbName: 'taskdesk_tickets',
  });

  console.log('✅ [ticket-service] MongoDB connected successfully to database: "taskdesk_tickets"');
}
