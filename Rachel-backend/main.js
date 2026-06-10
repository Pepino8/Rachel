import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import { authenticator } from 'otplib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

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
        const { name, description, price, category } = req.body;

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
        console.log(`Draft created with ID: ${listingId}. Requesting photo upload URL...`);

        // Request S3 upload URL for listing photo
        const photoResponse = await axios.post(`${GAMEFLIP_API_BASE}/listing/${listingId}/photo`, {}, {
            headers: getAuthHeaders()
        });
        const uploadUrl = photoResponse.data.data.upload_url;
        const photoId = photoResponse.data.data.id;
        
        // Read local cover photo image (joeswag.png) from public folder to avoid network 404s
        console.log('Reading local cover photo image (joeswag.png)...');
        let defaultImageBuffer;
        try {
            const imagePath = path.resolve(__dirname, '../Rachel-frontend/public/joeswag.png');
            defaultImageBuffer = fs.readFileSync(imagePath);
        } catch (e) {
            console.warn('Could not read joeswag.png, falling back to 1x1 transparent PNG base64...', e.message);
            defaultImageBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
        }
        
        console.log('Uploading default cover photo to Gameflip S3...');
        await axios.put(uploadUrl, defaultImageBuffer, {
            headers: {
                'Content-Type': 'image/png'
            }
        });

        // Step 1: Activate the uploaded cover photo and set it as cover_photo
        console.log(`Activating cover photo (ID: ${photoId}) and setting as cover_photo...`);
        const patchPhotoPayload = [
            { op: "replace", path: `/photo/${photoId}/status`, value: "active" },
            { op: "replace", path: `/photo/${photoId}/display_order`, value: 0 },
            { op: "replace", path: "/cover_photo", value: photoId }
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

        res.json(patchResponse.data.data);
    } catch (error) {
        console.error('API create listing error:', error.response?.data || error.message);
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
        console.log(`Deleting listing ID: ${id}`);

        const response = await axios.delete(`${GAMEFLIP_API_BASE}/listing/${id}`, {
            headers: getAuthHeaders()
        });

        res.json(response.data.data);
    } catch (error) {
        console.error('API delete listing error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
    }
});

// Purge Expired Listings (or Draft listings for simplicity/demo)
app.post('/api/purge/expired', async (req, res) => {
    try {
        const ownerId = await getOwnerId();

        // Fetch listings
        const listResponse = await axios.get(`${GAMEFLIP_API_BASE}/listing`, {
            params: {
                owner: ownerId,
                status: 'draft,ready,onsale', // purge drafts, ready, and live listings for demo
                limit: 50
            },
            headers: getAuthHeaders()
        });

        const listings = listResponse.data.data || [];
        console.log(`Found ${listings.length} draft/expired listings to purge.`);

        let purgeCount = 0;
        for (const item of listings) {
            try {
                await axios.delete(`${GAMEFLIP_API_BASE}/listing/${item.id}`, {
                    headers: getAuthHeaders()
                });
                purgeCount++;
            } catch (err) {
                console.error(`Failed to delete listing ${item.id}:`, err.message);
            }
        }

        res.json({ success: true, purged: purgeCount });
    } catch (error) {
        console.error('API purge expired error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
    }
});

// Purge All Listings
app.post('/api/purge/all', async (req, res) => {
    try {
        const ownerId = await getOwnerId();

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
                await axios.delete(`${GAMEFLIP_API_BASE}/listing/${item.id}`, {
                    headers: getAuthHeaders()
                });
                purgeCount++;
            } catch (err) {
                console.error(`Failed to delete listing ${item.id}:`, err.message);
            }
        }

        res.json({ success: true, purged: purgeCount });
    } catch (error) {
        console.error('API purge all error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
    }
});

// Start Server
app.listen(PORT, async () => {
    console.log(`Rachel Gameflip proxy server running on http://localhost:${PORT}`);
    // Validate authentication at start
    try {
        await getOwnerId();
    } catch (e) {
        console.warn('WARNING: Initial connection verification failed. Make sure your GAMEFLIP_API_KEY and GAMEFLIP_TOTP_SECRET are valid.');
    }
});
