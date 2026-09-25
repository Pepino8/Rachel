import db from '../config/db.js';
import { saveProductImage, deleteProductImage, getProductImageFilePath, getImageContentType } from '../services/image.js';
import crypto from 'crypto';
import axios from 'axios';
import { getAuthHeaders, GAMEFLIP_API_BASE } from '../services/gameflip.js';

export async function getProducts(req, res) {
    try {
        const user = req.user;
        let query = db.from('products').select('*').order('created_at', { ascending: false });

        if (user.id === 'admin') {
            query = query.or(`user_id.eq.${user.id},user_id.is.null`);
        } else {
            query = query.eq('user_id', user.id);
        }

        const { data: products, error } = await query;
        if (error) {
            console.error('DB fetch products error:', error.message);
            return res.status(500).json({ error: 'Error al obtener inventario' });
        }
        res.json(products || []);
    } catch (error) {
        console.error('DB fetch products error:', error.message);
        res.status(500).json({ error: 'Error al obtener inventario' });
    }
}

export async function saveProduct(req, res) {
    try {
        const user = req.user;
        const { id, name, description, price, category, auto_post, image, game, game_mode, game_category } = req.body;

        const imagePath = await saveProductImage(id, image);

        let finalDescription = (description || '').trim();
        if (game) {
            const tags = [`Game: ${game}`];
            if (game === 'Fortnite') {
                if (game_mode) tags.push(`Mode: ${game_mode}`);
                if (game_category) tags.push(`Type: ${game_category}`);
            }
            const tagHeader = `[${tags.join(' | ')}]`;
            if (!finalDescription.includes(tagHeader)) {
                finalDescription = `${tagHeader}\n${finalDescription}`.trim();
            }
        }

        const { error } = await db.from('products').upsert({
            id,
            user_id: user.id,
            name,
            description: finalDescription,
            price: parseFloat(price),
            category,
            auto_post: auto_post ? 1 : 0,
            image_path: imagePath,
            updated_at: new Date().toISOString()
        });

        if (error) {
            console.error('DB save product error:', error.message);
            return res.status(500).json({ error: 'Error al guardar producto' });
        }

        res.json({ success: true, image_path: imagePath });
    } catch (error) {
        console.error('DB save product error:', error.message);
        res.status(500).json({ error: 'Error al guardar producto' });
    }
}

export async function getProductImage(req, res) {
    try {
        const { id } = req.params;
        const { data: product, error } = await db
            .from('products')
            .select('image_path')
            .eq('id', id)
            .maybeSingle();

        if (error || !product?.image_path) {
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

export async function deleteProduct(req, res) {
    try {
        const user = req.user;
        const { id } = req.params;

        let query = db.from('products').select('image_path').eq('id', id);
        if (user.id !== 'admin') {
            query = query.eq('user_id', user.id);
        }
        const { data: product } = await query.maybeSingle();

        if (product) {
            deleteProductImage(product.image_path);
            await db.from('listings').delete().eq('product_id', id);

            let deleteQuery = db.from('products').delete().eq('id', id);
            if (user.id !== 'admin') {
                deleteQuery = deleteQuery.eq('user_id', user.id);
            }
            await deleteQuery;
        }

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

        let checkQuery = db.from('products').select('*').eq('id', id);
        if (user.id !== 'admin') {
            checkQuery = checkQuery.eq('user_id', user.id);
        }
        const { data: existing, error: checkErr } = await checkQuery.maybeSingle();

        if (checkErr || !existing) {
            return res.status(404).json({ error: 'Product not found' });
        }

        let imagePath = existing.image_path;
        if (image) {
            deleteProductImage(existing.image_path);
            imagePath = await saveProductImage(id, image);
        }

        const updates = {
            name: name ?? existing.name,
            description: description ?? existing.description,
            price: price !== undefined ? parseFloat(price) : existing.price,
            category: category ?? existing.category,
            auto_post: auto_post !== undefined ? (auto_post ? 1 : 0) : existing.auto_post,
            image_path: imagePath,
            updated_at: new Date().toISOString()
        };

        let updateQuery = db.from('products').update(updates).eq('id', id);
        if (user.id !== 'admin') {
            updateQuery = updateQuery.eq('user_id', user.id);
        }
        const { error: updateErr } = await updateQuery;

        if (updateErr) {
            console.error('DB update product error:', updateErr.message);
            return res.status(500).json({ error: 'Error al actualizar producto' });
        }

        res.json({ success: true, image_path: imagePath });
    } catch (error) {
        console.error('DB update product error:', error.message);
        res.status(500).json({ error: 'Error al actualizar producto' });
    }
}

export async function toggleAutoPost(req, res) {
    try {
        const user = req.user;
        const { id } = req.params;
        const { auto_post } = req.body;

        let query = db.from('products').update({
            auto_post: auto_post ? 1 : 0,
            updated_at: new Date().toISOString()
        }).eq('id', id);

        if (user.id !== 'admin') {
            query = query.eq('user_id', user.id);
        }
        const { error } = await query;

        if (error) {
            console.error('DB update auto_post error:', error.message);
            return res.status(500).json({ error: 'Error al actualizar estado auto-post' });
        }

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
                imageBase64 = imageUrl;
            }
        }

        if (!imageBase64) {
            imageBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
        }

        // Create new product ID
        const productId = 'prod_' + crypto.randomUUID();

        // Save image to Cloudinary and get URL
        const imagePath = await saveProductImage(productId, imageBase64);

        // Save to Supabase products table
        const { error: insertErr } = await db.from('products').insert({
            id: productId,
            user_id: user.id,
            name: gfListing.name || 'Imported Gameflip Product',
            description: gfListing.description || '',
            price: (gfListing.price || 0) / 100,
            category,
            auto_post: 1,
            image_path: imagePath,
            updated_at: new Date().toISOString()
        });

        if (insertErr) {
            console.error('importProduct DB insert error:', insertErr.message);
            return res.status(500).json({ error: 'Error al registrar producto importado' });
        }

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
