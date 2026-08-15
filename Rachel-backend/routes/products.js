import express from 'express';
import { getProducts, saveProduct, getProductImage, deleteProduct, updateProduct, toggleAutoPost, importProduct } from '../controllers/products.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody, saveProductSchema, updateProductSchema, importProductSchema } from '../middleware/validation.js';

const router = express.Router();

// Endpoints de productos en base de datos local
router.get('/db/products', requireAuth, getProducts);
router.post('/db/products', requireAuth, validateBody(saveProductSchema), saveProduct);
router.post('/db/products/import', requireAuth, validateBody(importProductSchema), importProduct);
router.get('/db/products/:id/image', getProductImage); // Desprotegido para redirección y carga directa de imágenes
router.delete('/db/products/:id', requireAuth, deleteProduct);
router.patch('/db/products/:id', requireAuth, validateBody(updateProductSchema), updateProduct);
router.patch('/db/products/:id/autopost', requireAuth, toggleAutoPost);

export default router;
