import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DATABASE_PATH || path.resolve(__dirname, '../rachel.db');
const dbDir = path.dirname(dbPath);
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}
const db = new Database(dbPath);

// Activar WAL y llaves foráneas para rendimiento e integridad
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT,
        username TEXT,
        gameflip_api_key_enc TEXT,
        gameflip_totp_secret_enc TEXT,
        created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS products (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        category TEXT,
        auto_post INTEGER DEFAULT 0,
        image_path TEXT,
        created_at TEXT DEFAULT (datetime('now')),
        updated_at TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS listings (
        id TEXT PRIMARY KEY,
        user_id TEXT,
        product_id TEXT,
        gameflip_id TEXT,
        status TEXT,
        posted_at TEXT DEFAULT (datetime('now')),
        expires_at TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
    );

    CREATE TABLE IF NOT EXISTS agent_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT,
        agent TEXT,
        action TEXT,
        detail TEXT,
        timestamp TEXT DEFAULT (datetime('now')),
        FOREIGN KEY (user_id) REFERENCES users(id)
    );
`);

// Semilla inicial
try {
    const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
    if (productCount === 0) {
        db.prepare(`
            INSERT INTO products (id, name, description, price, category, auto_post)
            VALUES ('seed-prod-1', 'Test Product', 'This is a test product seeded on startup', 1.00, 'ingame-item', 1)
        `).run();
        console.log('Seeded initial test product in SQLite database.');
    }
} catch (err) {
    console.error('Failed to seed default product:', err.message);
}

// Migraciones de tablas
try {
    const columns = db.prepare('PRAGMA table_info(products)').all();
    if (!columns.some((col) => col.name === 'image_path')) {
        db.exec('ALTER TABLE products ADD COLUMN image_path TEXT');
    }
} catch (err) {
    console.error('Failed to migrate products table:', err.message);
}

try {
    const columns = db.prepare('PRAGMA table_info(users)').all();
    if (!columns.some((col) => col.name === 'password')) {
        db.exec('ALTER TABLE users ADD COLUMN password TEXT');
    }
} catch (err) {
    console.error('Failed to migrate users table:', err.message);
}

export default db;
