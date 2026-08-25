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
  try {
    await connecting;
    console.log('Connected to MongoDB');
  } catch (err) {
    // A rejected promise must not be retained. Serverless instances can outlive
    // a temporary Atlas/network failure, and later requests should be able to
    // establish a fresh connection.
    connecting = null;
    throw err;
  }
}

export async function disconnectDB(): Promise<void> {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.disconnect();
  connecting = null;
}
