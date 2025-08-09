-- ============================================
-- PERFORMANCE INDEXES - CORRECTED FOR YOUR SCHEMA
-- ============================================
-- This version uses the ACTUAL column names from your database
-- ============================================

-- 1. PLACES: Composite index for location + category searches
-- Speeds up "find Italian restaurants near me" queries
CREATE INDEX IF NOT EXISTS idx_places_location_category 
ON places (latitude, longitude, category)
WHERE is_public = true;

-- 2. PLACES: Public places sorted by rating
-- Speeds up "top rated places" queries
CREATE INDEX IF NOT EXISTS idx_places_public_rating 
ON places (is_public, rating DESC) 
WHERE is_public = true;

-- 3. PLACES: Places by user sorted by time
-- Note: Using 'added_by' column (NOT user_id)
CREATE INDEX IF NOT EXISTS idx_places_added_by_time
ON places (added_by, created_at DESC)
WHERE added_by IS NOT NULL;

-- 4. USER_CONNECTIONS: Composite for friend queries
-- Speeds up friend list and activity queries
CREATE INDEX IF NOT EXISTS idx_user_connections_compound 
ON user_connections (user_id, status, created_at DESC);

-- 5. REVIEWS: Reviews by place and rating
-- Speeds up loading reviews sorted by rating
CREATE INDEX IF NOT EXISTS idx_reviews_place_rating 
ON reviews (place_id, rating DESC);

-- 6. COLLECTION_PLACES: Sorted by time
-- Speeds up loading collection contents in order
CREATE INDEX IF NOT EXISTS idx_collection_places_sorted
ON collection_places (collection_id, created_at DESC);

-- 7. HIDDEN_GEMS: By winner (instead of user_id/found)
-- Speeds up checking if someone has won a gem
CREATE INDEX IF NOT EXISTS idx_hidden_gems_winner
ON hidden_gems (winner_id, created_at DESC)
WHERE winner_id IS NOT NULL;

-- 8. HIDDEN_GEMS: Active gems by city and time
-- Speeds up finding active gems in a city
CREATE INDEX IF NOT EXISTS idx_hidden_gems_active_city
ON hidden_gems (city, is_active, created_at DESC)
WHERE is_active = true;

-- 9. FRIEND_ACTIVITIES: Composite for feed queries
-- You already have idx_friend_activities_user_created, but this adds type
CREATE INDEX IF NOT EXISTS idx_friend_activities_feed
ON friend_activities (user_id, activity_type, created_at DESC);

-- 10. PROFILES: Social features with location
-- Speeds up finding nearby users with social enabled
CREATE INDEX IF NOT EXISTS idx_profiles_social_location
ON profiles (allow_social_features, city)
WHERE allow_social_features = true;

-- ============================================
-- OPTIMIZE QUERY PLANNER
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
-- VERIFY NEW INDEXES
-- ============================================
SELECT 
    indexname as "New Index Created",
    tablename as "On Table",
    pg_size_pretty(pg_relation_size(schemaname||'.'||indexname)) AS "Size"
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname IN (
    'idx_places_location_category',
    'idx_places_public_rating',
    'idx_places_added_by_time',
    'idx_user_connections_compound',
    'idx_reviews_place_rating',
    'idx_collection_places_sorted',
    'idx_hidden_gems_winner',
    'idx_hidden_gems_active_city',
    'idx_friend_activities_feed',
    'idx_profiles_social_location'
)
ORDER BY tablename, indexname;

-- Show total count
SELECT COUNT(*) || ' new indexes created' as result
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname IN (
    'idx_places_location_category',
    'idx_places_public_rating',
    'idx_places_added_by_time',
    'idx_user_connections_compound',
    'idx_reviews_place_rating',
    'idx_collection_places_sorted',
    'idx_hidden_gems_winner',
    'idx_hidden_gems_active_city',
    'idx_friend_activities_feed',
    'idx_profiles_social_location'
);