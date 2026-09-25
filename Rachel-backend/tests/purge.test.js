import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import * as gameflipService from '../services/gameflip.js';
import { purgeExpired, purgeAll } from '../controllers/listings.js';

vi.mock('axios');
vi.mock('../services/gameflip.js', () => ({
    GAMEFLIP_API_BASE: 'https://production-gameflip.fingershock.com/api/v1',
    getAuthHeaders: vi.fn(() => ({ Authorization: 'GFAPI test:totp' })),
    getOwnerId: vi.fn(async () => 'test_owner_123'),
    deleteListingSafely: vi.fn(async () => ({ success: true }))
}));

vi.mock('../config/db.js', () => ({
    default: {
        from: (table) => ({
            insert: async () => ({ error: null }),
            update: () => ({ eq: async () => ({ error: null }) }),
            upsert: async () => ({ error: null }),
            select: async () => ({
                data: table === 'users' ? [
                    { id: 'user_worker_1', username: 'worker1', gameflip_api_key_enc: 'enc1', gameflip_totp_secret_enc: 'sec1' }
                ] : [],
                error: null
            })
        })
    }
}));

describe('Purge Listings Controller Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should purge draft, expired, and stale (>24h) listings while ignoring sold listings', async () => {
        const now = Date.now();
        const twoDaysAgo = new Date(now - 48 * 60 * 60 * 1000).toISOString();
        const oneHourAgo = new Date(now - 1 * 60 * 60 * 1000).toISOString();
        const inFuture = new Date(now + 24 * 60 * 60 * 1000).toISOString();

        const activeListings = [
            { id: 'item_draft', name: 'Draft Listing', status: 'draft', created: oneHourAgo },
            { id: 'item_ready', name: 'Ready Listing', status: 'ready', created: oneHourAgo },
            { id: 'item_stale', name: 'Stale 48h Listing', status: 'onsale', created: twoDaysAgo },
            { id: 'item_fresh', name: 'Fresh Listing', status: 'onsale', created: oneHourAgo },
            { id: 'item_sold', name: 'Sold Listing', status: 'sold', created: twoDaysAgo },
            { id: 'item_pending', name: 'Pending Sale Listing', status: 'sale_pending', created: twoDaysAgo }
        ];

        const expiredRangeListings = [
            { id: 'item_expired_gf', name: 'Past Expired Item', status: 'expired', expiration: oneHourAgo }
        ];

        axios.get.mockImplementation(async (url, config) => {
            if (config?.params?.expiration === ',now') {
                return { data: { data: expiredRangeListings } };
            }
            return { data: { data: activeListings } };
        });

        const req = { user: { id: 'user_123' }, body: { maxAgeHours: 24 } };
        let responseData = null;
        const res = {
            json: (data) => { responseData = data; return res; },
            status: () => res
        };

        await purgeExpired(req, res);

        expect(responseData).toBeDefined();
        expect(responseData.success).toBe(true);
        // Expect item_draft, item_ready, item_stale, and item_expired_gf to be purged (4 items)
        expect(responseData.totalFound).toBe(4);
        expect(responseData.purged).toBe(4);

        // Verify deleteListingSafely called for the 4 purged items
        expect(gameflipService.deleteListingSafely).toHaveBeenCalledWith('item_draft', req.user, 'draft');
        expect(gameflipService.deleteListingSafely).toHaveBeenCalledWith('item_ready', req.user, 'ready');
        expect(gameflipService.deleteListingSafely).toHaveBeenCalledWith('item_stale', req.user, 'onsale');
        expect(gameflipService.deleteListingSafely).toHaveBeenCalledWith('item_expired_gf', req.user, 'expired');

        // Verify sold items were NEVER passed to deleteListingSafely
        expect(gameflipService.deleteListingSafely).not.toHaveBeenCalledWith('item_sold', expect.anything(), expect.anything());
        expect(gameflipService.deleteListingSafely).not.toHaveBeenCalledWith('item_pending', expect.anything(), expect.anything());
        expect(gameflipService.deleteListingSafely).not.toHaveBeenCalledWith('item_fresh', expect.anything(), expect.anything());
    });

    it('should return purged: 0 when no expired or draft listings exist', async () => {
        const freshListings = [
            { id: 'item_fresh_1', name: 'Fresh Item 1', status: 'onsale', created: new Date().toISOString() },
            { id: 'item_sold_1', name: 'Sold Item 1', status: 'sold', created: new Date().toISOString() }
        ];

        axios.get.mockImplementation(async (url, config) => {
            if (config?.params?.expiration === ',now') {
                return { data: { data: [] } };
            }
            return { data: { data: freshListings } };
        });

        const req = { user: { id: 'user_123' }, body: {} };
        let responseData = null;
        const res = {
            json: (data) => { responseData = data; return res; },
            status: () => res
        };

        await purgeExpired(req, res);

        expect(responseData.success).toBe(true);
        expect(responseData.totalFound).toBe(0);
        expect(responseData.purged).toBe(0);
        expect(gameflipService.deleteListingSafely).not.toHaveBeenCalled();
    });

    it('purgeAll should delete all active and draft listings while protecting sold items', async () => {
        const mockListings = [
            { id: 'all_1', name: 'Listing 1', status: 'onsale' },
            { id: 'all_2', name: 'Listing 2', status: 'draft' },
            { id: 'all_sold', name: 'Sold Item', status: 'sold' }
        ];

        axios.get.mockImplementation(async (url, config) => {
            if (config?.params?.expiration === ',now') {
                return { data: { data: [] } };
            }
            return { data: { data: mockListings } };
        });

        const req = { user: { id: 'user_123' } };
        let responseData = null;
        const res = {
            json: (data) => { responseData = data; return res; },
            status: () => res
        };

        await purgeAll(req, res);

        expect(responseData.success).toBe(true);
        expect(responseData.purged).toBe(2);
        expect(gameflipService.deleteListingSafely).toHaveBeenCalledWith('all_1', req.user, 'onsale');
        expect(gameflipService.deleteListingSafely).toHaveBeenCalledWith('all_2', req.user, 'draft');
        expect(gameflipService.deleteListingSafely).not.toHaveBeenCalledWith('all_sold', expect.anything(), expect.anything());
    });

    it('runAutoPurgeAllUsers should automatically identify and purge listings older than 24 hours for all users with gameflip', async () => {
        const { runAutoPurgeAllUsers } = await import('../services/autoPurge.js');
        const now = Date.now();
        const thirtyHoursAgo = new Date(now - 30 * 60 * 60 * 1000).toISOString();
        const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000).toISOString();

        const userListings = [
            { id: 'item_stale_30h', name: 'Stale 30h Item', status: 'onsale', created: thirtyHoursAgo },
            { id: 'item_fresh_2h', name: 'Fresh 2h Item', status: 'onsale', created: twoHoursAgo }
        ];

        axios.get.mockImplementation(async (url, config) => {
            if (config?.params?.expiration === ',now') {
                return { data: { data: [] } };
            }
            return { data: { data: userListings } };
        });

        await runAutoPurgeAllUsers();

        // Expect the 30-hour-old listing to be purged automatically
        expect(gameflipService.deleteListingSafely).toHaveBeenCalledWith('item_stale_30h', expect.anything(), 'onsale');
        // Fresh listing must not be purged
        expect(gameflipService.deleteListingSafely).not.toHaveBeenCalledWith('item_fresh_2h', expect.anything(), expect.anything());
    });
});
