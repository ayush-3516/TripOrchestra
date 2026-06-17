import mongoose from 'mongoose';
import { config } from './config';

let connecting: Promise<typeof mongoose> | null = null;

/** Connects once and reuses the connection (singleton). Safe to call repeatedly. */
export async function connectDB(): Promise<void> {
  if (mongoose.connection.readyState === 1) return;
  if (!connecting) {
    mongoose.set('strictQuery', true);
    connecting = mongoose.connect(config.mongoUri, {
      serverSelectionTimeoutMS: 10_000,
    });
  }
  await connecting;
  console.log('Connected to MongoDB');
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
  connecting = null;
}
