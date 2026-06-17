import { Router, type Request, type Response, type NextFunction } from 'express';
import mongoose from 'mongoose';
import { RequestModel, toHistoryItem, toRequestDetail } from '../models/request';

const router = Router();

/** GET /api/history?limit=20 — recent requests for the audit trail. */
router.get('/history', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 100);
    const docs = await RequestModel.find().sort({ createdAt: -1 }).limit(limit);
    res.json(docs.map(toHistoryItem));
  } catch (err) {
    next(err);
  }
});

/** GET /api/requests/:id — one request with its full embedded agent-run audit. */
router.get('/requests/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }
    const doc = await RequestModel.findById(id);
    if (!doc) {
      res.status(404).json({ error: 'Request not found' });
      return;
    }
    res.json(toRequestDetail(doc));
  } catch (err) {
    next(err);
  }
});

export default router;
