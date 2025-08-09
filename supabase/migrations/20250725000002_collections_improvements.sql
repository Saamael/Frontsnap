/*
  # Collections Schema Improvements

  This migration adds missing fields to collections table to support the UI:
  1. Add description field for collection descriptions
  2. Add is_public field for public/private collections
  3. Add cover_image field for collection cover images
  4. Add place_count computed field via function
  5. Update RLS policies for public collections
*/

-- Add missing columns to collections table
ALTER TABLE collections ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE collections ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;
ALTER TABLE collections ADD COLUMN IF NOT EXISTS cover_image text;

-- Create function to get collection with place count
CREATE OR REPLACE FUNCTION get_collections_with_count(user_id_param uuid)
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  user_id uuid,
  color text,
  is_public boolean,
  cover_image text,
  created_at timestamptz,
  updated_at timestamptz,
  place_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.description,
    c.user_id,
    c.color,
    c.is_public,
    c.cover_image,
    c.created_at,
    c.updated_at,
    COALESCE(COUNT(cp.place_id), 0) as place_count
  FROM collections c
  LEFT JOIN collection_places cp ON c.id = cp.collection_id
  WHERE c.user_id = user_id_param
  GROUP BY c.id, c.name, c.description, c.user_id, c.color, c.is_public, c.cover_image, c.created_at, c.updated_at
  ORDER BY c.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get public collections
CREATE OR REPLACE FUNCTION get_public_collections()
RETURNS TABLE (
  id uuid,
  name text,
  description text,
  user_id uuid,
  color text,
  is_public boolean,
  cover_image text,
  created_at timestamptz,
  updated_at timestamptz,
  place_count bigint,
  owner_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.description,
    c.user_id,
    c.color,
    c.is_public,
    c.cover_image,
    c.created_at,
    c.updated_at,
    COALESCE(COUNT(cp.place_id), 0) as place_count,
    p.full_name as owner_name
  FROM collections c
  LEFT JOIN collection_places cp ON c.id = cp.collection_id
  LEFT JOIN profiles p ON c.user_id = p.id
  WHERE c.is_public = true
  GROUP BY c.id, c.name, c.description, c.user_id, c.color, c.is_public, c.cover_image, c.created_at, c.updated_at, p.full_name
  ORDER BY c.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get collection places with details
CREATE OR REPLACE FUNCTION get_collection_places(collection_id_param uuid)
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
  updated_at timestamptz
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
    p.updated_at
  FROM places p
  INNER JOIN collection_places cp ON p.id = cp.place_id
  WHERE cp.collection_id = collection_id_param
  ORDER BY cp.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update RLS policies for public collections
CREATE POLICY "Public collections are viewable by everyone"
  ON collections
  FOR SELECT
  TO authenticated
  USING (is_public = true);

-- Grant permissions for the new functions
GRANT EXECUTE ON FUNCTION get_collections_with_count(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_collections() TO authenticated;
GRANT EXECUTE ON FUNCTION get_collection_places(uuid) TO authenticated;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_collections_public ON collections(is_public);
CREATE INDEX IF NOT EXISTS idx_collections_user_updated ON collections(user_id, updated_at DESC);