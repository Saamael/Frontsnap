-- FrontSnap Database Migration Script
-- Apply this in your Supabase SQL editor to update your database schema

-- 1. Create enhanced places table (if not exists)
CREATE TABLE IF NOT EXISTS places (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  category text NOT NULL,
  address text NOT NULL,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  rating numeric(3,2) DEFAULT 0,
  review_count integer DEFAULT 0,
  image_url text,
  ai_summary text,
  pros text[] DEFAULT '{}',
  cons text[] DEFAULT '{}',
  recommendations text[] DEFAULT '{}',
  is_open boolean DEFAULT true,
  hours text,
  week_hours text[] DEFAULT '{}',
  phone text,
  website text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_verified boolean DEFAULT false,
  verification_source text
);

-- 2. Create enhanced reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  place_id uuid REFERENCES places(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title text,
  content text NOT NULL,
  images text[] DEFAULT '{}',
  likes integer DEFAULT 0,
  is_verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(place_id, user_id) -- One review per user per place
);

-- 3. Create review replies table
CREATE TABLE IF NOT EXISTS review_replies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id uuid REFERENCES reviews(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create collections table
CREATE TABLE IF NOT EXISTS collections (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  description text,
  emoji text DEFAULT '📍',
  color text DEFAULT '#007AFF',
  is_public boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create collection places junction table
CREATE TABLE IF NOT EXISTS collection_places (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id uuid REFERENCES collections(id) ON DELETE CASCADE NOT NULL,
  place_id uuid REFERENCES places(id) ON DELETE CASCADE NOT NULL,
  added_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(collection_id, place_id)
);

-- 6. Create profiles table (enhanced)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email text,
  full_name text,
  username text UNIQUE,
  avatar_url text,
  bio text,
  location text,
  website text,
  role text DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
  is_verified boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Create hidden gems table
CREATE TABLE IF NOT EXISTS hidden_gems (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  city text NOT NULL,
  country text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  reward text NOT NULL,
  difficulty text NOT NULL CHECK (difficulty IN ('Easy', 'Medium', 'Hard')),
  clues text[] NOT NULL,
  rules text[] NOT NULL,
  hint_image_url text,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  attempts integer DEFAULT 0,
  participants integer DEFAULT 0,
  time_left text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 8. Create place photos table
CREATE TABLE IF NOT EXISTS place_photos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  place_id uuid REFERENCES places(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  caption text,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 9. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_places_category ON places(category);
CREATE INDEX IF NOT EXISTS idx_places_rating ON places(rating);
CREATE INDEX IF NOT EXISTS idx_places_location ON places(latitude, longitude);
CREATE INDEX IF NOT EXISTS idx_places_added_by ON places(added_by);
CREATE INDEX IF NOT EXISTS idx_reviews_place_id ON reviews(place_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_likes ON reviews(likes);
CREATE INDEX IF NOT EXISTS idx_review_replies_review_id ON review_replies(review_id);
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_places_collection_id ON collection_places(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_places_place_id ON collection_places(place_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_hidden_gems_city ON hidden_gems(city, country);
CREATE INDEX IF NOT EXISTS idx_place_photos_place_id ON place_photos(place_id);

-- 10. Enable Row Level Security (RLS)
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE hidden_gems ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_photos ENABLE ROW LEVEL SECURITY;

-- 11. Create RLS policies

-- Places policies
CREATE POLICY "Places are viewable by everyone" ON places FOR SELECT USING (true);
CREATE POLICY "Users can insert places" ON places FOR INSERT WITH CHECK (auth.uid() = added_by);
CREATE POLICY "Users can update their own places" ON places FOR UPDATE USING (auth.uid() = added_by);
CREATE POLICY "Admins can update any place" ON places FOR UPDATE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
);
CREATE POLICY "Users can delete their own places" ON places FOR DELETE USING (auth.uid() = added_by);
CREATE POLICY "Admins can delete any place" ON places FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
);

-- Reviews policies
CREATE POLICY "Reviews are viewable by everyone" ON reviews FOR SELECT USING (true);
CREATE POLICY "Users can insert their own reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reviews" ON reviews FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own reviews" ON reviews FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete any review" ON reviews FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
);

-- Review replies policies
CREATE POLICY "Review replies are viewable by everyone" ON review_replies FOR SELECT USING (true);
CREATE POLICY "Users can insert their own replies" ON review_replies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own replies" ON review_replies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own replies" ON review_replies FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete any reply" ON review_replies FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
);

-- Collections policies
CREATE POLICY "Public collections are viewable by everyone" ON collections FOR SELECT USING (is_public = true OR auth.uid() = user_id);
CREATE POLICY "Users can insert their own collections" ON collections FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own collections" ON collections FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own collections" ON collections FOR DELETE USING (auth.uid() = user_id);

-- Collection places policies
CREATE POLICY "Collection places are viewable based on collection visibility" ON collection_places FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM collections 
    WHERE id = collection_id 
    AND (is_public = true OR user_id = auth.uid())
  )
);
CREATE POLICY "Users can manage their own collection places" ON collection_places FOR ALL USING (
  EXISTS (
    SELECT 1 FROM collections 
    WHERE id = collection_id 
    AND user_id = auth.uid()
  )
);

-- Profiles policies
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Hidden gems policies
CREATE POLICY "Hidden gems are viewable by everyone" ON hidden_gems FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage hidden gems" ON hidden_gems FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
);

-- Place photos policies
CREATE POLICY "Place photos are viewable by everyone" ON place_photos FOR SELECT USING (true);
CREATE POLICY "Users can insert their own photos" ON place_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own photos" ON place_photos FOR DELETE USING (auth.uid() = user_id);
CREATE POLICY "Admins can delete any photo" ON place_photos FOR DELETE USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
);

-- 12. Create utility functions

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND role IN ('admin', 'moderator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update review likes
CREATE OR REPLACE FUNCTION update_review_likes(review_id uuid, increment integer)
RETURNS void AS $$
BEGIN
  UPDATE reviews 
  SET likes = likes + increment 
  WHERE id = review_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update place rating when reviews change
CREATE OR REPLACE FUNCTION update_place_rating()
RETURNS trigger AS $$
BEGIN
  UPDATE places 
  SET 
    rating = COALESCE((
      SELECT AVG(rating)::numeric(3,2) 
      FROM reviews 
      WHERE place_id = COALESCE(NEW.place_id, OLD.place_id)
    ), 0),
    review_count = (
      SELECT COUNT(*) 
      FROM reviews 
      WHERE place_id = COALESCE(NEW.place_id, OLD.place_id)
    )
  WHERE id = COALESCE(NEW.place_id, OLD.place_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update place ratings
DROP TRIGGER IF EXISTS update_place_rating_trigger ON reviews;
CREATE TRIGGER update_place_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_place_rating();

-- Function to handle new user profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_email text;
  user_name text;
BEGIN
  -- Safely extract email and name from the user data
  user_email := NEW.email;
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(user_email, '@', 1)
  );

  -- Insert new profile with error handling
  INSERT INTO profiles (id, email, full_name, username)
  VALUES (
    NEW.id,
    user_email,
    user_name,
    split_part(user_email, '@', 1) || '_' || substr(NEW.id::text, 1, 8)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = now();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the user creation
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- 13. Insert sample data (only if tables are empty)
INSERT INTO places (
  name, category, address, latitude, longitude, rating, review_count, image_url, ai_summary, pros, cons, recommendations, is_open, hours, week_hours
) 
SELECT * FROM (VALUES 
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
  )
) AS sample_data(name, category, address, latitude, longitude, rating, review_count, image_url, ai_summary, pros, cons, recommendations, is_open, hours, week_hours)
WHERE NOT EXISTS (SELECT 1 FROM places LIMIT 1);

-- Insert sample hidden gems
INSERT INTO hidden_gems (
  city, country, title, description, reward, difficulty, clues, rules, hint_image_url, latitude, longitude, attempts, participants, time_left
) 
SELECT * FROM (VALUES 
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
  )
) AS sample_gems(city, country, title, description, reward, difficulty, clues, rules, hint_image_url, latitude, longitude, attempts, participants, time_left)
WHERE NOT EXISTS (SELECT 1 FROM hidden_gems LIMIT 1);

-- Migration complete!
-- Your database schema is now updated with all the latest features. 