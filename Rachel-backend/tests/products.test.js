import { describe, it, expect, vi, beforeEach } from 'vitest';
import { saveProductSchema, updateProductSchema, createListingSchema } from '../middleware/validation.js';

describe('Products & Listings Validation - Delivery Time (shipping_within_days)', () => {
    describe('saveProductSchema', () => {
        const validBaseProduct = {
            id: 'prod_test_123',
            name: 'Test Weapon',
            price: 5.99,
            category: 'ingame-item',
            image: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
        };

        it('should accept valid shipping_within_days between 1 and 3', () => {
            for (let days = 1; days <= 3; days++) {
                const parsed = saveProductSchema.parse({
                    ...validBaseProduct,
                    shipping_within_days: days
                });
                expect(parsed.shipping_within_days).toBe(days);
            }
        });

        it('should coerce string numbers to integer between 1 and 3', () => {
            const parsed = saveProductSchema.parse({
                ...validBaseProduct,
                shipping_within_days: '2'
            });
            expect(parsed.shipping_within_days).toBe(2);
        });

        it('should reject shipping_within_days less than 1', () => {
            expect(() => {
                saveProductSchema.parse({
                    ...validBaseProduct,
                    shipping_within_days: 0
                });
            }).toThrow();
        });

        it('should reject shipping_within_days greater than 3', () => {
            expect(() => {
                saveProductSchema.parse({
                    ...validBaseProduct,
                    shipping_within_days: 4
                });
            }).toThrow();
        });

        it('should allow optional shipping_within_days when not provided', () => {
            const parsed = saveProductSchema.parse(validBaseProduct);
            expect(parsed.shipping_within_days).toBeUndefined();
        });

        it('should accept multiple images in images array', () => {
            const parsed = saveProductSchema.parse({
                id: 'prod_multi',
                name: 'Multi Image Product',
                price: 10,
                category: 'ingame-item',
                images: [
                    'data:image/png;base64,image1',
                    'data:image/png;base64,image2'
                ]
            });
            expect(parsed.images).toHaveLength(2);
        });

        it('should reject when more than 4 images are provided', () => {
            expect(() => {
                saveProductSchema.parse({
                    id: 'prod_too_many',
                    name: 'Too Many Images',
                    price: 10,
                    category: 'ingame-item',
                    images: ['img1', 'img2', 'img3', 'img4', 'img5']
                });
            }).toThrow(/Maximum of 4 images allowed/);
        });

        it('should reject when neither image nor images are provided', () => {
            expect(() => {
                saveProductSchema.parse({
                    id: 'prod_no_img',
                    name: 'No Image Product',
                    price: 10,
                    category: 'ingame-item'
                });
            }).toThrow(/At least one product image is required/);
        });
    });

    describe('updateProductSchema', () => {
        it('should accept images array in updateProductSchema', () => {
            const parsed = updateProductSchema.parse({
                images: ['https://example.com/img1.png', 'https://example.com/img2.png']
            });
            expect(parsed.images).toHaveLength(2);
        });
        it('should accept shipping_within_days from 1 to 3', () => {
            expect(() => updateProductSchema.parse({ shipping_within_days: 1 })).not.toThrow();
            expect(() => updateProductSchema.parse({ shipping_within_days: 2 })).not.toThrow();
            expect(() => updateProductSchema.parse({ shipping_within_days: 3 })).not.toThrow();
        });

        it('should reject invalid delivery days (0 or 4+)', () => {
            expect(() => updateProductSchema.parse({ shipping_within_days: 0 })).toThrow();
            expect(() => updateProductSchema.parse({ shipping_within_days: 5 })).toThrow();
        });
    });

    describe('createListingSchema', () => {
        const validListing = {
            name: 'Test Listing',
            price: 4.99,
            category: 'ingame-item',
            product_id: 'prod_123'
        };

        it('should accept shipping_within_days from 1 to 3', () => {
            const parsed = createListingSchema.parse({
                ...validListing,
                shipping_within_days: 2
            });
            expect(parsed.shipping_within_days).toBe(2);
        });

        it('should reject shipping_within_days outside 1-3', () => {
            expect(() => createListingSchema.parse({ ...validListing, shipping_within_days: 0 })).toThrow();
            expect(() => createListingSchema.parse({ ...validListing, shipping_within_days: 4 })).toThrow();
        });
    });
});
