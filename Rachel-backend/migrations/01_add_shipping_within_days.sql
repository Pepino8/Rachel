-- =========================================================================
-- Supabase Migration: Delivery time for products (1 to 3 days maximum)
-- Run in the Supabase SQL Editor (https://supabase.com/dashboard)
-- =========================================================================

-- 1. Add shipping_within_days column if it does not exist (defaults to 1 day)
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS shipping_within_days INTEGER DEFAULT 1;

-- 2. Ensure existing records have the default value 1 if NULL
UPDATE products 
SET shipping_within_days = 1 
WHERE shipping_within_days IS NULL;

-- 3. Add CHECK constraint to enforce values between 1 and 3 days
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_shipping_within_days'
    ) THEN
        ALTER TABLE products 
        ADD CONSTRAINT check_shipping_within_days 
        CHECK (shipping_within_days >= 1 AND shipping_within_days <= 3);
    END IF;
END $$;
