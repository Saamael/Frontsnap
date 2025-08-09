/*
  # Hidden Gems System Improvements

  This migration adds:
  1. User location tracking for targeted notifications
  2. Database functions for proximity detection
  3. Functions for updating hidden gem stats
  4. Indexes for better performance
*/

-- Add location tracking to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_city text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_country text;  
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_latitude decimal;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_longitude decimal;

-- Create function to find nearby hidden gems using PostGIS
CREATE OR REPLACE FUNCTION find_nearby_hidden_gems(
  search_lat decimal,
  search_lng decimal,
  radius_meters integer DEFAULT 50
)
RETURNS TABLE (
  id uuid,
  city text,
  country text,
  title text,
  description text,
  reward text,
  difficulty text,
  clues text[],
  rules text[],
  hint_image_url text,
  latitude decimal,
  longitude decimal,
  is_active boolean,
  winner_id uuid,
  attempts integer,
  participants integer,
  time_left text,
  created_at timestamptz,
  updated_at timestamptz,
  distance_meters decimal
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    hg.*,
    (6371000 * acos(cos(radians(search_lat)) * cos(radians(hg.latitude)) * cos(radians(hg.longitude) - radians(search_lng)) + sin(radians(search_lat)) * sin(radians(hg.latitude))))::decimal AS distance_meters
  FROM hidden_gems hg
  WHERE hg.is_active = true
    AND (6371000 * acos(cos(radians(search_lat)) * cos(radians(hg.latitude)) * cos(radians(hg.longitude) - radians(search_lng)) + sin(radians(search_lat)) * sin(radians(hg.latitude)))) <= radius_meters
  ORDER BY distance_meters
  LIMIT 1; -- Return only the closest match
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to increment hidden gem attempts
CREATE OR REPLACE FUNCTION increment_hidden_gem_attempts(gem_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE hidden_gems 
  SET attempts = attempts + 1 
  WHERE id = gem_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to increment hidden gem participants
CREATE OR REPLACE FUNCTION increment_hidden_gem_participants(gem_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE hidden_gems 
  SET participants = participants + 1 
  WHERE id = gem_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get city name from coordinates (reverse geocoding helper)
CREATE OR REPLACE FUNCTION get_city_from_coordinates(lat decimal, lng decimal)
RETURNS text AS $$
DECLARE
  city_name text;
BEGIN
  -- This is a simplified version - in production you'd use a proper geocoding service
  -- For now, we'll return a placeholder based on coordinate ranges
  
  -- San Francisco area
  IF lat BETWEEN 37.7 AND 37.8 AND lng BETWEEN -122.5 AND -122.3 THEN
    RETURN 'San Francisco';
  END IF;
  
  -- New York area  
  IF lat BETWEEN 40.7 AND 40.8 AND lng BETWEEN -74.1 AND -73.9 THEN
    RETURN 'New York';
  END IF;
  
  -- Los Angeles area
  IF lat BETWEEN 34.0 AND 34.1 AND lng BETWEEN -118.3 AND -118.2 THEN
    RETURN 'Los Angeles';
  END IF;
  
  -- Default fallback
  RETURN 'Unknown City';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_hidden_gems_location ON hidden_gems USING GIST (point(longitude, latitude));
CREATE INDEX IF NOT EXISTS idx_hidden_gems_active ON hidden_gems(is_active);
CREATE INDEX IF NOT EXISTS idx_hidden_gems_city_active ON hidden_gems(city, is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_location ON profiles(last_city, last_country);

-- Add RLS policies for hidden gems admin functions
CREATE POLICY "Admins can create hidden gems"
  ON hidden_gems
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update hidden gems"
  ON hidden_gems
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Grant permissions for the new functions
GRANT EXECUTE ON FUNCTION find_nearby_hidden_gems(decimal, decimal, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_hidden_gem_attempts(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION increment_hidden_gem_participants(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_city_from_coordinates(decimal, decimal) TO authenticated;