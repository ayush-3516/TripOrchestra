import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import express from 'express';
import cors from 'cors';
import { config } from './config';
import { connectDB } from './db';
import healthRouter from './routes/health';
import planRouter from './routes/plan';
import historyRouter from './routes/history';
import { errorHandler, notFound } from './middleware/error';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// In the Docker image the built SPA lives at /app/frontend/dist.
const FRONTEND_DIST = path.resolve(__dirname, '../../frontend/dist');

export function createApp() {
  const app = express();

  app.use(
    cors(config.corsOrigins.length ? { origin: config.corsOrigins } : undefined),
  );
  app.use(express.json({ limit: '256kb' }));

  app.use('/api', healthRouter);
  app.use('/api', planRouter);
  app.use('/api', historyRouter);

  // In production, serve the built frontend from the same container (single
  // Railway service). In dev the Vite server serves it and proxies /api here.
  if (config.nodeEnv === 'production' && existsSync(FRONTEND_DIST)) {
    app.use(express.static(FRONTEND_DIST));
    // SPA fallback: any non-API GET returns index.html.
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
      res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
    });
  }

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

// Vercel invokes the module's default export as its serverless function. Express
// apps are request handlers, so the app itself is the correct export shape.
// Creating it once also lets a warm serverless instance reuse the router setup.
const app = createApp();

export default app;

async function main() {
  // Connect to Mongo up front, but don't let a DB outage stop the server from
  // booting — health then reports "disconnected" and plan calls fail loudly.
  try {
    await connectDB();
  } catch (err) {
    console.error(
      '[startup] MongoDB connection failed — continuing so /api/health is reachable:',
      err instanceof Error ? err.message : err,
    );
  }

  app.listen(config.port, () => {
    console.log(`TripOrchestra API listening on http://localhost:${config.port}`);
  });
}

if (process.env.VERCEL) {
  // Do not call listen() in a Vercel function. Start connecting during cold
  // start; connectDB is a singleton, so warm invocations reuse the connection.
  connectDB().catch((err) => {
    console.error(
      '[startup] MongoDB connection failed — continuing so /api/health is reachable:',
      err instanceof Error ? err.message : err,
    );
  });
} else {
  main().catch((err) => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}
