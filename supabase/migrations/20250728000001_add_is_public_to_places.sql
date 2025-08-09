-- Add is_public column to places table for visibility control
-- This allows us to save all places to database but only show public ones in discovery

ALTER TABLE places ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT FALSE;

-- Add index for performance when filtering public places
CREATE INDEX IF NOT EXISTS idx_places_is_public ON places(is_public);

-- Create index for duplicate detection by google_place_id and public status
CREATE INDEX IF NOT EXISTS idx_places_google_place_id_public ON places(google_place_id, is_public);

-- Update existing places to be public (backward compatibility)
-- This ensures all current places remain visible
UPDATE places SET is_public = TRUE WHERE is_public IS NULL;

-- Add comment to document the column purpose
COMMENT ON COLUMN places.is_public IS 'Controls whether place is visible in public discovery. Private places are saved but hidden from other users.';