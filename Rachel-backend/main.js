import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { rateLimit } from 'express-rate-limit';
import apiRoutes from './routes/index.js';
import fs from 'fs';
import { startAutoPurgeWorker } from './services/autoPurge.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config();

const app = express();

// Secure and flexible CORS configuration for production and development
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
    : [];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (e.g. curl, Postman, server-to-server)
        if (!origin) return callback(null, true);
        // If in development or no whitelist specified, allow
        if (process.env.NODE_ENV !== 'production' || allowedOrigins.length === 0 || allowedOrigins.includes('*')) {
            return callback(null, true);
        }
        if (allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`Blocked by CORS: Origin '${origin}' not authorized in production.`));
    },
    credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// Rate limiter for API endpoints
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit of 100 requests per IP per window
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many requests from this IP address, please try again later.' }
});
app.use('/api', limiter);

// Mount routes grouped under /api prefix
app.use('/api', apiRoutes);

// Serve static frontend in production (Docker / single container deployment)
const staticDir = process.env.STATIC_DIR || path.resolve(__dirname, 'public');
if (fs.existsSync(staticDir)) {
    app.use(express.static(staticDir));
    app.get(/^(?!\/api).*/, (_req, res) => {
        res.sendFile(path.join(staticDir, 'index.html'));
    });
}

// Centralized error handling middleware
app.use((err, _req, res, _next) => {
    console.error('Unhandled server error:', err.message);
    const status = err.status || 500;
    res.status(status).json({ error: err.message || 'Internal server error' });
});

// Server initialization
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Rachel Gameflip proxy server running on http://localhost:${PORT}`);
    startAutoPurgeWorker();
});