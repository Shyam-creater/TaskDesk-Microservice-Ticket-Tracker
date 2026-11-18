import mongoose from 'mongoose';

const DEFAULT_MONGO_URI =
  'mongodb+srv://TASKDESK:SMAA5VZfA7rzR9qA@cluster0.rfz95.mongodb.net/TASKDESK?retryWrites=true&w=majority';

export async function connectDB(): Promise<typeof mongoose> {
  const mongoUri = process.env.MONGODB_URI || DEFAULT_MONGO_URI;
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
