import express from 'express';
import authRoutes from './auth.js';
import listingsRoutes from './listings.js';
import productsRoutes from './products.js';
import historyRoutes from './history.js';

const router = express.Router();

// Registro de submódulos de rutas en el router principal
router.use('/auth', authRoutes);
router.use('/', listingsRoutes); // Monta /listings, /purge/expired, /purge/all
router.use('/', productsRoutes); // Monta /db/products, /db/products/:id/image, etc.
router.use('/', historyRoutes);  // Monta /db/listings, /db/logs

export default router;
