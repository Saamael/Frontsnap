-- Add performance indexes for FrontSnap application
-- These indexes will significantly improve query performance

-- Composite index for location-based queries with category filtering
CREATE INDEX IF NOT EXISTS idx_places_location_category 
ON places (latitude, longitude, category)
WHERE is_public = true;

-- Index for public places sorted by rating (for discovery features)
CREATE INDEX IF NOT EXISTS idx_places_public_rating 
ON places (is_public, rating DESC) 
WHERE is_public = true;

-- Index for reviews by place and rating
CREATE INDEX IF NOT EXISTS idx_reviews_place_rating 
ON reviews (place_id, rating);

-- Compound index for user connections queries
CREATE INDEX IF NOT EXISTS idx_user_connections_compound 
ON user_connections (user_id, status, created_at DESC);

-- Index for collection places (improves collection loading)
CREATE INDEX IF NOT EXISTS idx_collection_places_collection 
ON collection_places (collection_id, added_at DESC);

-- Index for user places (improves user profile queries)
CREATE INDEX IF NOT EXISTS idx_places_user_created 
ON places (user_id, created_at DESC);

-- Index for hidden gems by user and status
CREATE INDEX IF NOT EXISTS idx_hidden_gems_user_status 
ON hidden_gems (user_id, found, created_at DESC);

-- Index for friend activities
CREATE INDEX IF NOT EXISTS idx_friend_activities_user_time 
ON friend_activities (user_id, created_at DESC);

-- Index for social features opt-in users
CREATE INDEX IF NOT EXISTS idx_profiles_social_features 
ON profiles (allow_social_features) 
WHERE allow_social_features = true;

-- Spatial index for location-based queries (if PostGIS is available)
-- Uncomment if you have PostGIS extension enabled:
-- CREATE INDEX IF NOT EXISTS idx_places_location_gist 
-- ON places USING GIST (
--   ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
-- );

-- Analyze tables to update statistics after index creation
ANALYZE places;
ANALYZE reviews;
ANALYZE user_connections;
ANALYZE collection_places;
ANALYZE hidden_gems;
ANALYZE friend_activities;
ANALYZE profiles;