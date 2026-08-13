import express from 'express';
import { getListingsHistory, getLogs } from '../controllers/history.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

// Endpoints de logs e historial en la base de datos local
router.get('/db/listings', getListingsHistory);
router.get('/db/logs', getLogs);

export default router;
