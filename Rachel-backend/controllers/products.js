import db from '../config/db.js';
import { saveProductImage, deleteProductImage, getProductImageFilePath, getImageContentType } from '../services/image.js';
import crypto from 'crypto';
import axios from 'axios';
import { getAuthHeaders, GAMEFLIP_API_BASE } from '../services/gameflip.js';


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

        if (product.image_path.startsWith('http://') || product.image_path.startsWith('https://')) {
            return res.redirect(product.image_path);
        }

        // Local filesystem fallback
        const filePath = getProductImageFilePath(product.image_path);
        if (!filePath) {
            return res.status(404).json({ error: 'Product image file not found' });
        }
        res.type(getImageContentType(filePath));
        res.sendFile(filePath);
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

export async function importProduct(req, res) {
    try {
        const user = req.user;
        const { url } = req.body;

        // Extract UUID listing ID from the URL or text input
        const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
        const match = url.match(uuidRegex);
        if (!match) {
            return res.status(400).json({ error: 'No valid Gameflip listing ID found in the URL/ID.' });
        }
        const listingId = match[0];

        // Fetch details from Gameflip API
        let headers = {};
        try {
            headers = getAuthHeaders(user);
        } catch (err) {
            console.log('Gameflip credentials not configured, proceeding anonymously');
        }

        let gfListing;
        try {
            const response = await axios.get(`${GAMEFLIP_API_BASE}/listing/${listingId}`, { headers });
            gfListing = response.data.data;
        } catch (apiError) {
            console.error('Gameflip API fetch listing error:', apiError.response?.data || apiError.message);
            const status = apiError.response?.status;
            if (status === 401 || status === 403) {
                return res.status(400).json({
                    error: 'Authentication failed. Please check if the listing is public or ensure your Gameflip account is linked.'
                });
            }
            return res.status(status || 500).json({
                error: `Failed to retrieve listing from Gameflip: ${apiError.response?.data?.error?.message || apiError.message}`
            });
        }

        if (!gfListing) {
            return res.status(404).json({ error: 'Listing data not found.' });
        }

        // Map categories
        let category = 'ingame-item';
        if (gfListing.category === 'GIFTCARD') {
            category = 'giftcard';
        }

        // Get cover photo or fallback
        const coverPhotoId = gfListing.cover_photo;
        let imageUrl = null;
        if (coverPhotoId && gfListing.photo && gfListing.photo[coverPhotoId]) {
            imageUrl = gfListing.photo[coverPhotoId].view_url;
        } else if (gfListing.photo && Object.keys(gfListing.photo).length > 0) {
            const firstPhotoId = Object.keys(gfListing.photo)[0];
            imageUrl = gfListing.photo[firstPhotoId].view_url;
        }

        // Download image to base64
        let imageBase64 = null;
        if (imageUrl) {
            try {
                const imageRes = await axios.get(imageUrl, { responseType: 'arraybuffer' });
                const contentType = imageRes.headers['content-type'] || 'image/jpeg';
                const buffer = Buffer.from(imageRes.data);
                imageBase64 = `data:${contentType};base64,${buffer.toString('base64')}`;
            } catch (imgError) {
                console.error('Error downloading cover photo, passing direct URL to Cloudinary instead:', imgError.message);
                imageBase64 = imageUrl; // Fallback to raw URL, Cloudinary upload function accepts URLs!
            }
        }

        if (!imageBase64) {
            // fallback: 1x1 transparent png
            imageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        }

        // Create new product ID
        const productId = 'prod_' + crypto.randomUUID();

        // Save image to Cloudinary and get URL
        const imagePath = await saveProductImage(productId, imageBase64);

        // Save to SQLite products table
        db.prepare(`
            INSERT INTO products (id, user_id, name, description, price, category, auto_post, image_path, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(
            productId,
            user.id,
            gfListing.name || 'Imported Gameflip Product',
            gfListing.description || '',
            (gfListing.price || 0) / 100,
            category,
            1, // auto_post defaults to 1 (true)
            imagePath
        );

        res.json({
            success: true,
            product: {
                id: productId,
                name: gfListing.name,
                description: gfListing.description,
                price: (gfListing.price || 0) / 100,
                category,
                auto_post: 1,
                image_path: imagePath
            }
        });
    } catch (error) {
        console.error('importProduct error:', error.message);
        res.status(500).json({ error: `Internal server error: ${error.message}` });
    }
}

