import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { rateLimit } from 'express-rate-limit';
import apiRoutes from './routes/index.js';
import fs from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Configuración de CORS segura para producción
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : [];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (process.env.NODE_ENV !== 'production') return callback(null, true);
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error('Bloqueado por CORS: Origen no autorizado en producción.'));
    }
}));

app.use(express.json({ limit: '10mb' }));

// Limitador de tasa para endpoints de la API
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    limit: 100, // Límite de 100 peticiones por IP en el lapso de tiempo
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Demasiadas peticiones desde esta dirección IP, por favor intente más tarde.' }
});
app.use('/api', limiter);

// Montaje de las rutas agrupadas bajo el prefijo /api
app.use('/api', apiRoutes);

// Servir frontend estático en producción (Docker / Despliegue en contenedor único)
const staticDir = process.env.STATIC_DIR || path.resolve(__dirname, 'public');
if (fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.get(/^(?!\/api).*/, (_req, res) => {
        res.sendFile(path.join(staticDir, 'index.html'));
    });
}

// Inicialización del servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Rachel Gameflip proxy server running on http://localhost:${PORT}`);
});