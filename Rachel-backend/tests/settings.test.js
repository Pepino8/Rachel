import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getSettings, updateSettings } from '../controllers/settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SETTINGS_FILE = path.resolve(__dirname, '../data/user_settings.json');

describe('Settings Controller Tests', () => {
    let originalData = null;

    beforeEach(async () => {
        if (fs.existsSync(SETTINGS_FILE)) {
            originalData = await fs.promises.readFile(SETTINGS_FILE, 'utf8');
        }
    });

    afterEach(async () => {
        if (originalData !== null) {
            await fs.promises.writeFile(SETTINGS_FILE, originalData, 'utf8');
        } else if (fs.existsSync(SETTINGS_FILE)) {
            await fs.promises.unlink(SETTINGS_FILE);
        }
    });

    it('should return default settings when no custom setting exists', async () => {
        const req = { user: { id: 'test_user_unique_' + Date.now() } };
        let jsonResponse = null;
        const res = {
            json: (data) => { jsonResponse = data; return res; },
            status: () => res
        };

        await getSettings(req, res);

        expect(jsonResponse).toBeDefined();
        expect(jsonResponse.success).toBe(true);
        expect(jsonResponse.settings.postInterval).toBe(60000);
        expect(jsonResponse.settings.postIntervalUnit).toBe('minutes');
        expect(jsonResponse.settings.postIntervalValue).toBe(1);
    });

    it('should update and retrieve custom post interval settings', async () => {
        const userId = 'test_user_speed_' + Date.now();
        const reqUpdate = {
            user: { id: userId },
            body: {
                postInterval: 120000,
                postIntervalUnit: 'minutes',
                postIntervalValue: 2
            }
        };
        let updateResponse = null;
        const resUpdate = {
            json: (data) => { updateResponse = data; return resUpdate; },
            status: () => resUpdate
        };

        await updateSettings(reqUpdate, resUpdate);
        expect(updateResponse.success).toBe(true);
        expect(updateResponse.settings.postInterval).toBe(120000);
        expect(updateResponse.settings.postIntervalValue).toBe(2);

        // Verify with getSettings
        const reqGet = { user: { id: userId } };
        let getResponse = null;
        const resGet = {
            json: (data) => { getResponse = data; return resGet; },
            status: () => resGet
        };

        await getSettings(reqGet, resGet);
        expect(getResponse.success).toBe(true);
        expect(getResponse.settings.postInterval).toBe(120000);
    });

    it('should reject invalid interval values below 10 seconds', async () => {
        const req = {
            user: { id: 'test_invalid_user' },
            body: { postInterval: 5000 }
        };
        let statusCode = 200;
        let jsonResponse = null;
        const res = {
            status: (code) => { statusCode = code; return res; },
            json: (data) => { jsonResponse = data; return res; }
        };

        await updateSettings(req, res);
        expect(statusCode).toBe(400);
        expect(jsonResponse.error).toContain('at least 10,000 ms');
    });
});
