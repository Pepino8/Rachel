import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import cloudinary from '../config/cloudinary.js';
import db from '../config/db.js';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, '../rachel.db');
const dbDir = path.dirname(dbPath);
const uploadsDir = process.env.UPLOADS_DIR || path.join(dbDir, 'product-images');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

export function extensionFromMime(mimeType) {
    const map = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'image/gif': '.gif'
    };
    return map[mimeType] || '.png';
}

export function getImageContentType(filePath) {
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

export async function saveProductImage(productId, imageData) {
    const result = await cloudinary.uploader.upload(imageData, {
        public_id: `rachel-products/${productId}`,
        overwrite: true,
        transformation: [
            { width: 1000, height: 1000, crop: 'fill', gravity: 'auto' },
            { quality: 'auto:good', fetch_format: 'jpg' }
        ]
    });
    return result.secure_url;
}

export function getProductImageFilePath(imagePath) {
    if (!imagePath) return null;
    const fullPath = path.join(uploadsDir, imagePath);
    return fs.existsSync(fullPath) ? fullPath : null;
}

export function deleteProductImage(imagePath) {
    const fullPath = getProductImageFilePath(imagePath);
    if (fullPath) {
        fs.unlinkSync(fullPath);
    }
}

export async function getListingImage(productId) {
    if (productId) {
        const product = db.prepare('SELECT image_path FROM products WHERE id = ?').get(productId);
        if (product?.image_path) {
            try {
                const response = await axios.get(product.image_path, { responseType: 'arraybuffer' });
                return {
                    buffer: Buffer.from(response.data),
                    contentType: response.headers['content-type'] || 'image/png'
                };
            } catch (err) {
                console.error('Failed to fetch product image from Cloudinary:', err.message);
            }
        }
    }

    const fallbackPath = path.resolve(__dirname, '../public/joeswag.png');
    if (fs.existsSync(fallbackPath)) {
        return { buffer: fs.readFileSync(fallbackPath), contentType: 'image/png' };
    }

    return {
        buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64'),
        contentType: 'image/png'
    };
}
