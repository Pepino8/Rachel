import express from 'express';
import { getSettings, updateSettings } from '../controllers/settings.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

router.get('/settings', getSettings);
router.post('/settings', updateSettings);

export default router;
