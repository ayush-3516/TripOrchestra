import type { NextFunction, Request, Response } from 'express';

/** An error with an associated HTTP status. */
export class AppError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.name = 'AppError';
    this.status = status;
  }
}

export function notFound(_req: Request, res: Response): void {
  res.status(404).json({ error: 'Not found' });
}

/**
 * Centralised error handler. Never lets a raw 500 with no body escape —
 * always returns { error: string } so the frontend has something to show.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status = err instanceof AppError ? err.status : 500;
  const message =
    err instanceof Error ? err.message : 'Unexpected server error';
  console.error('[error]', message);
  if (res.headersSent) return;
  res.status(status).json({ error: message });
}
