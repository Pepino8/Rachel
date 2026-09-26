import axios from 'axios';
import db from '../config/db.js';
import { GAMEFLIP_API_BASE, getAuthHeaders, getOwnerId, deleteListingSafely } from '../services/gameflip.js';
import { getListingImage } from '../services/image.js';
import { purgeUserStaleListings } from '../services/autoPurge.js';

// Helpers to log bot activity in Supabase
async function logAgent(agent, action, detail = null, userId = null) {
    try {
        await db.from('agent_logs').insert({
            user_id: userId,
            agent,
            action,
            detail,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('logAgent error:', err.message);
    }
}

async function saveListing(gameflipId, status, productId = null, userId = null) {
    try {
        await db.from('listings').upsert({
            id: gameflipId,
            user_id: userId,
            product_id: productId,
            gameflip_id: gameflipId,
            status,
            posted_at: new Date().toISOString()
        });
    } catch (err) {
        console.error('saveListing error:', err.message);
    }
}

export async function createListing(req, res) {
    const user = req.user;
    try {
        const ownerId = await getOwnerId(user);
        const { name, description, price, category, product_id } = req.body;

        const priceInCents = Math.round(parseFloat(price) * 100);

        let gfCategory = 'DIGITAL_INGAME';
        if (category === 'video-dvd') gfCategory = 'DIGITAL_INGAME';
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
            shipping_within_days: 1,
            expire_in_days: 365,
            status: 'draft'
        };

        if (description?.includes('Game: Fortnite') || name?.toLowerCase().includes('fortnite')) {
            payload.upc = 'GFFORTNITE';
        } else if (description?.includes('Game: Counter-Strike') || name?.toLowerCase().includes('csgo') || name?.toLowerCase().includes('cs2')) {
            payload.upc = 'GFCSGO';
        } else if (description?.includes('Game: Roblox') || name?.toLowerCase().includes('roblox')) {
            payload.upc = 'GFROBLOX';
        } else if (description?.includes('Game: Rocket League') || name?.toLowerCase().includes('rocket league')) {
            payload.upc = 'GFROCKETLEAGUE';
        }

        console.log('Posting new listing to Gameflip (as draft):', payload);
        const response = await axios.post(`${GAMEFLIP_API_BASE}/listing`, payload, {
            headers: getAuthHeaders(user)
        });

        const listing = response.data.data;
        const listingId = listing.id;
        console.log(`Draft created with ID: ${listingId}. Requesting cover and carousel photo upload URLs...`);

        const photoResponse1 = await axios.post(`${GAMEFLIP_API_BASE}/listing/${listingId}/photo`, {}, {
            headers: getAuthHeaders(user)
        });
        const uploadUrl1 = photoResponse1.data.data.upload_url;
        const photoId1 = photoResponse1.data.data.id;

        const photoResponse2 = await axios.post(`${GAMEFLIP_API_BASE}/listing/${listingId}/photo`, {}, {
            headers: getAuthHeaders(user)
        });
        const uploadUrl2 = photoResponse2.data.data.upload_url;
        const photoId2 = photoResponse2.data.data.id;

        const { buffer: listingImageBuffer, contentType: listingImageType } = await getListingImage(product_id);

        console.log(`Uploading product image to Gameflip S3 (${listingImageType})...`);
        if (listingImageBuffer.length > 500000) {
            throw new Error(`Image too heavy: ${listingImageBuffer.length} bytes > 500000 allowed by Gameflip`);
        }

        await Promise.all([
            axios.put(uploadUrl1, listingImageBuffer, {
                headers: { 'Content-Type': listingImageType }
            }),
            axios.put(uploadUrl2, listingImageBuffer, {
                headers: { 'Content-Type': listingImageType }
            })
        ]);

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

        await saveListing(listingId, 'onsale', product_id, user?.id);
        await logAgent('post_listings', 'posted', `Listing ${listingId} created: ${name}`, user?.id);

        res.json(patchResponse.data.data);
    } catch (error) {
        console.error('API create listing error:', error.response?.data || error.message);
        await logAgent('post_listings', 'error', error.message, user?.id);
        res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
    }
}

export async function getListings(req, res) {
    const user = req.user;
    try {
        const ownerId = await getOwnerId(user);
        console.log(`Fetching listings for owner: ${ownerId}`);

        const response = await axios.get(`${GAMEFLIP_API_BASE}/listing`, {
            params: {
                owner: ownerId,
                limit: 10,
                status: 'draft,ready,onsale'
            },
            headers: getAuthHeaders(user)
        });

        res.json(response.data.data);
    } catch (error) {
        console.error('API fetch listings error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
    }
}

export async function deleteListing(req, res) {
    const user = req.user;
    try {
        const { id } = req.params;
        const result = await deleteListingSafely(id, user);
        await logAgent('post_listings', 'deleted', `Listing ${id} deleted manually`, user?.id);
        res.json(result);
    } catch (error) {
        console.error('API delete listing error:', error.response?.data || error.message);
        await logAgent('post_listings', 'error', error.message, user?.id);
        res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
    }
}

export async function purgeExpired(req, res) {
    const user = req.user;
    try {
        const maxAgeHours = Number(req.body?.maxAgeHours) || 24;
        const result = await purgeUserStaleListings(user, maxAgeHours, 'manual');
        res.json(result);
    } catch (error) {
        console.error('API purge expired error:', error.response?.data || error.message);
        await logAgent('purge_listings', 'error', error.message, user?.id);
        res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
    }
}

export async function purgeAll(req, res) {
    const user = req.user;
    try {
        const ownerId = await getOwnerId(user);
        await logAgent('purge_listings', 'started', 'Purge all started', user?.id);

        const listResponse = await axios.get(`${GAMEFLIP_API_BASE}/listing`, {
            params: {
                owner: ownerId,
                status: 'draft,ready,onsale',
                limit: 100
            },
            headers: getAuthHeaders(user)
        });

        let expiredResData = [];
        try {
            const expRes = await axios.get(`${GAMEFLIP_API_BASE}/listing`, {
                params: {
                    owner: ownerId,
                    status: 'draft,ready,onsale,expired,timeout',
                    expiration: ',now',
                    limit: 100
                },
                headers: getAuthHeaders(user)
            });
            expiredResData = expRes.data?.data || [];
        } catch (expErr) {
            console.warn('Gameflip expiration query in purgeAll notice:', expErr.message);
        }

        const listingsMap = new Map();
        for (const item of (listResponse.data?.data || [])) {
            listingsMap.set(item.id, item);
        }
        for (const item of expiredResData) {
            listingsMap.set(item.id, item);
        }

        const listings = Array.from(listingsMap.values()).filter(item => item.status !== 'sold' && item.status !== 'sale_pending');
        console.log(`Found ${listings.length} listings to purge all.`);

        let purgeCount = 0;
        for (const item of listings) {
            try {
                await deleteListingSafely(item.id, user, item.status);
                purgeCount++;
                await new Promise(r => setTimeout(r, 120));
            } catch (err) {
                console.error(`Failed to delete listing ${item.id}:`, err.message);
            }
        }

        await logAgent('purge_listings', 'completed', `Purged all ${purgeCount} listings`, user?.id);
        res.json({ success: true, purged: purgeCount });
    } catch (error) {
        console.error('API purge all error:', error.response?.data || error.message);
        await logAgent('purge_listings', 'error', error.message, user?.id);
        res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
    }
}
