import express from 'express';
import { getListingsHistory, getLogs } from '../controllers/history.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

// Local database logs and history endpoints
router.get('/db/listings', getListingsHistory);
router.get('/db/logs', getLogs);

export default router;
