import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extensionFromMime, getImageContentType, saveProductImage } from '../services/image.js';
import cloudinary from '../config/cloudinary.js';

describe('Image Service Tests', () => {
    describe('MIME type and extension helpers', () => {
        it('should correctly determine extension from MIME type', () => {
            expect(extensionFromMime('image/jpeg')).toBe('.jpg');
            expect(extensionFromMime('image/png')).toBe('.png');
            expect(extensionFromMime('image/webp')).toBe('.webp');
            expect(extensionFromMime('image/gif')).toBe('.gif');
            expect(extensionFromMime('unknown/mime')).toBe('.png');
        });

        it('should correctly determine content type from file path', () => {
            expect(getImageContentType('photo.jpg')).toBe('image/jpeg');
            expect(getImageContentType('photo.jpeg')).toBe('image/jpeg');
            expect(getImageContentType('photo.png')).toBe('image/png');
            expect(getImageContentType('photo.webp')).toBe('image/webp');
            expect(getImageContentType('photo.gif')).toBe('image/gif');
            expect(getImageContentType('unknown.bin')).toBe('image/png');
        });
    });

    describe('saveProductImage transformation configuration', () => {
        beforeEach(() => {
            vi.restoreAllMocks();
        });

        it('should upload to Cloudinary using crop: limit to preserve rectangle aspect ratio', async () => {
            const originalEnv = { ...process.env };
            process.env.CLOUDINARY_CLOUD_NAME = 'test-cloud';
            process.env.CLOUDINARY_API_KEY = 'test-key';
            process.env.CLOUDINARY_API_SECRET = 'test-secret';

            const uploadSpy = vi.spyOn(cloudinary.uploader, 'upload').mockResolvedValue({
                secure_url: 'https://res.cloudinary.com/test-cloud/image/upload/v12345/rachel-products/prod_123.jpg'
            });

            const imageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
            const result = await saveProductImage('prod_123', imageData);

            expect(uploadSpy).toHaveBeenCalledTimes(1);
            const uploadArgs = uploadSpy.mock.calls[0];
            expect(uploadArgs[0]).toBe(imageData);
            expect(uploadArgs[1]).toMatchObject({
                public_id: 'rachel-products/prod_123',
                overwrite: true,
                transformation: [
                    { width: 1000, height: 1000, crop: 'limit' },
                    { quality: 'auto:good', fetch_format: 'jpg' }
                ]
            });

            // Ensure crop is NOT 'fill'
            const cropMode = uploadArgs[1].transformation[0].crop;
            expect(cropMode).toBe('limit');
            expect(cropMode).not.toBe('fill');

            expect(result).toBe('https://res.cloudinary.com/test-cloud/image/upload/v12345/rachel-products/prod_123.jpg');

            process.env = originalEnv;
        });

        it('should return raw URL directly if already an http(s) URL', async () => {
            const externalUrl = 'https://example.com/item-rectangle.png';
            const result = await saveProductImage('prod_456', externalUrl);
            expect(result).toBe(externalUrl);
        });

        it('should return null if imageData is empty or undefined', async () => {
            expect(await saveProductImage('prod_empty', null)).toBeNull();
            expect(await saveProductImage('prod_empty', '')).toBeNull();
        });
    });
});
