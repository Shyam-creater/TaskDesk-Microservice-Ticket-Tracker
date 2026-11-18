import mongoose from 'mongoose';
import { config } from './env.js';

export async function connectDB(): Promise<typeof mongoose> {
  try {
    console.log(`📡 Connecting to MongoDB at: ${config.MONGODB_URI.replace(/:([^@]+)@/, ':****@')}`);
    const conn = await mongoose.connect(config.MONGODB_URI);
    console.log(`✅ MongoDB connected successfully to database: "${conn.connection.name}"`);
    return conn;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    throw error;
  }
}
