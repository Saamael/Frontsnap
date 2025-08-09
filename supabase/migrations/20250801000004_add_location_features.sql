-- Add Location-Based Friend Suggestions & City Visibility
-- Phase 4: Location sharing and nearby friend discovery

-- 1. Add location fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_city text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_country text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_latitude decimal;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_longitude decimal;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_updated_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_sharing_enabled boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS show_city_publicly boolean DEFAULT false;

-- 2. Create user location history table
CREATE TABLE IF NOT EXISTS user_location_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  city text NOT NULL,
  country text NOT NULL,
  latitude decimal,
  longitude decimal,
  accuracy_meters integer,
  recorded_at timestamptz DEFAULT now(),
  is_current boolean DEFAULT false
);

-- 3. Create location privacy settings table
CREATE TABLE IF NOT EXISTS location_privacy_settings (
  id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  share_city_with_friends boolean DEFAULT true,
  share_city_publicly boolean DEFAULT false,
  allow_nearby_suggestions boolean DEFAULT true,
  location_sharing_radius_km integer DEFAULT 50,
  auto_update_location boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE user_location_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE location_privacy_settings ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for user_location_history
-- Users can only see their own location history
CREATE POLICY "Users can view own location history"
  ON user_location_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can insert their own location history
CREATE POLICY "Users can insert own location history"
  ON user_location_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own location history
CREATE POLICY "Users can update own location history"
  ON user_location_history
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- 6. RLS Policies for location_privacy_settings
-- Users can only access their own privacy settings
CREATE POLICY "Users can manage own location privacy"
  ON location_privacy_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = id);

-- 7. Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(current_latitude, current_longitude) WHERE current_latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_city ON profiles(current_city, current_country) WHERE current_city IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_location_sharing ON profiles(location_sharing_enabled) WHERE location_sharing_enabled = true;
CREATE INDEX IF NOT EXISTS idx_user_location_history_user ON user_location_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_location_history_current ON user_location_history(is_current) WHERE is_current = true;
CREATE INDEX IF NOT EXISTS idx_user_location_history_location ON user_location_history(latitude, longitude) WHERE latitude IS NOT NULL;

-- 8. Function to update user location
CREATE OR REPLACE FUNCTION update_user_location(
  city_param text,
  country_param text,
  latitude_param decimal DEFAULT NULL,
  longitude_param decimal DEFAULT NULL,
  accuracy_param integer DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  current_user_id uuid;
  location_settings record;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  -- Check if user allows location updates
  SELECT * INTO location_settings 
  FROM location_privacy_settings 
  WHERE id = current_user_id;
  
  -- Create default settings if none exist
  IF location_settings IS NULL THEN
    INSERT INTO location_privacy_settings (id) VALUES (current_user_id);
    SELECT * INTO location_settings 
    FROM location_privacy_settings 
    WHERE id = current_user_id;
  END IF;
  
  -- Only update if auto-update is enabled or this is a manual update
  IF location_settings.auto_update_location THEN
    -- Mark previous current location as historical
    UPDATE user_location_history 
    SET is_current = false 
    WHERE user_id = current_user_id AND is_current = true;
    
    -- Insert new location record
    INSERT INTO user_location_history (
      user_id,
      city,
      country,
      latitude,
      longitude,
      accuracy_meters,
      is_current
    ) VALUES (
      current_user_id,
      city_param,
      country_param,
      latitude_param,
      longitude_param,
      accuracy_param,
      true
    );
    
    -- Update current location in profiles
    UPDATE profiles 
    SET 
      current_city = city_param,
      current_country = country_param,
      current_latitude = CASE WHEN location_settings.share_city_with_friends THEN latitude_param END,
      current_longitude = CASE WHEN location_settings.share_city_with_friends THEN longitude_param END,
      location_updated_at = now(),
      show_city_publicly = location_settings.share_city_publicly
    WHERE id = current_user_id;
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Function to find nearby users
CREATE OR REPLACE FUNCTION find_nearby_users(
  user_uuid uuid,
  radius_km decimal DEFAULT 50,
  limit_count integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  full_name text,
  username text,
  avatar_url text,
  bio text,
  current_city text,
  current_country text,
  distance_km decimal,
  mutual_friends_count bigint
) AS $$
BEGIN
  RETURN QUERY
  WITH user_location AS (
    SELECT current_latitude, current_longitude
    FROM profiles 
    WHERE profiles.id = user_uuid
  ),
  nearby_profiles AS (
    SELECT 
      p.id,
      p.full_name,
      p.username,
      p.avatar_url,
      p.bio,
      p.current_city,
      p.current_country,
      (6371 * acos(cos(radians(ul.current_latitude)) * cos(radians(p.current_latitude)) * 
       cos(radians(p.current_longitude) - radians(ul.current_longitude)) + 
       sin(radians(ul.current_latitude)) * sin(radians(p.current_latitude))))::decimal AS distance_km
    FROM profiles p
    CROSS JOIN user_location ul
    WHERE p.id != user_uuid
    AND p.allow_social_features = true
    AND p.location_sharing_enabled = true
    AND p.current_latitude IS NOT NULL
    AND p.current_longitude IS NOT NULL
    AND ul.current_latitude IS NOT NULL
    AND ul.current_longitude IS NOT NULL
    AND (6371 * acos(cos(radians(ul.current_latitude)) * cos(radians(p.current_latitude)) * 
         cos(radians(p.current_longitude) - radians(ul.current_longitude)) + 
         sin(radians(ul.current_latitude)) * sin(radians(p.current_latitude)))) <= radius_km
  ),
  mutual_friends AS (
    SELECT 
      np.id,
      COUNT(DISTINCT uc1.connected_user_id) as mutual_count
    FROM nearby_profiles np
    LEFT JOIN user_connections uc1 ON uc1.user_id = user_uuid
    LEFT JOIN user_connections uc2 ON uc2.user_id = np.id 
      AND uc2.connected_user_id = uc1.connected_user_id
    GROUP BY np.id
  )
  SELECT 
    np.id,
    np.full_name,
    np.username,
    np.avatar_url,
    np.bio,
    np.current_city,
    np.current_country,
    np.distance_km,
    COALESCE(mf.mutual_count, 0) as mutual_friends_count
  FROM nearby_profiles np
  LEFT JOIN mutual_friends mf ON mf.id = np.id
  WHERE NOT EXISTS (
    -- Exclude users already connected
    SELECT 1 FROM user_connections uc 
    WHERE uc.user_id = user_uuid 
    AND uc.connected_user_id = np.id
  )
  ORDER BY 
    mf.mutual_count DESC NULLS LAST,
    np.distance_km ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Function to find users in same city
CREATE OR REPLACE FUNCTION find_users_in_city(
  user_uuid uuid,
  limit_count integer DEFAULT 20
)
RETURNS TABLE (
  id uuid,
  full_name text,
  username text,
  avatar_url text,
  bio text,
  current_city text,
  current_country text,
  mutual_friends_count bigint
) AS $$
DECLARE
  user_city text;
  user_country text;
BEGIN
  -- Get user's current city
  SELECT current_city, current_country 
  INTO user_city, user_country
  FROM profiles 
  WHERE profiles.id = user_uuid;
  
  IF user_city IS NULL THEN
    RETURN;
  END IF;
  
  RETURN QUERY
  WITH city_profiles AS (
    SELECT 
      p.id,
      p.full_name,
      p.username,
      p.avatar_url,
      p.bio,
      p.current_city,
      p.current_country
    FROM profiles p
    WHERE p.id != user_uuid
    AND p.allow_social_features = true
    AND (p.show_city_publicly = true OR EXISTS (
      SELECT 1 FROM user_connections uc 
      WHERE uc.user_id = user_uuid 
      AND uc.connected_user_id = p.id
    ))
    AND p.current_city = user_city
    AND p.current_country = user_country
  ),
  mutual_friends AS (
    SELECT 
      cp.id,
      COUNT(DISTINCT uc1.connected_user_id) as mutual_count
    FROM city_profiles cp
    LEFT JOIN user_connections uc1 ON uc1.user_id = user_uuid
    LEFT JOIN user_connections uc2 ON uc2.user_id = cp.id 
      AND uc2.connected_user_id = uc1.connected_user_id
    GROUP BY cp.id
  )
  SELECT 
    cp.id,
    cp.full_name,
    cp.username,
    cp.avatar_url,
    cp.bio,
    cp.current_city,
    cp.current_country,
    COALESCE(mf.mutual_count, 0) as mutual_friends_count
  FROM city_profiles cp
  LEFT JOIN mutual_friends mf ON mf.id = cp.id
  WHERE NOT EXISTS (
    -- Exclude users already connected
    SELECT 1 FROM user_connections uc 
    WHERE uc.user_id = user_uuid 
    AND uc.connected_user_id = cp.id
  )
  ORDER BY 
    mf.mutual_count DESC NULLS LAST,
    cp.full_name ASC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 11. Create trigger to update location privacy settings when profiles change
CREATE OR REPLACE FUNCTION handle_location_privacy_update()
RETURNS trigger AS $$
BEGIN
  -- Update location privacy settings when relevant profile fields change
  IF (NEW.location_sharing_enabled != OLD.location_sharing_enabled OR 
      NEW.show_city_publicly != OLD.show_city_publicly) THEN
    
    INSERT INTO location_privacy_settings (
      id, 
      share_city_publicly, 
      allow_nearby_suggestions
    ) VALUES (
      NEW.id, 
      NEW.show_city_publicly,
      NEW.location_sharing_enabled
    ) ON CONFLICT (id) DO UPDATE SET 
      share_city_publicly = NEW.show_city_publicly,
      allow_nearby_suggestions = NEW.location_sharing_enabled,
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_profile_location_update ON profiles;
CREATE TRIGGER on_profile_location_update
  AFTER UPDATE ON profiles
  FOR EACH ROW 
  WHEN (OLD.location_sharing_enabled IS DISTINCT FROM NEW.location_sharing_enabled OR
        OLD.show_city_publicly IS DISTINCT FROM NEW.show_city_publicly)
  EXECUTE FUNCTION handle_location_privacy_update();

-- 12. Add comments
COMMENT ON COLUMN profiles.current_city IS 'Current city of user (updated by location services)';
COMMENT ON COLUMN profiles.current_country IS 'Current country of user';
COMMENT ON COLUMN profiles.location_sharing_enabled IS 'Whether user allows location-based friend suggestions';
COMMENT ON COLUMN profiles.show_city_publicly IS 'Whether to show city to non-friends';
COMMENT ON TABLE user_location_history IS 'Historical location data for analytics and privacy';
COMMENT ON TABLE location_privacy_settings IS 'Fine-grained location sharing preferences';