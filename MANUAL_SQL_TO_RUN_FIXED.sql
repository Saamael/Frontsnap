-- ============================================
-- FRONTSNAP DATABASE PERFORMANCE INDEXES (FIXED)
-- ============================================
-- Run this SQL directly in your Supabase SQL Editor
-- Go to: https://app.supabase.com/project/YOUR_PROJECT/sql/new
-- ============================================

-- 1. Composite index for location-based queries with category filtering
-- This speeds up queries that search for places near a location with specific categories
CREATE INDEX IF NOT EXISTS idx_places_location_category 
ON places (latitude, longitude, category)
WHERE is_public = true;

-- 2. Index for public places sorted by rating (for discovery features)
-- This speeds up queries that show top-rated public places
CREATE INDEX IF NOT EXISTS idx_places_public_rating 
ON places (is_public, rating DESC) 
WHERE is_public = true;

-- 3. Index for reviews by place and rating
-- This speeds up loading reviews for a specific place
CREATE INDEX IF NOT EXISTS idx_reviews_place_rating 
ON reviews (place_id, rating);

-- 4. Compound index for user connections queries
-- This speeds up friend list and connection status queries
CREATE INDEX IF NOT EXISTS idx_user_connections_compound 
ON user_connections (user_id, status, created_at DESC);

-- 5. Index for collection places (FIXED: using created_at instead of added_at)
-- This speeds up loading places within a collection
CREATE INDEX IF NOT EXISTS idx_collection_places_collection 
ON collection_places (collection_id, created_at DESC);

-- 6. Index for user places (improves user profile queries)
-- This speeds up loading all places created by a specific user
CREATE INDEX IF NOT EXISTS idx_places_user_created 
ON places (user_id, created_at DESC);

-- 7. Index for hidden gems by user and status
-- This speeds up checking if user has found hidden gems
CREATE INDEX IF NOT EXISTS idx_hidden_gems_user_status 
ON hidden_gems (user_id, found, created_at DESC);

-- 8. Index for friend activities
-- This speeds up loading friend activity feed
CREATE INDEX IF NOT EXISTS idx_friend_activities_user_time 
ON friend_activities (user_id, created_at DESC);

-- 9. Index for social features opt-in users
-- This speeds up finding users who have enabled social features
CREATE INDEX IF NOT EXISTS idx_profiles_social_features 
ON profiles (allow_social_features) 
WHERE allow_social_features = true;

-- ============================================
-- UPDATE STATISTICS
-- ============================================
-- This helps the query planner make better decisions
ANALYZE places;
ANALYZE reviews;
ANALYZE user_connections;
ANALYZE collection_places;
ANALYZE hidden_gems;
ANALYZE friend_activities;
ANALYZE profiles;

-- ============================================
-- VERIFY INDEXES WERE CREATED
-- ============================================
-- Run this query to see all indexes on your tables:
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('places', 'reviews', 'user_connections', 'collection_places', 'hidden_gems', 'friend_activities', 'profiles')
ORDER BY tablename, indexname;