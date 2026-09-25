import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getGameflipStatus, setGameflipOnline } from '../controllers/gameflip.js';

const router = express.Router();

router.use(requireAuth);

router.get('/gameflip/status', getGameflipStatus);
router.post('/gameflip/online', setGameflipOnline);

export default router;
