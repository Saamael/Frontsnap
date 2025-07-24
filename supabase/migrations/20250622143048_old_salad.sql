/*
  # Sample Data for FrontSnap

  1. Sample Places
    - Coffee shops, restaurants, salons, gyms
    - Realistic data with proper coordinates for San Francisco

  2. Sample Hidden Gems
    - Hidden gems for different cities
    - Complete with clues and rewards

  3. Sample Collections
    - Default collections for testing
*/

-- Insert sample places
INSERT INTO places (
  name, category, address, latitude, longitude, rating, review_count, image_url, ai_summary, pros, cons, recommendations, is_open, hours, week_hours
) VALUES 
(
  'Blue Bottle Coffee',
  'Coffee Shop',
  '123 Main St, San Francisco, CA 94102',
  37.7749,
  -122.4194,
  4.5,
  248,
  'https://images.pexels.com/photos/302899/pexels-photo-302899.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Excellent single-origin coffee with minimalist aesthetic. Popular for remote work with reliable wifi and comfortable seating.',
  ARRAY['Exceptional coffee quality', 'Perfect for remote work', 'Clean atmosphere', 'Knowledgeable baristas'],
  ARRAY['Can get crowded', 'Limited food options', 'Higher prices', 'Minimal parking'],
  ARRAY['Try their signature cold brew', 'Visit during off-peak hours', 'Perfect for morning meetings'],
  true,
  'Open until 7:00 PM',
  ARRAY['Monday: 6:00 AM – 7:00 PM', 'Tuesday: 6:00 AM – 7:00 PM', 'Wednesday: 6:00 AM – 7:00 PM', 'Thursday: 6:00 AM – 7:00 PM', 'Friday: 6:00 AM – 8:00 PM', 'Saturday: 7:00 AM – 8:00 PM', 'Sunday: 7:00 AM – 7:00 PM']
),
(
  'Artisan Nails',
  'Nail Salon',
  '456 Oak Ave, San Francisco, CA 94102',
  37.7849,
  -122.4094,
  4.8,
  89,
  'https://images.pexels.com/photos/3065209/pexels-photo-3065209.jpeg?auto=compress&cs=tinysrgb&w=800',
  'High-end nail services with exceptional attention to detail. Book ahead for premium treatments.',
  ARRAY['Exceptional service quality', 'Clean and modern facility', 'Skilled technicians', 'Relaxing atmosphere'],
  ARRAY['Expensive pricing', 'Long wait times', 'Limited availability', 'Parking challenges'],
  ARRAY['Book appointments in advance', 'Try their signature gel manicure', 'Perfect for special occasions'],
  false,
  'Closed - Opens at 9:00 AM',
  ARRAY['Monday: 9:00 AM – 7:00 PM', 'Tuesday: 9:00 AM – 7:00 PM', 'Wednesday: 9:00 AM – 7:00 PM', 'Thursday: 9:00 AM – 8:00 PM', 'Friday: 9:00 AM – 8:00 PM', 'Saturday: 8:00 AM – 6:00 PM', 'Sunday: 10:00 AM – 5:00 PM']
),
(
  'Local Bistro',
  'Restaurant',
  '789 Pine St, San Francisco, CA 94102',
  37.7649,
  -122.4294,
  4.3,
  156,
  'https://images.pexels.com/photos/67468/pexels-photo-67468.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Cozy atmosphere with seasonal menu. Great for date nights and casual dining with fresh, local ingredients.',
  ARRAY['Seasonal fresh menu', 'Romantic atmosphere', 'Excellent wine selection', 'Friendly service'],
  ARRAY['Can be noisy when busy', 'Limited vegetarian options', 'Reservations recommended', 'Pricey for portions'],
  ARRAY['Try the seasonal specials', 'Great for date nights', 'Ask about wine pairings'],
  true,
  'Open until 10:00 PM',
  ARRAY['Monday: Closed', 'Tuesday: 5:00 PM – 10:00 PM', 'Wednesday: 5:00 PM – 10:00 PM', 'Thursday: 5:00 PM – 10:00 PM', 'Friday: 5:00 PM – 11:00 PM', 'Saturday: 5:00 PM – 11:00 PM', 'Sunday: 5:00 PM – 9:00 PM']
),
(
  'Urban Fitness',
  'Gym',
  '321 Market St, San Francisco, CA 94102',
  37.7549,
  -122.4394,
  4.6,
  203,
  'https://images.pexels.com/photos/1552252/pexels-photo-1552252.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Modern gym with state-of-the-art equipment. Great community atmosphere with knowledgeable trainers.',
  ARRAY['Modern equipment', 'Great community', 'Knowledgeable trainers', 'Clean facilities'],
  ARRAY['Can get crowded during peak hours', 'Limited parking', 'Membership fees', 'No pool'],
  ARRAY['Visit during off-peak hours', 'Try their group classes', 'Great for strength training'],
  true,
  'Open until 11:00 PM',
  ARRAY['Monday: 5:00 AM – 11:00 PM', 'Tuesday: 5:00 AM – 11:00 PM', 'Wednesday: 5:00 AM – 11:00 PM', 'Thursday: 5:00 AM – 11:00 PM', 'Friday: 5:00 AM – 10:00 PM', 'Saturday: 6:00 AM – 9:00 PM', 'Sunday: 7:00 AM – 9:00 PM']
),
(
  'The Book Nook',
  'Bookstore',
  '567 Valencia St, San Francisco, CA 94110',
  37.7599,
  -122.4199,
  4.7,
  134,
  'https://images.pexels.com/photos/1370295/pexels-photo-1370295.jpeg?auto=compress&cs=tinysrgb&w=800',
  'Charming independent bookstore with carefully curated selection. Perfect for book lovers and quiet reading.',
  ARRAY['Curated book selection', 'Cozy reading nooks', 'Knowledgeable staff', 'Local author events'],
  ARRAY['Limited seating', 'Can be crowded on weekends', 'Higher prices than chains', 'Small space'],
  ARRAY['Check out their staff picks', 'Attend author readings', 'Perfect for quiet afternoons'],
  true,
  'Open until 8:00 PM',
  ARRAY['Monday: 10:00 AM – 8:00 PM', 'Tuesday: 10:00 AM – 8:00 PM', 'Wednesday: 10:00 AM – 8:00 PM', 'Thursday: 10:00 AM – 9:00 PM', 'Friday: 10:00 AM – 9:00 PM', 'Saturday: 9:00 AM – 9:00 PM', 'Sunday: 10:00 AM – 7:00 PM']
);

-- Insert sample hidden gems
INSERT INTO hidden_gems (
  city, country, title, description, reward, difficulty, clues, rules, hint_image_url, latitude, longitude, attempts, participants, time_left
) VALUES 
(
  'San Francisco',
  'CA',
  'The Secret Garden Café',
  'A hidden rooftop café tucked away behind an unmarked door on Mission Street. Only locals know about this magical spot with panoramic city views.',
  '$50 Gift Card + Exclusive Badge',
  'Medium',
  ARRAY[
    'Look for the blue door with no sign between 16th and 17th Street',
    'The entrance is next to a vintage bookstore',
    'Take the stairs to the third floor and look for the garden door'
  ],
  ARRAY[
    'Only one winner per hidden gem',
    'Photo must clearly show the location',
    'Must be taken within the designated area',
    'Winner will be contacted within 24 hours'
  ],
  'https://images.pexels.com/photos/1002703/pexels-photo-1002703.jpeg?auto=compress&cs=tinysrgb&w=800',
  37.7649,
  -122.4194,
  127,
  89,
  '5 days'
),
(
  'New York',
  'NY',
  'The Underground Speakeasy',
  'A hidden speakeasy beneath a pizza shop in Greenwich Village. Find the secret entrance and discover craft cocktails in a prohibition-era setting.',
  '$75 Bar Credit + VIP Access',
  'Hard',
  ARRAY[
    'Look for the pizza shop with the red awning on MacDougal Street',
    'Ask for "Tony''s special" at the counter',
    'The entrance is behind the vintage phone booth'
  ],
  ARRAY[
    'Must be 21+ to participate',
    'Photo must include the secret entrance',
    'Valid ID required for verification',
    'Prize includes one-time VIP access'
  ],
  'https://images.pexels.com/photos/274192/pexels-photo-274192.jpeg?auto=compress&cs=tinysrgb&w=800',
  40.7282,
  -74.0021,
  89,
  67,
  '12 days'
),
(
  'Los Angeles',
  'CA',
  'The Rooftop Observatory',
  'A secret rooftop observatory in downtown LA with vintage telescopes and city views. Hidden above an old theater building.',
  '$100 Astronomy Store Credit',
  'Easy',
  ARRAY[
    'Find the historic theater on Spring Street',
    'Look for the fire escape on the east side',
    'The observatory is on the roof level'
  ],
  ARRAY[
    'Open only during evening hours',
    'Photo must show the telescope setup',
    'Safety equipment provided on-site',
    'Weather dependent access'
  ],
  'https://images.pexels.com/photos/2150/sky-space-dark-galaxy.jpg?auto=compress&cs=tinysrgb&w=800',
  34.0522,
  -118.2437,
  45,
  32,
  '18 days'
);

-- Fix for signup 500 error: Update the handle_new_user function
-- This addresses potential trigger privilege and constraint issues

-- Drop existing trigger and function to recreate them properly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();

-- Create improved function to handle profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_email text;
  user_name text;
BEGIN
  -- Safely extract email and name from the user data
  user_email := COALESCE(NEW.email, '');
  user_name := COALESCE(NEW.raw_user_meta_data->>'full_name', 'User');
  
  -- Insert profile with proper error handling
  INSERT INTO public.profiles (id, email, full_name, points, level)
  VALUES (
    NEW.id,
    user_email,
    user_name,
    0,
    'Explorer'
  );
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't prevent user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate the trigger with proper permissions
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Ensure proper permissions for the function
GRANT EXECUTE ON FUNCTION handle_new_user() TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION handle_new_user() TO anon;

-- Ensure the profiles table can be accessed by the auth system
GRANT INSERT ON public.profiles TO supabase_auth_admin;
GRANT SELECT ON public.profiles TO supabase_auth_admin;
GRANT UPDATE ON public.profiles TO supabase_auth_admin;

-- Add admin role to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_reviews_likes ON reviews(likes);
CREATE INDEX IF NOT EXISTS idx_places_rating ON places(rating);

-- Add admin policies for place management
CREATE POLICY "Admins can delete any place"
  ON places
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Add admin policies for review management
CREATE POLICY "Admins can delete any review"
  ON reviews
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Place owners can delete reviews on their places"
  ON reviews
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM places 
      WHERE places.id = reviews.place_id 
      AND places.added_by = auth.uid()
    )
  );

-- Add function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add function to update review likes
CREATE OR REPLACE FUNCTION update_review_likes(review_id uuid, increment integer)
RETURNS void AS $$
BEGIN
  UPDATE reviews 
  SET likes = likes + increment 
  WHERE id = review_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create review_replies table for threaded discussions
CREATE TABLE IF NOT EXISTS review_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid REFERENCES reviews(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS on review_replies
ALTER TABLE review_replies ENABLE ROW LEVEL SECURITY;

-- Policies for review replies
CREATE POLICY "Anyone can read review replies"
  ON review_replies
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own replies"
  ON review_replies
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own replies"
  ON review_replies
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own replies"
  ON review_replies
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any reply"
  ON review_replies
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Add indexes for review replies
CREATE INDEX IF NOT EXISTS idx_review_replies_review_id ON review_replies(review_id);
CREATE INDEX IF NOT EXISTS idx_review_replies_user_id ON review_replies(user_id);

-- Add updated_at trigger for review_replies
CREATE TRIGGER update_review_replies_updated_at 
  BEFORE UPDATE ON review_replies 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create place_photos table for multiple photos per place
CREATE TABLE IF NOT EXISTS place_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid REFERENCES places(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  caption text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on place_photos
ALTER TABLE place_photos ENABLE ROW LEVEL SECURITY;

-- Policies for place photos
CREATE POLICY "Anyone can read place photos"
  ON place_photos
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can add photos to places"
  ON place_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own photos"
  ON place_photos
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Place owners can delete photos on their places"
  ON place_photos
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM places 
      WHERE places.id = place_photos.place_id 
      AND places.added_by = auth.uid()
    )
  );

CREATE POLICY "Admins can delete any photo"
  ON place_photos
  FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- Add indexes for place photos
CREATE INDEX IF NOT EXISTS idx_place_photos_place_id ON place_photos(place_id);
CREATE INDEX IF NOT EXISTS idx_place_photos_user_id ON place_photos(user_id);

-- Update places policies to allow place owners to update their places
CREATE POLICY "Users can update own places"
  ON places
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = added_by);

-- Add function to get places with proper filtering
CREATE OR REPLACE FUNCTION get_filtered_places(
  search_query text DEFAULT NULL,
  category_filter text DEFAULT NULL,
  sort_by text DEFAULT 'newest',
  limit_count integer DEFAULT 20,
  offset_count integer DEFAULT 0
)
RETURNS SETOF places AS $$
DECLARE
  query text;
BEGIN
  query := 'SELECT * FROM places WHERE 1=1';
  
  -- Add search filter
  IF search_query IS NOT NULL AND search_query != '' THEN
    query := query || ' AND (
      name ILIKE ''%' || search_query || '%'' OR
      category ILIKE ''%' || search_query || '%'' OR
      address ILIKE ''%' || search_query || '%'' OR
      ai_summary ILIKE ''%' || search_query || '%''
    )';
  END IF;
  
  -- Add category filter
  IF category_filter IS NOT NULL AND category_filter != '' AND category_filter != 'All' THEN
    query := query || ' AND category = ''' || category_filter || '''';
  END IF;
  
  -- Add sorting
  CASE sort_by
    WHEN 'rating' THEN
      query := query || ' ORDER BY rating DESC, review_count DESC';
    WHEN 'newest' THEN
      query := query || ' ORDER BY created_at DESC';
    WHEN 'reviews' THEN
      query := query || ' ORDER BY review_count DESC';
    ELSE
      query := query || ' ORDER BY created_at DESC';
  END CASE;
  
  -- Add limit and offset
  query := query || ' LIMIT ' || limit_count || ' OFFSET ' || offset_count;
  
  RETURN QUERY EXECUTE query;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;