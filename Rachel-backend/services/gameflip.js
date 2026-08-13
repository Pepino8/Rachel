import crypto from 'crypto';
import { authenticator } from 'otplib';
import axios from 'axios';
import db from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

export const GAMEFLIP_API_BASE = 'https://production-gameflip.fingershock.com/api/v1';
const ownerIdCache = {};

const ENCRYPTION_KEY_RAW = process.env.ENCRYPTION_KEY || process.env.JWT_SECRET || 'rachel-default-fallback-encryption-secret-key-32';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(ENCRYPTION_KEY_RAW).digest();

export function encrypt(text) {
    if (!text) return null;
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${encrypted}:${authTag}`;
}

export function decrypt(encryptedText) {
    if (!encryptedText) return null;
    try {
        const parts = encryptedText.split(':');
        if (parts.length !== 3) {
            return encryptedText;
        }
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        const authTag = Buffer.from(parts[2], 'hex');
        const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
        decipher.setAuthTag(authTag);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        console.error('Failed to decrypt Gameflip credentials:', err.message);
        return encryptedText;
    }
}

export function getAuthHeaders(user) {
    let apiKey = null;
    let totpSecret = null;

    if (user && user.gameflip_api_key_enc && user.gameflip_totp_secret_enc) {
        apiKey = decrypt(user.gameflip_api_key_enc);
        totpSecret = decrypt(user.gameflip_totp_secret_enc);
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

export async function getOwnerId(user) {
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

export function updateListingStatus(gameflipId, status) {
    db.prepare(`
        UPDATE listings SET status = ? WHERE gameflip_id = ?
    `).run(status, gameflipId);
}

export async function deleteListingSafely(id, user) {
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
        console.warn(`Could not set status to draft for listing ${id}:`, err.response?.data || err.message);
    }

    console.log(`Deleting listing ID: ${id}`);
    const response = await axios.delete(`${GAMEFLIP_API_BASE}/listing/${id}`, {
        headers: getAuthHeaders(user)
    });

    updateListingStatus(id, 'deleted');

    return response.data.data;
}
