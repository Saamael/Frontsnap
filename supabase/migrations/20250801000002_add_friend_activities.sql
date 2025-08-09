-- Add Friend Activity Tracking System
-- Phase 2: Track user activities for social feed

-- 1. Create friend activities table
CREATE TABLE IF NOT EXISTS friend_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  activity_type text CHECK (activity_type IN ('place_added', 'collection_created', 'place_saved', 'review_added', 'hidden_gem_found')) NOT NULL,
  place_id uuid REFERENCES places(id) ON DELETE CASCADE,
  collection_id uuid REFERENCES collections(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- 1a. Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_friend_activities_user_created ON friend_activities(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friend_activities_type_created ON friend_activities(activity_type, created_at DESC);

-- 2. Enable RLS
ALTER TABLE friend_activities ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Users can see activities from people they follow (if those users have social features enabled)
CREATE POLICY "Users can view friend activities"
  ON friend_activities
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT uc.connected_user_id 
      FROM user_connections uc 
      JOIN profiles p ON p.id = uc.connected_user_id
      WHERE uc.user_id = auth.uid() 
      AND p.allow_social_features = true
    )
    OR user_id = auth.uid() -- Users can see their own activities
  );

-- Users can only insert their own activities
CREATE POLICY "Users can create own activities"
  ON friend_activities
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_friend_activities_user_id_created ON friend_activities(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friend_activities_type_created ON friend_activities(activity_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_friend_activities_place_id ON friend_activities(place_id) WHERE place_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_friend_activities_collection_id ON friend_activities(collection_id) WHERE collection_id IS NOT NULL;

-- 5. Function to get friend activity feed
CREATE OR REPLACE FUNCTION get_friend_activity_feed(user_uuid uuid, limit_count integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  user_id uuid,
  user_full_name text,
  user_username text,
  user_avatar_url text,
  activity_type text,
  place_id uuid,
  place_name text,
  place_image_url text,
  collection_id uuid,
  collection_name text,
  metadata jsonb,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    fa.id,
    fa.user_id,
    p.full_name as user_full_name,
    p.username as user_username,
    p.avatar_url as user_avatar_url,
    fa.activity_type,
    fa.place_id,
    pl.name as place_name,
    pl.image_url as place_image_url,
    fa.collection_id,
    c.name as collection_name,
    fa.metadata,
    fa.created_at
  FROM friend_activities fa
  JOIN profiles p ON p.id = fa.user_id
  LEFT JOIN places pl ON pl.id = fa.place_id
  LEFT JOIN collections c ON c.id = fa.collection_id
  WHERE fa.user_id IN (
    SELECT uc.connected_user_id 
    FROM user_connections uc 
    JOIN profiles pf ON pf.id = uc.connected_user_id
    WHERE uc.user_id = user_uuid 
    AND pf.allow_social_features = true
  )
  ORDER BY fa.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Function to get places with friend data
CREATE OR REPLACE FUNCTION get_places_with_friend_data(user_uuid uuid, limit_count integer DEFAULT 50)
RETURNS TABLE (
  id uuid,
  name text,
  category text,
  address text,
  latitude decimal,
  longitude decimal,
  rating decimal,
  review_count integer,
  image_url text,
  ai_summary text,
  pros text[],
  cons text[],
  recommendations text[],
  google_place_id text,
  is_open boolean,
  hours text,
  week_hours text[],
  added_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  is_public boolean,
  friend_visited_count bigint,
  friend_visitor_names text[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.*,
    COALESCE(friend_data.friend_count, 0) as friend_visited_count,
    COALESCE(friend_data.friend_names, ARRAY[]::text[]) as friend_visitor_names
  FROM places p
  LEFT JOIN (
    SELECT 
      fa.place_id,
      COUNT(DISTINCT fa.user_id) as friend_count,
      ARRAY_AGG(DISTINCT pr.full_name) as friend_names
    FROM friend_activities fa
    JOIN profiles pr ON pr.id = fa.user_id
    WHERE fa.activity_type IN ('place_added', 'place_saved')
    AND fa.user_id IN (
      SELECT uc.connected_user_id 
      FROM user_connections uc 
      WHERE uc.user_id = user_uuid
    )
    GROUP BY fa.place_id
  ) friend_data ON friend_data.place_id = p.id
  WHERE p.is_public = true
  ORDER BY 
    CASE WHEN friend_data.friend_count > 0 THEN 0 ELSE 1 END, -- Friends' places first
    friend_data.friend_count DESC,
    p.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Function to track activity (called from app)
CREATE OR REPLACE FUNCTION track_user_activity(
  activity_type_param text,
  place_id_param uuid DEFAULT NULL,
  collection_id_param uuid DEFAULT NULL,
  metadata_param jsonb DEFAULT '{}'
)
RETURNS uuid AS $$
DECLARE
  activity_id uuid;
  user_uuid uuid;
BEGIN
  -- Get current user
  user_uuid := auth.uid();
  IF user_uuid IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Only track activities if user has social features enabled
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_uuid 
    AND allow_social_features = true
  ) THEN
    RETURN NULL; -- Don't track if social features disabled
  END IF;

  -- Insert activity
  INSERT INTO friend_activities (
    user_id,
    activity_type,
    place_id,
    collection_id,
    metadata
  ) VALUES (
    user_uuid,
    activity_type_param,
    place_id_param,
    collection_id_param,
    metadata_param
  ) RETURNING id INTO activity_id;

  RETURN activity_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Add comments
COMMENT ON TABLE friend_activities IS 'Tracks user activities for social feed - only visible to friends';
COMMENT ON FUNCTION get_friend_activity_feed IS 'Returns recent activities from users that the given user follows';
COMMENT ON FUNCTION get_places_with_friend_data IS 'Returns places enriched with friend visit data for social discovery';
COMMENT ON FUNCTION track_user_activity IS 'Records user activity for social feed (only if social features enabled)';