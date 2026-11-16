-- =========================================================================
-- Supabase Migration: Support multiple images per product (image_paths array)
-- Run in the Supabase SQL Editor (https://supabase.com/dashboard)
-- =========================================================================

-- 1. Add image_paths column as TEXT[] if it does not exist
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS image_paths TEXT[] DEFAULT '{}';

-- 2. Populate image_paths for existing products from image_path
UPDATE products 
SET image_paths = ARRAY[image_path] 
WHERE (image_paths IS NULL OR cardinality(image_paths) = 0) 
  AND image_path IS NOT NULL 
  AND image_path <> '';
