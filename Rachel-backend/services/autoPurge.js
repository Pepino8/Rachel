import axios from 'axios';
import db from '../config/db.js';
import { GAMEFLIP_API_BASE, getAuthHeaders, getOwnerId, deleteListingSafely } from './gameflip.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SETTINGS_FILE = path.resolve(__dirname, '../data/user_settings.json');

/**
 * Helper to get the user-configured auto-purge age in hours (default 24h)
 */
export async function getUserAutoPurgeHours(userId) {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            const data = JSON.parse(await fs.promises.readFile(SETTINGS_FILE, 'utf8') || '{}');
            if (data[userId]?.autoPurgeHours) {
                return Number(data[userId].autoPurgeHours);
            }
        }
    } catch (_) {}
    return 24;
}

/**
 * Log activity to agent_logs table in Supabase
 */
export async function logAgent(agent, action, detail = null, userId = null) {
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

/**
 * Core purging logic: finds and deletes listings older than maxAgeHours (default 24h),
 * as well as drafts and Gameflip-expired listings.
 * Strictly protects sold and sale_pending listings.
 */
export async function purgeUserStaleListings(user, maxAgeHours = 24, source = 'manual') {
    const ownerId = await getOwnerId(user);
    const headers = getAuthHeaders(user);
    const effectiveHours = Number(maxAgeHours) || 24;
    const staleThreshold = Date.now() - (effectiveHours * 60 * 60 * 1000);

    const logAgentName = source === 'auto_worker' ? 'auto_purge' : 'purge_listings';
    await logAgent(logAgentName, 'started', `Checking listings older than ${effectiveHours}h and drafts`, user?.id);

    // 1. Fetch user's active, ready, and draft listings
    const activeRes = await axios.get(`${GAMEFLIP_API_BASE}/listing`, {
        params: {
            owner: ownerId,
            status: 'draft,ready,onsale',
            limit: 100
        },
        headers
    });

    // 2. Fetch past expired listings (using Gameflip range query expiration: ',now')
    let expiredRangeData = [];
    try {
        const expRes = await axios.get(`${GAMEFLIP_API_BASE}/listing`, {
            params: {
                owner: ownerId,
                status: 'draft,ready,onsale,expired,timeout',
                expiration: ',now',
                limit: 100
            },
            headers
        });
        expiredRangeData = expRes.data?.data || [];
    } catch (expErr) {
        console.warn('Gameflip expiration range query notice:', expErr.response?.data || expErr.message);
    }

    // Combine and deduplicate listings by ID
    const candidatesMap = new Map();
    for (const item of (activeRes.data?.data || [])) {
        candidatesMap.set(item.id, item);
    }
    for (const item of expiredRangeData) {
        candidatesMap.set(item.id, item);
    }

    // Filter listings that should be purged
    const toPurge = [];
    for (const item of candidatesMap.values()) {
        // NEVER touch sold or pending sales transactions
        if (item.status === 'sold' || item.status === 'sale_pending') {
            continue;
        }

        const isDraftOrReady = item.status === 'draft' || item.status === 'ready';
        const isGameflipExpired = item.status === 'expired' || item.status === 'timeout' ||
            (item.expiration && new Date(item.expiration).getTime() <= Date.now());
        const isStaleListing = item.status === 'onsale' && item.created && new Date(item.created).getTime() <= staleThreshold;

        if (isDraftOrReady || isGameflipExpired || isStaleListing) {
            toPurge.push({
                id: item.id,
                name: item.name,
                status: item.status,
                created: item.created,
                reason: isDraftOrReady ? 'draft' : isGameflipExpired ? 'expired' : 'stale_24h'
            });
        }
    }

    if (toPurge.length > 0) {
        console.log(`[AutoPurge] Found ${toPurge.length} listings to purge for owner ${ownerId} (>=${effectiveHours}h / drafts).`);
    }

    let purgeCount = 0;
    for (const item of toPurge) {
        try {
            await deleteListingSafely(item.id, user, item.status);
            purgeCount++;
            // Throttle to respect Gameflip API rate limits
            await new Promise(r => setTimeout(r, 120));
        } catch (err) {
            console.error(`Failed to delete listing ${item.id} (${item.name}):`, err.response?.data || err.message);
        }
    }

    await logAgent(
        logAgentName,
        'completed',
        `Purged ${purgeCount} listings (>=${effectiveHours}h / drafts, out of ${toPurge.length} eligible)`,
        user?.id
    );

    return {
        success: true,
        purged: purgeCount,
        totalFound: toPurge.length,
        items: toPurge
    };
}

/**
 * Runs automatic purge for all users with linked Gameflip credentials
 */
export async function runAutoPurgeAllUsers() {
    try {
        const { data: users, error } = await db.from('users').select('*');
        if (error || !users) return;

        const linkedUsers = users.filter(u => u.gameflip_api_key_enc && u.gameflip_totp_secret_enc);
        for (const user of linkedUsers) {
            try {
                const hours = await getUserAutoPurgeHours(user.id);
                const result = await purgeUserStaleListings(user, hours, 'auto_worker');
                if (result.purged > 0) {
                    console.log(`[AutoPurge Worker] Successfully auto-purged ${result.purged} listings (>=${hours}h) for user ${user.username || user.id}`);
                }
            } catch (userErr) {
                console.error(`[AutoPurge Worker] Error processing user ${user.username || user.id}:`, userErr.message);
            }
        }
    } catch (err) {
        console.error('[AutoPurge Worker] General run error:', err.message);
    }
}

let workerIntervalId = null;

/**
 * Starts the automatic 24-hour listing cleanup background worker.
 * Checks periodically (default: every 15 minutes).
 */
export function startAutoPurgeWorker(intervalMs = 15 * 60 * 1000) {
    if (workerIntervalId) {
        clearInterval(workerIntervalId);
    }

    console.log(`[AutoPurge Worker] Initialized. Scanning every ${Math.round(intervalMs / 60000)} minutes for listings older than 24h.`);

    // Initial run after short delay to allow server startup
    setTimeout(() => {
        runAutoPurgeAllUsers().catch(err => console.error('[AutoPurge Worker] Startup check error:', err.message));
    }, 10000);

    // Recurring interval
    workerIntervalId = setInterval(() => {
        runAutoPurgeAllUsers().catch(err => console.error('[AutoPurge Worker] Periodic check error:', err.message));
    }, intervalMs);

    return workerIntervalId;
}
