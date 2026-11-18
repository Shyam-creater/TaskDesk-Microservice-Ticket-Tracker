import mongoose from 'mongoose';

export async function connectDB(): Promise<typeof mongoose> {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI must be configured in .env');
  }

  try {
    console.log(`📡 Connecting to MongoDB at: ${mongoUri.replace(/:([^@]+)@/, ':****@')}`);
    const conn = await mongoose.connect(mongoUri);
    console.log(`✅ MongoDB connected successfully to database: "${conn.connection.name}"`);
    return conn;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    throw error;
  }
}
