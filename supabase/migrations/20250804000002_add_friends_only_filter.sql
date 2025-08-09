-- Add friends-only places filtering function
-- This migration adds functionality to filter places to only show those visited by friends

-- 1. Function to get places that only friends have visited/added
CREATE OR REPLACE FUNCTION get_friends_only_places(user_uuid uuid, limit_count integer DEFAULT 50)
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
    p.id,
    p.name,
    p.category,
    p.address,
    p.latitude,
    p.longitude,
    p.rating,
    p.review_count,
    p.image_url,
    p.ai_summary,
    p.pros,
    p.cons,
    p.recommendations,
    p.google_place_id,
    p.is_open,
    p.hours,
    p.week_hours,
    p.added_by,
    p.created_at,
    p.updated_at,
    p.is_public::boolean,
    friend_data.friend_count as friend_visited_count,
    friend_data.friend_names as friend_visitor_names
  FROM places p
  INNER JOIN (
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
    friend_data.friend_count DESC,
    p.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Function to get nearby places that only friends have visited/added
CREATE OR REPLACE FUNCTION get_nearby_friends_only_places(
  user_uuid uuid,
  user_lat decimal,
  user_lng decimal,
  radius_meters integer DEFAULT 30000,
  limit_count integer DEFAULT 50
)
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
    p.id,
    p.name,
    p.category,
    p.address,
    p.latitude,
    p.longitude,
    p.rating,
    p.review_count,
    p.image_url,
    p.ai_summary,
    p.pros,
    p.cons,
    p.recommendations,
    p.google_place_id,
    p.is_open,
    p.hours,
    p.week_hours,
    p.added_by,
    p.created_at,
    p.updated_at,
    p.is_public::boolean,
    friend_data.friend_count as friend_visited_count,
    friend_data.friend_names as friend_visitor_names
  FROM places p
  INNER JOIN (
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
  AND (
    6371000 * acos(
      cos(radians(user_lat)) * 
      cos(radians(p.latitude)) * 
      cos(radians(p.longitude) - radians(user_lng)) + 
      sin(radians(user_lat)) * 
      sin(radians(p.latitude))
    ) <= radius_meters
  )
  ORDER BY 
    friend_data.friend_count DESC,
    (
      6371000 * acos(
        cos(radians(user_lat)) * 
        cos(radians(p.latitude)) * 
        cos(radians(p.longitude) - radians(user_lng)) + 
        sin(radians(user_lat)) * 
        sin(radians(p.latitude))
      )
    ) ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Add comments
COMMENT ON FUNCTION get_friends_only_places IS 'Returns places that have been visited/added by friends only - excludes places with no friend activity';
COMMENT ON FUNCTION get_nearby_friends_only_places IS 'Returns nearby places that have been visited/added by friends only';