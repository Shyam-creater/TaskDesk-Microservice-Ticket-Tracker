import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not defined in environment variables');
  }

  const maskedUri = uri.replace(/\/\/[^:]+:[^@]+@/, '//****:****@');
  console.log(`📡 [auth-service] Connecting to MongoDB: ${maskedUri} (db: taskdesk_auth)`);

  await mongoose.connect(uri, {
    dbName: 'taskdesk_auth',
  });

  console.log('✅ [auth-service] MongoDB connected successfully to database: "taskdesk_auth"');
}
