import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import { authenticator } from 'otplib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { rateLimit } from 'express-rate-limit';
import Database from 'better-sqlite3';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

// ─── DATABASE SETUP ──────────────────────────────────────────────────────────
const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, 'rachel.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}
const db = new Database(dbPath);

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT,
        username TEXT,
        gameflip_api_key_enc TEXT,
        gameflip_totp_secret_enc TEXT,
        created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        category TEXT,
        auto_post INTEGER DEFAULT 0,
        image_path TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS listings (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        product_id TEXT,
        gameflip_id TEXT,
        status TEXT,
        posted_at TEXT DEFAULT (datetime('now')),
        expires_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS agent_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        agent TEXT,
        action TEXT,
        detail TEXT,
        timestamp TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
`);

// Seed default product if empty
try {
    const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    if (productCount === 0) {
        db.prepare(`
            INSERT INTO products (id, name, description, price, category, auto_post)
            VALUES ('seed-prod-1', 'Test Product', 'This is a test product seeded on startup', 1.00, 'ingame-item', 1)
        `).run();
        console.log('Seeded initial test product in SQLite database.');
    }
} catch (err) {
    console.error('Failed to seed default product:', err.message);
}

const uploadsDir = process.env.UPLOADS_DIR || path.join(dbDir, 'product-images');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

try {
    const columns = db.prepare('PRAGMA table_info(products)').all();
    if (!columns.some((col) => col.name === 'image_path')) {
        db.exec('ALTER TABLE products ADD COLUMN image_path TEXT');
    }
} catch (err) {
    console.error('Failed to migrate products table:', err.message);
}

function extensionFromMime(mimeType) {
    const map = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'image/gif': '.gif'
    };
    return map[mimeType] || '.png';
}

function getImageContentType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const map = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.gif': 'image/gif'
    };
    return map[ext] || 'image/png';
}

function saveProductImage(productId, imageData) {
    let base64 = imageData;
    let mimeType = 'image/png';

    const dataUrlMatch = imageData.match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
    if (dataUrlMatch) {
        mimeType = dataUrlMatch[1];
        base64 = dataUrlMatch[2];
    }

    const filename = `${productId}${extensionFromMime(mimeType)}`;
    fs.writeFileSync(path.join(uploadsDir, filename), Buffer.from(base64, 'base64'));
    return filename;
}

function getProductImageFilePath(imagePath) {
    if (!imagePath) return null;
    const fullPath = path.join(uploadsDir, imagePath);
    return fs.existsSync(fullPath) ? fullPath : null;
}

function deleteProductImage(imagePath) {
    const fullPath = getProductImageFilePath(imagePath);
    if (fullPath) {
        fs.unlinkSync(fullPath);
    }
}

function getListingImage(productId) {
    if (productId) {
        const product = db.prepare('SELECT image_path FROM products WHERE id = ?').get(productId);
        const imagePath = getProductImageFilePath(product?.image_path);
        if (imagePath) {
            return {
                buffer: fs.readFileSync(imagePath),
                contentType: getImageContentType(imagePath)
            };
        }
    }

    const fallbackPath = path.resolve(__dirname, 'public/joeswag.png');
    if (fs.existsSync(fallbackPath)) {
        return {
            buffer: fs.readFileSync(fallbackPath),
            contentType: 'image/png'
        };
    }

    return {
        buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64'),
        contentType: 'image/png'
    };
}

// DB helper functions
function logAgent(agent, action, detail = null, userId = null) {
    db.prepare(`
        INSERT INTO agent_logs (user_id, agent, action, detail)
        VALUES (?, ?, ?, ?)
    `).run(userId, agent, action, detail);
}

function saveListing(gameflipId, status, productId = null, userId = null) {
    db.prepare(`
        INSERT OR REPLACE INTO listings (id, user_id, product_id, gameflip_id, status)
        VALUES (?, ?, ?, ?, ?)
    `).run(gameflipId, userId, productId, gameflipId, status);
}

function updateListingStatus(gameflipId, status) {
    db.prepare(`
        UPDATE listings SET status = ? WHERE gameflip_id = ?
    `).run(status, gameflipId);
}

// ─── END DATABASE SETUP ──────────────────────────────────────────────────────

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Apply rate limiter to all API endpoints
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per windowMs
    standardHeaders: 'draft-8', // draft-6, draft-7, draft-8 or true/false
    legacyHeaders: false, // Disable X-RateLimit-* headers
    message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use('/api', limiter);

const PORT = process.env.PORT || 3000;
const GAMEFLIP_API_BASE = 'https://production-gameflip.fingershock.com/api/v1';

const API_KEY = process.env.GAMEFLIP_API_KEY;
const TOTP_SECRET = process.env.GAMEFLIP_TOTP_SECRET;

// Cache for Owner ID
let cachedOwnerId = null;

// Helper to generate Authorization Header
function getAuthHeaders() {
    if (!API_KEY || !TOTP_SECRET) {
        throw new Error('Missing GAMEFLIP_API_KEY or GAMEFLIP_TOTP_SECRET in .env');
    }
    const totp = authenticator.generate(TOTP_SECRET);
    return {
        'Authorization': `GFAPI ${API_KEY}:${totp}`,
        'Content-Type': 'application/json'
    };
}

// Fetch Owner ID dynamically from profile
async function getOwnerId() {
    if (cachedOwnerId) return cachedOwnerId;

    try {
        console.log('Fetching Gameflip profile to get Owner ID...');
        const response = await axios.get(`${GAMEFLIP_API_BASE}/account/me/profile`, {
            headers: getAuthHeaders()
        });
        console.log('Profile Response:', response.data);
        cachedOwnerId = response.data.data.owner || response.data.data.id;
        console.log(`Successfully authenticated! Owner ID: ${cachedOwnerId}`);
        return cachedOwnerId;
    } catch (error) {
        console.error('Error fetching Owner ID from Gameflip:', error.response?.data || error.message);
        throw new Error('Authentication with Gameflip failed. Please check your .env credentials.');
    }
}

// Helper to set listing to draft and then delete it safely
async function deleteListingSafely(id) {
    try {
        console.log(`Setting listing ${id} status to draft...`);
        const patchStatusPayload = [
            { op: "replace", path: "/status", value: "draft" }
        ];
        await axios.patch(`${GAMEFLIP_API_BASE}/listing/${id}`, patchStatusPayload, {
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json-patch+json'
            }
        });
        console.log(`Successfully set listing ${id} status to draft.`);
    } catch (err) {
        // If it was already draft or failed to patch, we log and proceed to delete anyway
        console.warn(`Could not set status to draft for listing ${id}:`, err.response?.data || err.message);
    }

    console.log(`Deleting listing ID: ${id}`);
    const response = await axios.delete(`${GAMEFLIP_API_BASE}/listing/${id}`, {
        headers: getAuthHeaders()
    });

    // Update listing status in DB
    updateListingStatus(id, 'deleted');

    return response.data.data;
}


// Endpoint to test authentication / profile info
app.get('/api/profile', async (req, res) => {
    try {
        const response = await axios.get(`${GAMEFLIP_API_BASE}/account/me/profile`, {
            headers: getAuthHeaders()
        });
        res.json(response.data.data);
    } catch (error) {
        console.error('API profile error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
    }
});

// Create product listing
app.post('/api/listings', async (req, res) => {
    try {
        const ownerId = await getOwnerId();
        const { name, description, price, category, product_id } = req.body;

        // Price in cents
        const priceInCents = Math.round(parseFloat(price) * 100);

        // Build standard Gameflip listing payload
        // Categories mapping or custom fallback
        let gfCategory = 'DIGITAL_INGAME';
        if (category === 'video-dvd') gfCategory = 'DIGITAL_INGAME'; // Gameflip uses specific categories, fallback to digital_ingame or games
        else if (category === 'giftcard') gfCategory = 'GIFTCARD';

        const payload = {
            owner: ownerId,
            name: name,
            description: description,
            price: priceInCents,
            category: gfCategory,
            accept_currency: 'USD',
            shipping_paid_by: 'buyer',
            digital: true,
            digital_deliverable: 'transfer',
            shipping_prepaid: false,
            // Standard listing defaults
            shipping_within_days: 1,
            expire_in_days: 365,
            status: 'draft' // Create as draft first to bypass photo validation
        };

        console.log('Posting new listing to Gameflip (as draft):', payload);
        const response = await axios.post(`${GAMEFLIP_API_BASE}/listing`, payload, {
            headers: getAuthHeaders()
        });

        const listing = response.data.data;
        const listingId = listing.id;
        console.log(`Draft created with ID: ${listingId}. Requesting cover and carousel photo upload URLs...`);

        // Request S3 upload URL for listing photo 1 (Cover)
        const photoResponse1 = await axios.post(`${GAMEFLIP_API_BASE}/listing/${listingId}/photo`, {}, {
            headers: getAuthHeaders()
        });
        const uploadUrl1 = photoResponse1.data.data.upload_url;
        const photoId1 = photoResponse1.data.data.id;

        // Request S3 upload URL for listing photo 2 (Carousel)
        const photoResponse2 = await axios.post(`${GAMEFLIP_API_BASE}/listing/${listingId}/photo`, {}, {
            headers: getAuthHeaders()
        });
        const uploadUrl2 = photoResponse2.data.data.upload_url;
        const photoId2 = photoResponse2.data.data.id;

        const { buffer: listingImageBuffer, contentType: listingImageType } = getListingImage(product_id);

        console.log(`Uploading product image to Gameflip S3 (${listingImageType})...`);
        await Promise.all([
            axios.put(uploadUrl1, listingImageBuffer, {
                headers: {
                    'Content-Type': listingImageType
                }
            }),
            axios.put(uploadUrl2, listingImageBuffer, {
                headers: {
                    'Content-Type': listingImageType
                }
            })
        ]);

        // Step 1: Activate both uploaded photos: one as cover_photo and one as display_order 0
        console.log(`Activating photo ID: ${photoId1} as cover_photo and photo ID: ${photoId2} as carousel order 0...`);
        const patchPhotoPayload = [
            { op: "replace", path: `/photo/${photoId1}/status`, value: "active" },
            { op: "replace", path: "/cover_photo", value: photoId1 },
            { op: "replace", path: `/photo/${photoId2}/status`, value: "active" },
            { op: "replace", path: `/photo/${photoId2}/display_order`, value: 0 }
        ];
        await axios.patch(`${GAMEFLIP_API_BASE}/listing/${listingId}`, patchPhotoPayload, {
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json-patch+json'
            }
        });

        // Step 2: Patch listing status to onsale to make it go live
        console.log('Patching listing status to onsale...');
        const patchStatusPayload = [
            { op: "replace", path: "/status", value: "onsale" }
        ];
        const patchResponse = await axios.patch(`${GAMEFLIP_API_BASE}/listing/${listingId}`, patchStatusPayload, {
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json-patch+json'
            }
        });

        // Save listing to DB
        saveListing(listingId, 'onsale', product_id);
        logAgent('post_listings', 'posted', `Listing ${listingId} created: ${name}`);

        res.json(patchResponse.data.data);
    } catch (error) {
        console.error('API create listing error:', error.response?.data || error.message);
        logAgent('post_listings', 'error', error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
    }
});

// Fetch all listings for owner
app.get('/api/listings', async (req, res) => {
    try {
        const ownerId = await getOwnerId();
        console.log(`Fetching listings for owner: ${ownerId}`);

        // Search user listings
        const response = await axios.get(`${GAMEFLIP_API_BASE}/listing`, {
            params: {
                owner: ownerId,
                limit: 10,
                status: 'draft,ready,onsale' // fetch draft, ready, and onsale listings
            },
            headers: getAuthHeaders()
        });

        res.json(response.data.data);
    } catch (error) {
        console.error('API fetch listings error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
    }
});

// Delete a listing
app.delete('/api/listings/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await deleteListingSafely(id);
        logAgent('post_listings', 'deleted', `Listing ${id} deleted manually`);
        res.json(result);
    } catch (error) {
        console.error('API delete listing error:', error.response?.data || error.message);
        logAgent('post_listings', 'error', error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
    }
});

// Purge Expired Listings (or Draft listings for simplicity/demo)
app.post('/api/purge/expired', async (req, res) => {
    try {
        const ownerId = await getOwnerId();

        logAgent('purge_listings', 'started', 'Purge expired started');

        // Fetch listings
        const listResponse = await axios.get(`${GAMEFLIP_API_BASE}/listing`, {
            params: {
                owner: ownerId,
                status: 'draft,ready', // purge drafts and ready listings for demo
                limit: 50
            },
            headers: getAuthHeaders()
        });

        const listings = listResponse.data.data || [];
        console.log(`Found ${listings.length} draft/expired listings to purge.`);

        let purgeCount = 0;
        for (const item of listings) {
            try {
                await deleteListingSafely(item.id);
                purgeCount++;
            } catch (err) {
                console.error(`Failed to delete listing ${item.id}:`, err.message);
            }
        }

        logAgent('purge_listings', 'completed', `Purged ${purgeCount} expired listings`);
        res.json({ success: true, purged: purgeCount });
    } catch (error) {
        console.error('API purge expired error:', error.response?.data || error.message);
        logAgent('purge_listings', 'error', error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
    }
});

// Purge All Listings
app.post('/api/purge/all', async (req, res) => {
    try {
        const ownerId = await getOwnerId();

        logAgent('purge_listings', 'started', 'Purge all started');

        // Fetch all draft/ready/on_sale listings
        const listResponse = await axios.get(`${GAMEFLIP_API_BASE}/listing`, {
            params: {
                owner: ownerId,
                status: 'draft,ready,onsale',
                limit: 100
            },
            headers: getAuthHeaders()
        });

        const listings = listResponse.data.data || [];
        console.log(`Found ${listings.length} listings to purge all.`);

        let purgeCount = 0;
        for (const item of listings) {
            try {
                await deleteListingSafely(item.id);
                purgeCount++;
            } catch (err) {
                console.error(`Failed to delete listing ${item.id}:`, err.message);
            }
        }

        logAgent('purge_listings', 'completed', `Purged all ${purgeCount} listings`);
        res.json({ success: true, purged: purgeCount });
    } catch (error) {
        console.error('API purge all error:', error.response?.data || error.message);
        logAgent('purge_listings', 'error', error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
    }
});

// ─── DB ENDPOINTS ─────────────────────────────────────────────────────────────

// GET /api/db/products — fetch all products from local DB
app.get('/api/db/products', (req, res) => {
    try {
        const products = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all();
        res.json(products);
    } catch (error) {
        console.error('DB fetch products error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/db/products — save a product to local DB
app.post('/api/db/products', (req, res) => {
    try {
        const { id, name, description, price, category, auto_post, user_id, image } = req.body;

        if (!image) {
            return res.status(400).json({ error: 'Product image is required' });
        }

        const imagePath = saveProductImage(id, image);
        db.prepare(`
            INSERT OR REPLACE INTO products (id, user_id, name, description, price, category, auto_post, image_path, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(id, user_id, name, description, price, category, auto_post ? 1 : 0, imagePath);
        res.json({ success: true, image_path: imagePath });
    } catch (error) {
        console.error('DB save product error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/db/products/:id/image — serve stored product image
app.get('/api/db/products/:id/image', (req, res) => {
    try {
        const { id } = req.params;
        const product = db.prepare('SELECT image_path FROM products WHERE id = ?').get(id);
        const imagePath = getProductImageFilePath(product?.image_path);

        if (!imagePath) {
            return res.status(404).json({ error: 'Product image not found' });
        }

        res.type(getImageContentType(imagePath));
        res.sendFile(imagePath);
    } catch (error) {
        console.error('DB fetch product image error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// DELETE /api/db/products/:id — delete a product from local DB
app.delete('/api/db/products/:id', (req, res) => {
    try {
        const { id } = req.params;
        const deleteProduct = db.transaction((productId) => {
            const product = db.prepare('SELECT image_path FROM products WHERE id = ?').get(productId);
            deleteProductImage(product?.image_path);
            db.prepare('DELETE FROM listings WHERE product_id = ?').run(productId);
            db.prepare('DELETE FROM products WHERE id = ?').run(productId);
        });
        deleteProduct(id);
        res.json({ success: true });
    } catch (error) {
        console.error('DB delete product error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/db/products/:id — update product attributes
app.patch('/api/db/products/:id', (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, price, category, auto_post, image } = req.body;

        const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Product not found' });
        }

        let imagePath = existing.image_path;
        if (image) {
            deleteProductImage(existing.image_path);
            imagePath = saveProductImage(id, image);
        }

        db.prepare(`
            UPDATE products
            SET name = ?, description = ?, price = ?, category = ?, auto_post = ?, image_path = ?, updated_at = datetime('now')
            WHERE id = ?
        `).run(
            name ?? existing.name,
            description ?? existing.description,
            price ?? existing.price,
            category ?? existing.category,
            auto_post ? 1 : 0,
            imagePath,
            id
        );

        res.json({ success: true, image_path: imagePath });
    } catch (error) {
        console.error('DB update product error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/db/products/:id/autopost — update auto_post status of a product
app.patch('/api/db/products/:id/autopost', (req, res) => {
    try {
        const { id } = req.params;
        const { auto_post } = req.body;
        db.prepare('UPDATE products SET auto_post = ?, updated_at = datetime(\'now\') WHERE id = ?')
            .run(auto_post ? 1 : 0, id);
        res.json({ success: true });
    } catch (error) {
        console.error('DB update auto_post error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/db/listings — fetch listing history from local DB
app.get('/api/db/listings', (req, res) => {
    try {
        const listings = db.prepare('SELECT * FROM listings ORDER BY posted_at DESC').all();
        res.json(listings);
    } catch (error) {
        console.error('DB fetch listings error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/db/logs — fetch agent logs from local DB
app.get('/api/db/logs', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const logs = db.prepare('SELECT * FROM agent_logs ORDER BY timestamp DESC LIMIT ?').all(limit);
        res.json(logs);
    } catch (error) {
        console.error('DB fetch logs error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ─── END DB ENDPOINTS ─────────────────────────────────────────────────────────

// Serve built frontend in production (Docker / single-container deploy)
const staticDir = process.env.STATIC_DIR || path.resolve(__dirname, 'public');
if (fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.get(/^(?!\/api).*/, (_req, res) => {
        res.sendFile(path.join(staticDir, 'index.html'));
    });
}

// Start Server
app.listen(PORT, '0.0.0.0', async () => {
    console.log(`Rachel Gameflip proxy server running on http://localhost:${PORT}`);
    // Validate authentication at start
    try {
        await getOwnerId();
    } catch (e) {
        console.warn('WARNING: Initial connection verification failed. Make sure your GAMEFLIP_API_KEY and GAMEFLIP_TOTP_SECRET are valid.');
    }
});