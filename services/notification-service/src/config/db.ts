import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  const maskedUri = uri.replace(/\/\/[^:]+:[^@]+@/, '//****:****@');
  console.log(`📡 [notification-service] Connecting to MongoDB: ${maskedUri} (db: taskdesk_notifications)`);

  await mongoose.connect(uri, {
    dbName: 'taskdesk_notifications',
  });

  console.log('✅ [notification-service] MongoDB connected successfully to database: "taskdesk_notifications"');
}
