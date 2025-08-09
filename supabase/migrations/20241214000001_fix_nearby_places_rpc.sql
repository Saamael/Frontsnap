-- Fix get_nearby_places RPC function to match actual places table schema
-- This fixes the "Returned type text does not match expected type numeric in column 21" error

DROP FUNCTION IF EXISTS get_nearby_places(decimal, decimal, decimal);

CREATE OR REPLACE FUNCTION get_nearby_places(lat decimal, lng decimal, radius_km decimal DEFAULT 5)
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
  phone text,
  website text,
  is_verified boolean,
  verification_source text,
  added_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  distance_km decimal
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
    p.phone,
    p.website,
    p.is_verified,
    p.verification_source,
    p.added_by,
    p.created_at,
    p.updated_at,
    (6371 * acos(cos(radians(lat)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(lng)) + sin(radians(lat)) * sin(radians(p.latitude))))::decimal AS distance_km
  FROM places p
  WHERE (6371 * acos(cos(radians(lat)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(lng)) + sin(radians(lat)) * sin(radians(p.latitude)))) <= radius_km
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;
