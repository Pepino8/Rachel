import { z } from 'zod';

export function validateBody(schema) {
    return (req, res, next) => {
        try {
            schema.parse(req.body);
            next();
        } catch (error) {
            if (error instanceof z.ZodError) {
                const formattedErrors = error.errors.map(err => ({
                    field: err.path.join('.'),
                    message: err.message
                }));
                return res.status(400).json({ error: 'Data validation failed', details: formattedErrors });
            }
            next(error);
        }
    };
}

export const loginSchema = z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required')
});

export const registerSchema = z.object({
    username: z.string().min(3, 'Username must be at least 3 characters'),
    password: z.string().min(6, 'Password must be at least 6 characters')
});

export const updateProfileSchema = z.object({
    username: z.string().min(3, 'Username must be at least 3 characters').optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
    confirmPassword: z.string().min(6, 'Confirmation must be at least 6 characters').optional()
}).refine(data => {
    if (data.password && data.password !== data.confirmPassword) {
        return false;
    }
    return true;
}, {
    message: 'Passwords do not match',
    path: ['confirmPassword']
});

export const linkGameflipSchema = z.object({
    apiKey: z.string().min(1, 'Gameflip API key is required'),
    totpSecret: z.string().min(1, 'TOTP secret is required')
});

export const saveProductSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1, 'Product name is required'),
    description: z.string().optional().nullable(),
    price: z.number().nonnegative('Price must be a number greater than or equal to zero'),
    category: z.string().min(1, 'Category is required'),
    auto_post: z.boolean().optional(),
    image: z.string().optional(),
    images: z.array(z.string()).max(4, 'Maximum of 4 images allowed').optional(),
    game: z.string().optional().nullable(),
    game_mode: z.string().optional().nullable(),
    game_category: z.string().optional().nullable(),
    shipping_within_days: z.coerce.number().int().min(1, 'Delivery time must be at least 1 day').max(3, 'Delivery time cannot exceed 3 days').optional()
}).refine(data => Boolean(data.image || (Array.isArray(data.images) && data.images.length > 0)), {
    message: 'At least one product image is required',
    path: ['image']
});

export const updateProductSchema = z.object({
    name: z.string().min(1, 'Product name cannot be empty').optional(),
    description: z.string().optional().nullable(),
    price: z.number().nonnegative('Price must be a number greater than or equal to zero').optional(),
    category: z.string().optional(),
    auto_post: z.boolean().optional(),
    image: z.string().optional(),
    images: z.array(z.string()).max(4, 'Maximum of 4 images allowed').optional(),
    game: z.string().optional().nullable(),
    game_mode: z.string().optional().nullable(),
    game_category: z.string().optional().nullable(),
    shipping_within_days: z.coerce.number().int().min(1, 'Delivery time must be at least 1 day').max(3, 'Delivery time cannot exceed 3 days').optional()
});

export const createListingSchema = z.object({
    name: z.string().min(1, 'Listing name is required'),
    description: z.string().optional().nullable(),
    price: z.union([z.string(), z.number()]),
    category: z.string().min(1, 'Category is required'),
    product_id: z.string().min(1, 'Product ID is required'),
    shipping_within_days: z.coerce.number().int().min(1, 'Delivery time must be at least 1 day').max(3, 'Delivery time cannot exceed 3 days').optional()
});

export const importProductSchema = z.object({
    url: z.string().min(1, 'URL or ID is required')
});

