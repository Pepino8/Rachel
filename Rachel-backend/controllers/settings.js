import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SETTINGS_FILE = path.resolve(__dirname, '../data/user_settings.json');

// Helper to safely read settings file
async function readSettingsFile() {
    try {
        if (!fs.existsSync(SETTINGS_FILE)) {
            return {};
        }
        const data = await fs.promises.readFile(SETTINGS_FILE, 'utf8');
        return JSON.parse(data || '{}');
    } catch (err) {
        console.error('Error reading settings file:', err.message);
        return {};
    }
}

// Helper to safely write settings file
async function writeSettingsFile(settings) {
    try {
        const dir = path.dirname(SETTINGS_FILE);
        if (!fs.existsSync(dir)) {
            await fs.promises.mkdir(dir, { recursive: true });
        }
        await fs.promises.writeFile(SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
    } catch (err) {
        console.error('Error writing settings file:', err.message);
        throw err;
    }
}

export async function getSettings(req, res) {
    try {
        const userId = req.user?.id || 'admin';
        const allSettings = await readSettingsFile();
        const userSettings = allSettings[userId] || {
            postInterval: 60000,
            postIntervalUnit: 'minutes',
            postIntervalValue: 1,
            autoPurgeHours: 24
        };

        if (userSettings.autoPurgeHours === undefined) {
            userSettings.autoPurgeHours = 24;
        }

        return res.json({
            success: true,
            settings: userSettings
        });
    } catch (error) {
        console.error('getSettings error:', error.message);
        return res.status(500).json({ error: 'Failed to retrieve settings' });
    }
}

export async function updateSettings(req, res) {
    try {
        const userId = req.user?.id || 'admin';
        const { postInterval, postIntervalUnit, postIntervalValue, autoPurgeHours } = req.body;

        const allSettings = await readSettingsFile();
        const currentUserSettings = allSettings[userId] || {
            postInterval: 60000,
            postIntervalUnit: 'minutes',
            postIntervalValue: 1,
            autoPurgeHours: 24
        };

        let intervalNum = currentUserSettings.postInterval || 60000;
        let validUnit = currentUserSettings.postIntervalUnit || 'minutes';
        let validValue = currentUserSettings.postIntervalValue || 1;

        if (postInterval !== undefined) {
            intervalNum = Number(postInterval);
            if (!intervalNum || isNaN(intervalNum) || intervalNum < 10000) {
                return res.status(400).json({ error: 'Interval must be at least 10,000 ms (10 seconds).' });
            }
            if (intervalNum > 86400000) {
                return res.status(400).json({ error: 'Interval cannot exceed 86,400,000 ms (24 hours).' });
            }

            validUnit = ['seconds', 'minutes'].includes(postIntervalUnit) ? postIntervalUnit : (intervalNum % 60000 === 0 ? 'minutes' : 'seconds');
            validValue = Number(postIntervalValue) > 0 ? Number(postIntervalValue) : (validUnit === 'minutes' ? intervalNum / 60000 : Math.round(intervalNum / 1000));
        }

        let effectiveAutoPurgeHours = currentUserSettings.autoPurgeHours || 24;
        if (autoPurgeHours !== undefined) {
            const parsedHours = Number(autoPurgeHours);
            if (!isNaN(parsedHours) && parsedHours >= 1 && parsedHours <= 168) {
                effectiveAutoPurgeHours = parsedHours;
            }
        }

        allSettings[userId] = {
            ...currentUserSettings,
            postInterval: intervalNum,
            postIntervalUnit: validUnit,
            postIntervalValue: validValue,
            autoPurgeHours: effectiveAutoPurgeHours,
            updatedAt: new Date().toISOString()
        };

        await writeSettingsFile(allSettings);

        return res.json({
            success: true,
            message: 'Settings updated successfully',
            settings: allSettings[userId]
        });
    } catch (error) {
        console.error('updateSettings error:', error.message);
        return res.status(500).json({ error: 'Failed to update settings' });
    }
}
