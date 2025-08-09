-- ============================================
-- FRONTSNAP PERFORMANCE INDEXES - CORRECTED VERSION
-- ============================================
-- This version uses the EXACT column names from your database
-- Copy and paste this ENTIRE file into Supabase SQL Editor
-- ============================================

-- 1. PLACES TABLE INDEXES
-- Location-based queries with category (for finding nearby places)
CREATE INDEX IF NOT EXISTS idx_places_location_category 
ON places (latitude, longitude, category)
WHERE is_public = true;

-- Public places sorted by rating (for discovery/explore features)
CREATE INDEX IF NOT EXISTS idx_places_public_rating 
ON places (is_public, rating DESC) 
WHERE is_public = true;

-- Places added by a specific user (using added_by, not user_id)
CREATE INDEX IF NOT EXISTS idx_places_added_by 
ON places (added_by, created_at DESC);

-- 2. REVIEWS TABLE INDEX
-- Reviews for a specific place
CREATE INDEX IF NOT EXISTS idx_reviews_place_rating 
ON reviews (place_id, rating);

-- 3. COLLECTION_PLACES TABLE INDEX
-- Places in a collection (using created_at, not added_at)
CREATE INDEX IF NOT EXISTS idx_collection_places_collection 
ON collection_places (collection_id, created_at DESC);

-- 4. USER_CONNECTIONS TABLE INDEX
-- User's connections and friends
CREATE INDEX IF NOT EXISTS idx_user_connections_compound 
ON user_connections (user_id, status, created_at DESC);

-- 5. HIDDEN_GEMS TABLE INDEXES
-- User's hidden gems status
CREATE INDEX IF NOT EXISTS idx_hidden_gems_user_status 
ON hidden_gems (user_id, found, created_at DESC);

-- Hidden gems by city for location-based lookups
CREATE INDEX IF NOT EXISTS idx_hidden_gems_city 
ON hidden_gems (city, active)
WHERE active = true;

-- 6. FRIEND_ACTIVITIES TABLE INDEX
-- Friend activity feed
CREATE INDEX IF NOT EXISTS idx_friend_activities_user_time 
ON friend_activities (user_id, created_at DESC);

-- 7. PROFILES TABLE INDEX
-- Users with social features enabled
CREATE INDEX IF NOT EXISTS idx_profiles_social_features 
ON profiles (allow_social_features) 
WHERE allow_social_features = true;

-- 8. COLLECTIONS TABLE INDEX (if needed)
-- User's collections
CREATE INDEX IF NOT EXISTS idx_collections_user 
ON collections (user_id, created_at DESC);

-- ============================================
-- UPDATE STATISTICS
-- ============================================
-- This helps PostgreSQL optimize queries
ANALYZE places;
ANALYZE reviews;
ANALYZE collection_places;
ANALYZE collections;
ANALYZE user_connections;
ANALYZE hidden_gems;
ANALYZE friend_activities;
ANALYZE profiles;

-- ============================================
-- VERIFY INDEXES WERE CREATED
-- ============================================
SELECT 
    tablename AS "Table",
    indexname AS "Index Name",
    pg_size_pretty(pg_relation_size(schemaname||'.'||indexname)) AS "Size"
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- ============================================
-- CHECK QUERY PERFORMANCE (Optional)
-- ============================================
-- You can run this to see the most expensive queries:
-- SELECT * FROM pg_stat_statements 
-- ORDER BY total_time DESC 
-- LIMIT 10;