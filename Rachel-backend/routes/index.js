import express from 'express';
import authRoutes from './auth.js';
import listingsRoutes from './listings.js';
import productsRoutes from './products.js';
import historyRoutes from './history.js';
import settingsRoutes from './settings.js';
import gameflipRoutes from './gameflip.js';

const router = express.Router();

// Register route submodules on main router
router.use('/auth', authRoutes);
router.use('/', listingsRoutes); // Mounts /listings, /purge/expired, /purge/all
router.use('/', productsRoutes); // Mounts /db/products, /db/products/:id/image, etc.
router.use('/', historyRoutes);  // Mounts /db/listings, /db/logs
router.use('/', settingsRoutes); // Mounts /settings
router.use('/', gameflipRoutes); // Mounts /gameflip/status, /gameflip/online

export default router;
