import express from 'express';
import { getProducts, saveProduct, getProductImage, deleteProduct, updateProduct, toggleAutoPost, importProduct } from '../controllers/products.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, saveProductSchema, updateProductSchema, importProductSchema } from '../middleware/validation.js';

const router = express.Router();

// Product endpoints in local database
router.get('/db/products', requireAuth, getProducts);
router.post('/db/products', requireAuth, validateBody(saveProductSchema), saveProduct);
router.post('/db/products/import', requireAuth, validateBody(importProductSchema), importProduct);
router.get('/db/products/:id/image', getProductImage); // Public for direct image loading and redirects
router.delete('/db/products/:id', requireAuth, deleteProduct);
router.patch('/db/products/:id', requireAuth, validateBody(updateProductSchema), updateProduct);
router.patch('/db/products/:id/autopost', requireAuth, toggleAutoPost);

export default router;
