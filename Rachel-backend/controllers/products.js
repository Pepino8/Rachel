import db from '../config/db.js';
import { saveProductImage, saveProductImages, deleteProductImage, getProductImageFilePath, getImageContentType } from '../services/image.js';
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
            return res.status(500).json({ error: 'Failed to fetch inventory' });
        }
        res.json(products || []);
    } catch (error) {
        console.error('DB fetch products error:', error.message);
        res.status(500).json({ error: 'Failed to fetch inventory' });
    }
}

export async function saveProduct(req, res) {
    try {
        const user = req.user;
        const { id, name, description, price, category, auto_post, image, images, game, game_mode, game_category, shipping_within_days } = req.body;

        let imagePath = null;
        let imagePaths = [];
        if (Array.isArray(images) && images.length > 0) {
            imagePaths = await saveProductImages(id, images);
            imagePath = imagePaths[0] || null;
        } else if (image) {
            imagePath = await saveProductImage(id, image, 0);
            imagePaths = [imagePath];
        }

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

        const deliveryDays = Number(shipping_within_days) >= 1 && Number(shipping_within_days) <= 3
            ? parseInt(shipping_within_days, 10)
            : 1;

        const productData = {
            id,
            user_id: user.id,
            name,
            description: finalDescription,
            price: parseFloat(price),
            category,
            auto_post: auto_post ? 1 : 0,
            image_path: imagePath,
            image_paths: imagePaths,
            shipping_within_days: deliveryDays,
            updated_at: new Date().toISOString()
        };

        let { error } = await db.from('products').upsert(productData);

        if (error && error.message && (error.message.includes('shipping_within_days') || error.message.includes('image_paths'))) {
            console.warn('⚠️ Column not found in Supabase. Saving without newer fields temporarily:', error.message);
            if (error.message.includes('shipping_within_days')) delete productData.shipping_within_days;
            if (error.message.includes('image_paths')) delete productData.image_paths;
            const retry = await db.from('products').upsert(productData);
            error = retry.error;
        }

        if (error) {
            console.error('DB save product error:', error.message);
            return res.status(500).json({ error: 'Failed to save product' });
        }

        res.json({
            success: true,
            image_path: imagePath,
            image_paths: imagePaths,
            shipping_within_days: deliveryDays
        });
    } catch (error) {
        console.error('DB save product error:', error.message);
        res.status(500).json({ error: 'Failed to save product' });
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
        res.status(500).json({ error: 'Failed to get product image' });
    }
}

export async function deleteProduct(req, res) {
    try {
        const user = req.user;
        const { id } = req.params;

        let query = db.from('products').select('image_path, image_paths').eq('id', id);
        if (user.id !== 'admin') {
            query = query.eq('user_id', user.id);
        }
        const { data: product } = await query.maybeSingle();

        if (product) {
            deleteProductImage(product.image_paths || product.image_path);
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
        res.status(500).json({ error: 'Failed to delete product' });
    }
}

export async function updateProduct(req, res) {
    try {
        const user = req.user;
        const { id } = req.params;
        const { name, description, price, category, auto_post, image, images, shipping_within_days } = req.body;

        let checkQuery = db.from('products').select('*').eq('id', id);
        if (user.id !== 'admin') {
            checkQuery = checkQuery.eq('user_id', user.id);
        }
        const { data: existing, error: checkErr } = await checkQuery.maybeSingle();

        if (checkErr || !existing) {
            return res.status(404).json({ error: 'Product not found' });
        }

        let imagePath = existing.image_path;
        let imagePaths = existing.image_paths || (existing.image_path ? [existing.image_path] : []);

        if (Array.isArray(images) && images.length > 0) {
            imagePaths = await saveProductImages(id, images);
            imagePath = imagePaths[0] || null;
        } else if (image) {
            deleteProductImage(existing.image_paths || existing.image_path);
            imagePath = await saveProductImage(id, image, 0);
            imagePaths = [imagePath];
        }

        const deliveryDays = shipping_within_days !== undefined
            ? (Number(shipping_within_days) >= 1 && Number(shipping_within_days) <= 3 ? parseInt(shipping_within_days, 10) : 1)
            : (existing.shipping_within_days || 1);

        const updates = {
            name: name ?? existing.name,
            description: description ?? existing.description,
            price: price !== undefined ? parseFloat(price) : existing.price,
            category: category ?? existing.category,
            auto_post: auto_post !== undefined ? (auto_post ? 1 : 0) : existing.auto_post,
            image_path: imagePath,
            image_paths: imagePaths,
            shipping_within_days: deliveryDays,
            updated_at: new Date().toISOString()
        };

        let updateQuery = db.from('products').update(updates).eq('id', id);
        if (user.id !== 'admin') {
            updateQuery = updateQuery.eq('user_id', user.id);
        }
        let { error: updateErr } = await updateQuery;

        if (updateErr && updateErr.message && (updateErr.message.includes('image_paths') || updateErr.message.includes('shipping_within_days'))) {
            console.warn('⚠️ Column not found in Supabase. Updating without newer fields temporarily:', updateErr.message);
            if (updateErr.message.includes('image_paths')) delete updates.image_paths;
            if (updateErr.message.includes('shipping_within_days')) delete updates.shipping_within_days;
            let retryQuery = db.from('products').update(updates).eq('id', id);
            if (user.id !== 'admin') {
                retryQuery = retryQuery.eq('user_id', user.id);
            }
            const retryRes = await retryQuery;
            updateErr = retryRes.error;
        }

        if (updateErr) {
            console.error('DB update product error:', updateErr.message);
            return res.status(500).json({ error: 'Failed to update product' });
        }

        res.json({
            success: true,
            image_path: imagePath,
            image_paths: imagePaths,
            shipping_within_days: deliveryDays
        });
    } catch (error) {
        console.error('DB update product error:', error.message);
        res.status(500).json({ error: 'Failed to update product' });
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
            return res.status(500).json({ error: 'Failed to update auto-post status' });
        }

        res.json({ success: true });
    } catch (error) {
        console.error('DB update auto_post error:', error.message);
        res.status(500).json({ error: 'Failed to update auto-post status' });
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

        // Download all photos from Gameflip listing
        const photoEntries = Object.entries(gfListing.photo || {});
        const coverPhotoId = gfListing.cover_photo;
        if (coverPhotoId) {
            photoEntries.sort(([idA], [idB]) => (idA === coverPhotoId ? -1 : idB === coverPhotoId ? 1 : 0));
        }

        const imagesToSave = [];
        for (const [pId, pData] of photoEntries) {
            if (pData?.view_url) {
                try {
                    const imageRes = await axios.get(pData.view_url, { responseType: 'arraybuffer' });
                    const contentType = imageRes.headers['content-type'] || 'image/jpeg';
                    const buffer = Buffer.from(imageRes.data);
                    imagesToSave.push(`data:${contentType};base64,${buffer.toString('base64')}`);
                } catch (imgError) {
                    console.error('Error downloading listing photo, passing direct URL:', imgError.message);
                    imagesToSave.push(pData.view_url);
                }
            }
        }

        if (imagesToSave.length === 0) {
            imagesToSave.push('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=');
        }

        let shippingWithinDays = parseInt(gfListing.shipping_within_days, 10);
        if (isNaN(shippingWithinDays) || shippingWithinDays < 1 || shippingWithinDays > 3) {
            shippingWithinDays = 1;
        }

        // Create new product ID
        const productId = 'prod_' + crypto.randomUUID();

        // Save images to Cloudinary and get URLs
        const savedImagePaths = await saveProductImages(productId, imagesToSave);
        const primaryImagePath = savedImagePaths[0] || null;

        // Save to Supabase products table
        const productPayload = {
            id: productId,
            user_id: user.id,
            name: gfListing.name || 'Imported Gameflip Product',
            description: gfListing.description || '',
            price: (gfListing.price || 0) / 100,
            category,
            auto_post: 1,
            image_path: primaryImagePath,
            image_paths: savedImagePaths,
            shipping_within_days: shippingWithinDays,
            updated_at: new Date().toISOString()
        };

        let { error: insertErr } = await db.from('products').insert(productPayload);

        if (insertErr && insertErr.message && (insertErr.message.includes('image_paths') || insertErr.message.includes('shipping_within_days'))) {
            console.warn('⚠️ Column not found in Supabase. Inserting without newer fields temporarily:', insertErr.message);
            if (insertErr.message.includes('image_paths')) delete productPayload.image_paths;
            if (insertErr.message.includes('shipping_within_days')) delete productPayload.shipping_within_days;
            const retry = await db.from('products').insert(productPayload);
            insertErr = retry.error;
        }

        if (insertErr) {
            console.error('importProduct DB insert error:', insertErr.message);
            return res.status(500).json({ error: 'Failed to register imported product' });
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
                image_path: primaryImagePath,
                image_paths: savedImagePaths,
                shipping_within_days: shippingWithinDays
            }
        });
    } catch (error) {
        console.error('importProduct error:', error.message);
        res.status(500).json({ error: `Internal server error: ${error.message}` });
    }
}
