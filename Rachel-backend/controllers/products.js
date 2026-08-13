import db from '../config/db.js';
import { saveProductImage, deleteProductImage } from '../services/image.js';

export function getProducts(req, res) {
    try {
        const user = req.user;
        const products = db.prepare('SELECT * FROM products WHERE user_id = ? ORDER BY created_at DESC').all(user.id);
        res.json(products);
    } catch (error) {
        console.error('DB fetch products error:', error.message);
        res.status(500).json({ error: 'Error al obtener inventario' });
    }
}

export async function saveProduct(req, res) {
    try {
        const user = req.user;
        const { id, name, description, price, category, auto_post, image } = req.body;

        const imagePath = await saveProductImage(id, image);
        db.prepare(`
            INSERT OR REPLACE INTO products (id, user_id, name, description, price, category, auto_post, image_path, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(id, user.id, name, description, price, category, auto_post ? 1 : 0, imagePath);

        res.json({ success: true, image_path: imagePath });
    } catch (error) {
        console.error('DB save product error:', error.message);
        res.status(500).json({ error: 'Error al guardar producto' });
    }
}

export function getProductImage(req, res) {
    try {
        const { id } = req.params;
        const product = db.prepare('SELECT image_path FROM products WHERE id = ?').get(id);
        if (!product?.image_path) {
            return res.status(404).json({ error: 'Product image not found' });
        }
        res.redirect(product.image_path);
    } catch (error) {
        console.error('DB fetch product image error:', error.message);
        res.status(500).json({ error: 'Error al obtener imagen' });
    }
}

export function deleteProduct(req, res) {
    try {
        const user = req.user;
        const { id } = req.params;

        const deleteProductTx = db.transaction((productId) => {
            const product = db.prepare('SELECT image_path FROM products WHERE id = ? AND user_id = ?').get(productId, user.id);
            if (product) {
                deleteProductImage(product.image_path);
                db.prepare('DELETE FROM listings WHERE product_id = ?').run(productId);
                db.prepare('DELETE FROM products WHERE id = ? AND user_id = ?').run(productId, user.id);
            }
        });
        deleteProductTx(id);

        res.json({ success: true });
    } catch (error) {
        console.error('DB delete product error:', error.message);
        res.status(500).json({ error: 'Error al eliminar producto' });
    }
}

export async function updateProduct(req, res) {
    try {
        const user = req.user;
        const { id } = req.params;
        const { name, description, price, category, auto_post, image } = req.body;

        const existing = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?').get(id, user.id);
        if (!existing) {
            return res.status(404).json({ error: 'Product not found' });
        }

        let imagePath = existing.image_path;
        if (image) {
            deleteProductImage(existing.image_path);
            imagePath = await saveProductImage(id, image);
        }

        db.prepare(`
            UPDATE products
            SET name = ?, description = ?, price = ?, category = ?, auto_post = ?, image_path = ?, updated_at = datetime('now')
            WHERE id = ? AND user_id = ?
        `).run(
            name ?? existing.name,
            description ?? existing.description,
            price ?? existing.price,
            category ?? existing.category,
            auto_post !== undefined ? (auto_post ? 1 : 0) : existing.auto_post,
            imagePath,
            id,
            user.id
        );

        res.json({ success: true, image_path: imagePath });
    } catch (error) {
        console.error('DB update product error:', error.message);
        res.status(500).json({ error: 'Error al actualizar producto' });
    }
}

export function toggleAutoPost(req, res) {
    try {
        const user = req.user;
        const { id } = req.params;
        const { auto_post } = req.body;

        db.prepare('UPDATE products SET auto_post = ?, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?')
            .run(auto_post ? 1 : 0, id, user.id);

        res.json({ success: true });
    } catch (error) {
        console.error('DB update auto_post error:', error.message);
        res.status(500).json({ error: 'Error al actualizar estado auto-post' });
    }
}
