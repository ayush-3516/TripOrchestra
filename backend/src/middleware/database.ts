import type { NextFunction, Request, Response } from 'express';
import { connectDB } from '../db';
import { AppError } from './error';

/**
 * Ensures database-backed endpoints do not issue buffered Mongoose operations
 * while Atlas is unavailable. Health remains independent of this middleware.
 */
export async function requireDatabase(
  _req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error(
      '[database] Connection unavailable:',
      err instanceof Error ? err.message : err,
    );
    next(new AppError('Database is temporarily unavailable. Please try again shortly.', 503));
  }
}
