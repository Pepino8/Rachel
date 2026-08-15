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
                return res.status(400).json({ error: 'Validación de datos fallida', details: formattedErrors });
            }
            next(error);
        }
    };
}

export const loginSchema = z.object({
    username: z.string().min(1, 'El nombre de usuario es requerido'),
    password: z.string().min(1, 'La contraseña es requerida')
});

export const registerSchema = z.object({
    username: z.string().min(3, 'El nombre de usuario debe tener al menos 3 caracteres'),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres')
});

export const updateProfileSchema = z.object({
    username: z.string().min(3, 'El nombre de usuario debe tener al menos 3 caracteres').optional(),
    password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres').optional(),
    confirmPassword: z.string().min(6, 'La confirmación debe tener al menos 6 caracteres').optional()
}).refine(data => {
    if (data.password && data.password !== data.confirmPassword) {
        return false;
    }
    return true;
}, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword']
});

export const linkGameflipSchema = z.object({
    apiKey: z.string().min(1, 'La clave de API de Gameflip es requerida'),
    totpSecret: z.string().min(1, 'El secreto TOTP es requerido')
});

export const saveProductSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1, 'El nombre del producto es requerido'),
    description: z.string().optional().nullable(),
    price: z.number().nonnegative('El precio debe ser un número mayor o igual a cero'),
    category: z.string().min(1, 'La categoría es requerida'),
    auto_post: z.boolean().optional(),
    image: z.string().min(1, 'La imagen en base64 es requerida')
});

export const updateProductSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    price: z.number().nonnegative().optional(),
    category: z.string().optional(),
    auto_post: z.boolean().optional(),
    image: z.string().optional()
});

export const createListingSchema = z.object({
    name: z.string().min(1, 'El nombre del listado es requerido'),
    description: z.string().optional().nullable(),
    price: z.union([z.string(), z.number()]),
    category: z.string().min(1, 'La categoría es requerida'),
    product_id: z.string().min(1, 'El ID de producto es requerido')
});

export const importProductSchema = z.object({
    url: z.string().min(1, 'URL or ID is required')
});

