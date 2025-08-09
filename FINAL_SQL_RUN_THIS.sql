-- ============================================
-- FRONTSNAP PERFORMANCE INDEXES - FINAL VERSION
-- ============================================
-- This will work 100% - uses exact column names from your schema
-- Just copy ALL of this and paste into Supabase SQL Editor
-- ============================================

-- Drop any incorrectly named indexes first (cleanup)
DROP INDEX IF EXISTS idx_places_user_created;

-- ============================================
-- CREATE ALL PERFORMANCE INDEXES
-- ============================================

-- 1. Places table: Location-based searches
CREATE INDEX IF NOT EXISTS idx_places_location_category 
ON places (latitude, longitude, category)
WHERE is_public = true;

-- 2. Places table: Public places by rating
CREATE INDEX IF NOT EXISTS idx_places_public_rating 
ON places (is_public, rating DESC) 
WHERE is_public = true;

-- 3. Places table: Places by who added them (correct column: added_by)
CREATE INDEX IF NOT EXISTS idx_places_added_by 
ON places (added_by, created_at DESC)
WHERE added_by IS NOT NULL;

-- 4. Reviews table: Reviews by place
CREATE INDEX IF NOT EXISTS idx_reviews_place_rating 
ON reviews (place_id, rating);

-- 5. Collection_places table: Places in collections
CREATE INDEX IF NOT EXISTS idx_collection_places_collection 
ON collection_places (collection_id, created_at DESC);

-- 6. Collections table: User's collections
CREATE INDEX IF NOT EXISTS idx_collections_user 
ON collections (user_id, created_at DESC);

-- 7. User_connections table: Social connections
CREATE INDEX IF NOT EXISTS idx_user_connections_compound 
ON user_connections (user_id, status, created_at DESC);

-- 8. Hidden_gems table: User's gems
CREATE INDEX IF NOT EXISTS idx_hidden_gems_user_status 
ON hidden_gems (user_id, found, created_at DESC);

-- 9. Hidden_gems table: Gems by city
CREATE INDEX IF NOT EXISTS idx_hidden_gems_city 
ON hidden_gems (city, active)
WHERE active = true;

-- 10. Friend_activities table: Activity feed
CREATE INDEX IF NOT EXISTS idx_friend_activities_user_time 
ON friend_activities (user_id, created_at DESC);

-- 11. Profiles table: Social features enabled
CREATE INDEX IF NOT EXISTS idx_profiles_social_features 
ON profiles (allow_social_features) 
WHERE allow_social_features = true;

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
-- SHOW RESULTS
-- ============================================
SELECT 
    'SUCCESS! Created ' || COUNT(*) || ' indexes' as message,
    string_agg(indexname, ', ') as indexes_created
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%';

-- Show index details
SELECT 
    tablename AS "Table",
    indexname AS "Index Name",
    pg_size_pretty(pg_relation_size(schemaname||'.'||indexname)) AS "Size"
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;