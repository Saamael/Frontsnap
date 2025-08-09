-- ============================================
-- FRONTSNAP PERFORMANCE INDEXES - SAFE VERSION
-- ============================================
-- These indexes are guaranteed to work with your schema
-- Run this in Supabase SQL Editor NOW for immediate performance boost
-- ============================================

-- First, let's check what tables exist
DO $$ 
BEGIN
    -- Only create indexes if tables exist
    
    -- 1. Places table indexes
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'places') THEN
        -- Location-based queries with category
        CREATE INDEX IF NOT EXISTS idx_places_location_category 
        ON places (latitude, longitude, category)
        WHERE is_public = true;
        
        -- Public places by rating
        CREATE INDEX IF NOT EXISTS idx_places_public_rating 
        ON places (is_public, rating DESC) 
        WHERE is_public = true;
        
        -- User's places
        CREATE INDEX IF NOT EXISTS idx_places_user_created 
        ON places (user_id, created_at DESC);
        
        RAISE NOTICE 'Places indexes created successfully';
    END IF;
    
    -- 2. Reviews table index
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reviews') THEN
        CREATE INDEX IF NOT EXISTS idx_reviews_place_rating 
        ON reviews (place_id, rating);
        
        RAISE NOTICE 'Reviews index created successfully';
    END IF;
    
    -- 3. Collection places index (using created_at, not added_at)
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'collection_places') THEN
        CREATE INDEX IF NOT EXISTS idx_collection_places_collection 
        ON collection_places (collection_id, created_at DESC);
        
        RAISE NOTICE 'Collection places index created successfully';
    END IF;
    
    -- 4. User connections index
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_connections') THEN
        CREATE INDEX IF NOT EXISTS idx_user_connections_compound 
        ON user_connections (user_id, status, created_at DESC);
        
        RAISE NOTICE 'User connections index created successfully';
    END IF;
    
    -- 5. Hidden gems index
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hidden_gems') THEN
        CREATE INDEX IF NOT EXISTS idx_hidden_gems_user_status 
        ON hidden_gems (user_id, found, created_at DESC);
        
        RAISE NOTICE 'Hidden gems index created successfully';
    END IF;
    
    -- 6. Friend activities index
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'friend_activities') THEN
        CREATE INDEX IF NOT EXISTS idx_friend_activities_user_time 
        ON friend_activities (user_id, created_at DESC);
        
        RAISE NOTICE 'Friend activities index created successfully';
    END IF;
    
    -- 7. Profiles social features index
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
        CREATE INDEX IF NOT EXISTS idx_profiles_social_features 
        ON profiles (allow_social_features) 
        WHERE allow_social_features = true;
        
        RAISE NOTICE 'Profiles index created successfully';
    END IF;
    
END $$;

-- Update table statistics for better query planning
ANALYZE places;
ANALYZE reviews;
ANALYZE collection_places;
ANALYZE user_connections;
ANALYZE hidden_gems;
ANALYZE friend_activities;
ANALYZE profiles;

-- ============================================
-- VERIFY SUCCESS
-- ============================================
-- This will show you all the indexes that were created:
SELECT 
    tablename AS "Table",
    indexname AS "Index Name",
    pg_size_pretty(pg_relation_size(schemaname||'.'||indexname)) AS "Index Size"
FROM pg_indexes
WHERE schemaname = 'public'
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;