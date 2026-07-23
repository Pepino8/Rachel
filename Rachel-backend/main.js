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

try {
    const columns = db.prepare('PRAGMA table_info(users)').all();
    if (!columns.some((col) => col.name === 'password')) {
        db.exec('ALTER TABLE users ADD COLUMN password TEXT');
    }
} catch (err) {
    console.error('Failed to migrate users table:', err.message);
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

// Cache for Owner ID per user
const ownerIdCache = {};

// Helper to retrieve user from session token
function getCurrentUser(req) {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('rachel-session-token-')) {
        const userId = authHeader.replace('rachel-session-token-', '');
        if (userId === 'mock') {
            let user = db.prepare('SELECT * FROM users WHERE id = ?').get('admin');
            if (!user) {
                user = { id: 'admin', username: 'admin', role: 'admin' };
            } else {
                user.role = 'admin';
            }
            return user;
        }
        return db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    }
    return null;
}

// Helper to generate Authorization Header
function getAuthHeaders(user) {
    let apiKey = null;
    let totpSecret = null;

    if (user && user.gameflip_api_key_enc && user.gameflip_totp_secret_enc) {
        apiKey = user.gameflip_api_key_enc;
        totpSecret = user.gameflip_totp_secret_enc;
    }

    if (!apiKey || !totpSecret) {
        throw new Error('Gameflip account is not linked. Please link it in Settings.');
    }

    const totp = authenticator.generate(totpSecret);
    return {
        'Authorization': `GFAPI ${apiKey}:${totp}`,
        'Content-Type': 'application/json'
    };
}

// Fetch Owner ID dynamically from profile
async function getOwnerId(user) {
    const cacheKey = user ? user.id : 'global';
    if (ownerIdCache[cacheKey]) return ownerIdCache[cacheKey];

    try {
        console.log(`Fetching Gameflip profile to get Owner ID for user: ${cacheKey}...`);
        const response = await axios.get(`${GAMEFLIP_API_BASE}/account/me/profile`, {
            headers: getAuthHeaders(user)
        });
        const owner = response.data.data.owner || response.data.data.id;
        ownerIdCache[cacheKey] = owner;
        console.log(`Successfully authenticated! Owner ID: ${owner}`);
        return owner;
    } catch (error) {
        console.error('Error fetching Owner ID from Gameflip:', error.response?.data || error.message);
        throw new Error('Authentication with Gameflip failed. Please check your credentials.');
    }
}

// Helper to set listing to draft and then delete it safely
async function deleteListingSafely(id, user) {
    try {
        console.log(`Setting listing ${id} status to draft...`);
        const patchStatusPayload = [
            { op: "replace", path: "/status", value: "draft" }
        ];
        await axios.patch(`${GAMEFLIP_API_BASE}/listing/${id}`, patchStatusPayload, {
            headers: {
                ...getAuthHeaders(user),
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
        headers: getAuthHeaders(user)
    });

    // Update listing status in DB
    updateListingStatus(id, 'deleted');

    return response.data.data;
}

// Endpoint to authenticate user
app.post('/api/auth/login', (req, res) => {
    try {
        const { username, password } = req.body;
        
        // 1. Check admin env credentials
        const expectedUsername = process.env.ADMIN_USERNAME || 'admin';
        const expectedPassword = process.env.ADMIN_PASSWORD || 'rachel123';

        if (username === expectedUsername && password === expectedPassword) {
            return res.json({
                success: true,
                token: 'rachel-session-token-mock',
                user: {
                    id: 'admin',
                    username: expectedUsername,
                    email: 'admin@rachel.com',
                    role: 'admin'
                }
            });
        }

        // 2. Check users database
        const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (user && user.password === password) {
            return res.json({
                success: true,
                token: `rachel-session-token-${user.id}`,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email,
                    role: 'user'
                }
            });
        }

        res.status(401).json({ error: 'Incorrect username or password' });
    } catch (error) {
        console.error('API login error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to register user
app.post('/api/auth/register', (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({ error: 'All fields are required.' });
        }

        // Check if admin credentials conflict (cannot register 'admin' username)
        const expectedUsername = process.env.ADMIN_USERNAME || 'admin';
        if (username.toLowerCase() === expectedUsername.toLowerCase()) {
            return res.status(400).json({ error: 'Username is not available.' });
        }

        // Check if username already exists in database
        const existingUser = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
        if (existingUser) {
            return res.status(400).json({ error: 'Username is already registered.' });
        }

        // Insert new user (without email)
        const userId = crypto.randomUUID();
        db.prepare(`
            INSERT INTO users (id, username, password)
            VALUES (?, ?, ?)
        `).run(userId, username, password);

        res.json({
            success: true,
            token: `rachel-session-token-${userId}`,
            user: {
                id: userId,
                username,
                role: 'user'
            }
        });
    } catch (error) {
        console.error('API register error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to get current user info
app.get('/api/auth/me', (req, res) => {
    try {
        const user = getCurrentUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }
        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.id === 'admin' ? 'admin' : 'user',
                hasGameflipLinked: !!(user.gameflip_api_key_enc && user.gameflip_totp_secret_enc)
            }
        });
    } catch (error) {
        console.error('API me error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to update username and password
app.post('/api/auth/update-profile', (req, res) => {
    try {
        const user = getCurrentUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }

        const { username, password, confirmPassword } = req.body;

        if (user.id === 'admin') {
            return res.status(400).json({ error: 'Modifying the global administrator account from the API is not allowed.' });
        }

        // 1. Update username if requested
        if (username && username !== user.username) {
            // Check if admin credentials conflict (cannot claim 'admin' username)
            const expectedUsername = process.env.ADMIN_USERNAME || 'admin';
            if (username.toLowerCase() === expectedUsername.toLowerCase()) {
                return res.status(400).json({ error: 'Username is not available.' });
            }

            // Check if username already exists in database
            const existingUser = db.prepare('SELECT * FROM users WHERE username = ? AND id != ?').get(username, user.id);
            if (existingUser) {
                return res.status(400).json({ error: 'Username is already in use.' });
            }

            db.prepare('UPDATE users SET username = ? WHERE id = ?').run(username, user.id);
            user.username = username; // update local object reference
        }

        // 2. Update password if requested
        if (password) {
            if (password !== confirmPassword) {
                return res.status(400).json({ error: 'Passwords do not match.' });
            }
            if (password.length < 6) {
                return res.status(400).json({ error: 'Password must be at least 6 characters.' });
            }

            db.prepare('UPDATE users SET password = ? WHERE id = ?').run(password, user.id);
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                role: 'user'
            }
        });
    } catch (error) {
        console.error('API update profile error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to link Gameflip account
app.post('/api/auth/update-gameflip', async (req, res) => {
    try {
        const user = getCurrentUser(req);
        if (!user) {
            return res.status(401).json({ error: 'Unauthorized.' });
        }

        const { apiKey, totpSecret } = req.body;

        if (!apiKey || !totpSecret) {
            return res.status(400).json({ error: 'API Key and TOTP secret are required.' });
        }

        // Test credentials by generating TOTP and fetching Gameflip profile
        try {
            const totp = authenticator.generate(totpSecret);
            await axios.get(`${GAMEFLIP_API_BASE}/account/me/profile`, {
                headers: {
                    'Authorization': `GFAPI ${apiKey}:${totp}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (err) {
            console.error('Invalid Gameflip credentials linked:', err.response?.data || err.message);
            return res.status(400).json({ error: 'Gameflip credentials are not valid. Please verify them.' });
        }

        // Save credentials to database (upsert if admin or regular user)
        db.prepare(`
            INSERT INTO users (id, username, gameflip_api_key_enc, gameflip_totp_secret_enc)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                gameflip_api_key_enc = excluded.gameflip_api_key_enc,
                gameflip_totp_secret_enc = excluded.gameflip_totp_secret_enc
        `).run(user.id, user.username, apiKey, totpSecret);

        res.json({
            success: true,
            message: 'Gameflip account linked successfully.'
        });
    } catch (error) {
        console.error('API update gameflip error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to retrieve all registered users (admin-only)
app.get('/api/auth/users', (req, res) => {
    try {
        const currentUser = getCurrentUser(req);
        if (!currentUser || currentUser.id !== 'admin') {
            return res.status(403).json({ error: 'Access denied. Only the global administrator can view users.' });
        }
        const users = db.prepare('SELECT id, username, email, created_at FROM users ORDER BY created_at DESC').all();
        res.json({ success: true, users });
    } catch (error) {
        console.error('API get users error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to delete a registered user (admin-only)
app.delete('/api/auth/users/:id', (req, res) => {
    try {
        const currentUser = getCurrentUser(req);
        if (!currentUser || currentUser.id !== 'admin') {
            return res.status(403).json({ error: 'Access denied.' });
        }
        const { id } = req.params;
        
        const deleteTx = db.transaction((userId) => {
            // First, delete listings referencing any of this user's products to avoid foreign key violations
            db.prepare('DELETE FROM listings WHERE product_id IN (SELECT id FROM products WHERE user_id =?)').run(userId);
            // Delete listings created by this user
            db.prepare('DELETE FROM listings WHERE user_id = ?').run(userId);
            // Delete products belonging to this user
            db.prepare('DELETE FROM products WHERE user_id = ?').run(userId);
            // Delete activity logs of this user
            db.prepare('DELETE FROM agent_logs WHERE user_id = ?').run(userId);
            // Delete user record itself
            db.prepare('DELETE FROM users WHERE id = ?').run(userId);
        });
        deleteTx(id);

        res.json({ success: true, message: 'User deleted successfully.' });
    } catch (error) {
        console.error('API delete user error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to test authentication / profile info
app.get('/api/profile', async (req, res) => {
    try {
        const user = getCurrentUser(req);
        const response = await axios.get(`${GAMEFLIP_API_BASE}/account/me/profile`, {
            headers: getAuthHeaders(user)
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
        const user = getCurrentUser(req);
        const ownerId = await getOwnerId(user);
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
            headers: getAuthHeaders(user)
        });

        const listing = response.data.data;
        const listingId = listing.id;
        console.log(`Draft created with ID: ${listingId}. Requesting cover and carousel photo upload URLs...`);

        // Request S3 upload URL for listing photo 1 (Cover)
        const photoResponse1 = await axios.post(`${GAMEFLIP_API_BASE}/listing/${listingId}/photo`, {}, {
            headers: getAuthHeaders(user)
        });
        const uploadUrl1 = photoResponse1.data.data.upload_url;
        const photoId1 = photoResponse1.data.data.id;

        // Request S3 upload URL for listing photo 2 (Carousel)
        const photoResponse2 = await axios.post(`${GAMEFLIP_API_BASE}/listing/${listingId}/photo`, {}, {
            headers: getAuthHeaders(user)
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
                ...getAuthHeaders(user),
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
                ...getAuthHeaders(user),
                'Content-Type': 'application/json-patch+json'
            }
        });

        // Save listing to DB
        saveListing(listingId, 'onsale', product_id, user?.id);
        logAgent('post_listings', 'posted', `Listing ${listingId} created: ${name}`, user?.id);

        res.json(patchResponse.data.data);
    } catch (error) {
        console.error('API create listing error:', error.response?.data || error.message);
        logAgent('post_listings', 'error', error.message, user?.id);
        res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
    }
});

// Fetch all listings for owner
app.get('/api/listings', async (req, res) => {
    try {
        const user = getCurrentUser(req);
        const ownerId = await getOwnerId(user);
        console.log(`Fetching listings for owner: ${ownerId}`);

        // Search user listings
        const response = await axios.get(`${GAMEFLIP_API_BASE}/listing`, {
            params: {
                owner: ownerId,
                limit: 10,
                status: 'draft,ready,onsale' // fetch draft, ready, and onsale listings
            },
            headers: getAuthHeaders(user)
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
        const user = getCurrentUser(req);
        const { id } = req.params;
        const result = await deleteListingSafely(id, user);
        logAgent('post_listings', 'deleted', `Listing ${id} deleted manually`, user?.id);
        res.json(result);
    } catch (error) {
        console.error('API delete listing error:', error.response?.data || error.message);
        logAgent('post_listings', 'error', error.message, user?.id);
        res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
    }
});

// Purge Expired Listings (or Draft listings for simplicity/demo)
app.post('/api/purge/expired', async (req, res) => {
    try {
        const user = getCurrentUser(req);
        const ownerId = await getOwnerId(user);

        logAgent('purge_listings', 'started', 'Purge expired started', user?.id);

        // Fetch listings
        const listResponse = await axios.get(`${GAMEFLIP_API_BASE}/listing`, {
            params: {
                owner: ownerId,
                status: 'draft,ready', // purge drafts and ready listings for demo
                limit: 50
            },
            headers: getAuthHeaders(user)
        });

        const listings = listResponse.data.data || [];
        console.log(`Found ${listings.length} draft/expired listings to purge.`);

        let purgeCount = 0;
        for (const item of listings) {
            try {
                await deleteListingSafely(item.id, user);
                purgeCount++;
            } catch (err) {
                console.error(`Failed to delete listing ${item.id}:`, err.message);
            }
        }

        logAgent('purge_listings', 'completed', `Purged ${purgeCount} expired listings`, user?.id);
        res.json({ success: true, purged: purgeCount });
    } catch (error) {
        console.error('API purge expired error:', error.response?.data || error.message);
        logAgent('purge_listings', 'error', error.message, user?.id);
        res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
    }
});

// Purge All Listings
app.post('/api/purge/all', async (req, res) => {
    try {
        const user = getCurrentUser(req);
        const ownerId = await getOwnerId(user);

        logAgent('purge_listings', 'started', 'Purge all started', user?.id);

        // Fetch all draft/ready/on_sale listings
        const listResponse = await axios.get(`${GAMEFLIP_API_BASE}/listing`, {
            params: {
                owner: ownerId,
                status: 'draft,ready,onsale',
                limit: 100
            },
            headers: getAuthHeaders(user)
        });

        const listings = listResponse.data.data || [];
        console.log(`Found ${listings.length} listings to purge all.`);

        let purgeCount = 0;
        for (const item of listings) {
            try {
                await deleteListingSafely(item.id, user);
                purgeCount++;
            } catch (err) {
                console.error(`Failed to delete listing ${item.id}:`, err.message);
            }
        }

        logAgent('purge_listings', 'completed', `Purged all ${purgeCount} listings`, user?.id);
        res.json({ success: true, purged: purgeCount });
    } catch (error) {
        console.error('API purge all error:', error.response?.data || error.message);
        logAgent('purge_listings', 'error', error.message, user?.id);
        res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
    }
});

// ─── DB ENDPOINTS ─────────────────────────────────────────────────────────────

// GET /api/db/products — fetch all products from local DB (user-scoped)
app.get('/api/db/products', (req, res) => {
    try {
        const user = getCurrentUser(req);
        if (!user) return res.status(401).json({ error: 'Unauthorized.' });

        const products = db.prepare('SELECT * FROM products WHERE user_id = ? ORDER BY created_at DESC').all(user.id);
        res.json(products);
    } catch (error) {
        console.error('DB fetch products error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// POST /api/db/products — save a product to local DB (user-scoped)
app.post('/api/db/products', (req, res) => {
    try {
        const user = getCurrentUser(req);
        if (!user) return res.status(401).json({ error: 'Unauthorized.' });

        const { id, name, description, price, category, auto_post, image } = req.body;

        if (!image) {
            return res.status(400).json({ error: 'Product image is required' });
        }

        const imagePath = saveProductImage(id, image);
        db.prepare(`
            INSERT OR REPLACE INTO products (id, user_id, name, description, price, category, auto_post, image_path, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
        `).run(id, user.id, name, description, price, category, auto_post ? 1 : 0, imagePath);
        res.json({ success: true, image_path: imagePath });
    } catch (error) {
        console.error('DB save product error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/db/products/:id/image — serve stored product image (user-scoped)
app.get('/api/db/products/:id/image', (req, res) => {
    try {
        const user = getCurrentUser(req);
        if (!user) return res.status(401).json({ error: 'Unauthorized.' });

        const { id } = req.params;
        const product = db.prepare('SELECT image_path FROM products WHERE id = ? AND user_id = ?').get(id, user.id);
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

// DELETE /api/db/products/:id — delete a product from local DB (user-scoped)
app.delete('/api/db/products/:id', (req, res) => {
    try {
        const user = getCurrentUser(req);
        if (!user) return res.status(401).json({ error: 'Unauthorized.' });

        const { id } = req.params;
        const deleteProduct = db.transaction((productId) => {
            const product = db.prepare('SELECT image_path FROM products WHERE id = ? AND user_id = ?').get(productId, user.id);
            if (product) {
                deleteProductImage(product.image_path);
                db.prepare('DELETE FROM listings WHERE product_id = ?').run(productId);
                db.prepare('DELETE FROM products WHERE id = ? AND user_id = ?').run(productId, user.id);
            }
        });
        deleteProduct(id);
        res.json({ success: true });
    } catch (error) {
        console.error('DB delete product error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/db/products/:id — update product attributes (user-scoped)
app.patch('/api/db/products/:id', (req, res) => {
    try {
        const user = getCurrentUser(req);
        if (!user) return res.status(401).json({ error: 'Unauthorized.' });

        const { id } = req.params;
        const { name, description, price, category, auto_post, image } = req.body;

        const existing = db.prepare('SELECT * FROM products WHERE id = ? AND user_id = ?').get(id, user.id);
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
            WHERE id = ? AND user_id = ?
        `).run(
            name ?? existing.name,
            description ?? existing.description,
            price ?? existing.price,
            category ?? existing.category,
            auto_post ? 1 : 0,
            imagePath,
            id,
            user.id
        );

        res.json({ success: true, image_path: imagePath });
    } catch (error) {
        console.error('DB update product error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// PATCH /api/db/products/:id/autopost — update auto_post status of a product (user-scoped)
app.patch('/api/db/products/:id/autopost', (req, res) => {
    try {
        const user = getCurrentUser(req);
        if (!user) return res.status(401).json({ error: 'Unauthorized.' });

        const { id } = req.params;
        const { auto_post } = req.body;
        db.prepare('UPDATE products SET auto_post = ?, updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?')
            .run(auto_post ? 1 : 0, id, user.id);
        res.json({ success: true });
    } catch (error) {
        console.error('DB update auto_post error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/db/listings — fetch listing history from local DB (user-scoped)
app.get('/api/db/listings', (req, res) => {
    try {
        const user = getCurrentUser(req);
        if (!user) return res.status(401).json({ error: 'Unauthorized.' });

        const listings = db.prepare('SELECT * FROM listings WHERE user_id = ? ORDER BY posted_at DESC').all(user.id);
        res.json(listings);
    } catch (error) {
        console.error('DB fetch listings error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// GET /api/db/logs — fetch agent logs from local DB (user-scoped)
app.get('/api/db/logs', (req, res) => {
    try {
        const user = getCurrentUser(req);
        if (!user) return res.status(401).json({ error: 'Unauthorized.' });

        const limit = parseInt(req.query.limit) || 50;
        const logs = db.prepare('SELECT * FROM agent_logs WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?').all(user.id, limit);
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
    // Validate database connection
    try {
        db.prepare('SELECT 1').get();
        console.log('Database connection verified successfully.');
    } catch (e) {
        console.warn('WARNING: Local SQLite database connection verification failed:', e.message);
    }
});