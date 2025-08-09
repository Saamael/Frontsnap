-- Add thumbnail support for two-tier image system
-- This enables fast loading thumbnails (800px) on discover page
-- while maintaining high-quality full-size images (2K) for detail views

-- Add thumbnail_url column to places table
ALTER TABLE places ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Add thumbnail_url column to place_photos table  
ALTER TABLE place_photos ADD COLUMN IF NOT EXISTS thumbnail_url text;

-- Add thumbnail_url column to hidden_gems table
ALTER TABLE hidden_gems ADD COLUMN IF NOT EXISTS hint_thumbnail_url text;

-- Create index for thumbnail URLs (for faster queries)
CREATE INDEX IF NOT EXISTS idx_places_thumbnail_url ON places(thumbnail_url);
CREATE INDEX IF NOT EXISTS idx_place_photos_thumbnail_url ON place_photos(thumbnail_url);

-- Update existing records to use full image as thumbnail temporarily
-- (These will be updated with proper thumbnails as images are re-uploaded)
UPDATE places SET thumbnail_url = image_url WHERE thumbnail_url IS NULL AND image_url IS NOT NULL;
UPDATE place_photos SET thumbnail_url = image_url WHERE thumbnail_url IS NULL AND image_url IS NOT NULL;
UPDATE hidden_gems SET hint_thumbnail_url = hint_image_url WHERE hint_thumbnail_url IS NULL AND hint_image_url IS NOT NULL;