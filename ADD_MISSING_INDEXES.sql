-- ============================================
-- ADD ONLY MISSING PERFORMANCE INDEXES
-- ============================================
-- Based on your existing indexes, here are the ones that would help
-- ============================================

-- 1. COMPOSITE INDEX for location + category searches
-- You have idx_places_location and idx_places_category separately
-- This composite index will speed up "find Italian restaurants near me" type queries
CREATE INDEX IF NOT EXISTS idx_places_location_category 
ON places (latitude, longitude, category)
WHERE is_public = true;

-- 2. INDEX for public places sorted by rating
-- This will speed up "top rated places" queries
CREATE INDEX IF NOT EXISTS idx_places_public_rating 
ON places (is_public, rating DESC) 
WHERE is_public = true;

-- 3. COMPOSITE INDEX for user connections with status and time
-- You have separate indexes, but this composite helps with friend feed queries
CREATE INDEX IF NOT EXISTS idx_user_connections_compound 
ON user_connections (user_id, status, created_at DESC);

-- 4. COMPOSITE INDEX for reviews by place and rating
-- Speeds up loading reviews sorted by rating for a specific place
CREATE INDEX IF NOT EXISTS idx_reviews_place_rating 
ON reviews (place_id, rating DESC);

-- 5. COLLECTION_PLACES sorted by creation time
-- Speeds up loading places in a collection in order
CREATE INDEX IF NOT EXISTS idx_collection_places_collection_sorted
ON collection_places (collection_id, created_at DESC);

-- 6. HIDDEN_GEMS by user and found status
-- You have city indexes but not user-specific ones
CREATE INDEX IF NOT EXISTS idx_hidden_gems_user_found
ON hidden_gems (user_id, found, created_at DESC);

-- ============================================
-- OPTIMIZE TABLES
-- ============================================
ANALYZE places;
ANALYZE reviews;
ANALYZE collection_places;
ANALYZE collections;
ANALYZE user_connections;
ANALYZE hidden_gems;
ANALYZE friend_activities;
ANALYZE profiles;

-- ============================================
-- SHOW NEW INDEXES CREATED
-- ============================================
SELECT 
    'Created new index: ' || i.relname as message
FROM pg_class t, pg_class i, pg_index ix
WHERE t.oid = ix.indrelid
AND i.oid = ix.indexrelid
AND i.relname IN (
    'idx_places_location_category',
    'idx_places_public_rating',
    'idx_user_connections_compound',
    'idx_reviews_place_rating',
    'idx_collection_places_collection_sorted',
    'idx_hidden_gems_user_found'
);