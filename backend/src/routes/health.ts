import { Router } from 'express';
import mongoose from 'mongoose';

const router = Router();

router.get('/health', (_req, res) => {
  // 1 === connected (mongoose.ConnectionStates.connected)
  const dbConnected = mongoose.connection.readyState === 1;
  res.json({
    ok: true,
    service: 'trip-orchestra',
    db: dbConnected ? 'connected' : 'disconnected',
    time: new Date().toISOString(),
  });
});

export default router;
