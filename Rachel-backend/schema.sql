-- =========================================================================
-- Complete Schema for Supabase (PostgreSQL) - Rachel AutoPoster
-- =========================================================================

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT,
    username TEXT UNIQUE,
    password TEXT NOT NULL,
    gameflip_api_key_enc TEXT,
    gameflip_totp_secret_enc TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table (local inventory)
CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL,
    category TEXT,
    auto_post INTEGER DEFAULT 0,
    image_path TEXT,
    shipping_within_days INTEGER DEFAULT 1 CHECK (shipping_within_days >= 1 AND shipping_within_days <= 3),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Listings table (mapping to Gameflip)
CREATE TABLE IF NOT EXISTS listings (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    product_id TEXT REFERENCES products(id) ON DELETE SET NULL,
    gameflip_id TEXT,
    status TEXT,
    posted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

-- Agent logs table
CREATE TABLE IF NOT EXISTS agent_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    agent TEXT,
    action TEXT,
    detail TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
