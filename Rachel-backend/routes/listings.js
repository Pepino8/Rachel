import express from 'express';
import { createListing, getListings, deleteListing, purgeExpired, purgeAll } from '../controllers/listings.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, createListingSchema } from '../middleware/validation.js';

const router = express.Router();

router.use(requireAuth);

// Endpoints de listados de Gameflip
router.post('/listings', validateBody(createListingSchema), createListing);
router.get('/listings', getListings);
router.delete('/listings/:id', deleteListing);

// Endpoints de purga de listados de Gameflip
router.post('/purge/expired', purgeExpired);
router.post('/purge/all', purgeAll);

export default router;
