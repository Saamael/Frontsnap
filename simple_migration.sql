-- FrontSnap Simple Database Migration
-- Step-by-step approach to avoid column reference errors

-- Step 1: Update existing profiles table
DO $$ 
BEGIN
    -- Add missing columns to profiles table if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'username') THEN
        ALTER TABLE profiles ADD COLUMN username text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'bio') THEN
        ALTER TABLE profiles ADD COLUMN bio text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'location') THEN
        ALTER TABLE profiles ADD COLUMN location text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'website') THEN
        ALTER TABLE profiles ADD COLUMN website text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE profiles ADD COLUMN role text DEFAULT 'user';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'is_verified') THEN
        ALTER TABLE profiles ADD COLUMN is_verified boolean DEFAULT false;
    END IF;
END $$;

-- Step 2: Update existing places table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'places' AND column_name = 'phone') THEN
        ALTER TABLE places ADD COLUMN phone text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'places' AND column_name = 'website') THEN
        ALTER TABLE places ADD COLUMN website text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'places' AND column_name = 'added_by') THEN
        ALTER TABLE places ADD COLUMN added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'places' AND column_name = 'is_verified') THEN
        ALTER TABLE places ADD COLUMN is_verified boolean DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'places' AND column_name = 'verification_source') THEN
        ALTER TABLE places ADD COLUMN verification_source text;
    END IF;
END $$;

-- Step 3: Create new tables
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
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS review_replies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id uuid REFERENCES reviews(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

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

CREATE TABLE IF NOT EXISTS collection_places (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id uuid REFERENCES collections(id) ON DELETE CASCADE NOT NULL,
  place_id uuid REFERENCES places(id) ON DELETE CASCADE NOT NULL,
  added_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS place_photos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  place_id uuid REFERENCES places(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  caption text,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Step 4: Add constraints
DO $$
BEGIN
    -- Add unique constraint for reviews if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_place_id_user_id_key') THEN
        ALTER TABLE reviews ADD CONSTRAINT reviews_place_id_user_id_key UNIQUE(place_id, user_id);
    END IF;
    
    -- Add unique constraint for collection_places if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'collection_places_collection_id_place_id_key') THEN
        ALTER TABLE collection_places ADD CONSTRAINT collection_places_collection_id_place_id_key UNIQUE(collection_id, place_id);
    END IF;
    
    -- Add role constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check') THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin', 'moderator'));
    END IF;
END $$;

-- Step 5: Create indexes
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
CREATE INDEX IF NOT EXISTS idx_place_photos_place_id ON place_photos(place_id);

-- Step 6: Enable RLS
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE place_photos ENABLE ROW LEVEL SECURITY;

-- Step 7: Create utility functions first
CREATE OR REPLACE FUNCTION is_admin(user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = user_id AND role IN ('admin', 'moderator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION update_review_likes(review_id uuid, increment integer)
RETURNS void AS $$
BEGIN
  UPDATE reviews 
  SET likes = likes + increment 
  WHERE id = review_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

-- Step 8: Create trigger
DROP TRIGGER IF EXISTS update_place_rating_trigger ON reviews;
CREATE TRIGGER update_place_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_place_rating();

-- Step 9: Create RLS policies (now that all tables exist)

-- Places policies
DROP POLICY IF EXISTS "Places are viewable by everyone" ON places;
CREATE POLICY "Places are viewable by everyone" ON places FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert places" ON places;
CREATE POLICY "Users can insert places" ON places FOR INSERT WITH CHECK (auth.uid() = added_by);

DROP POLICY IF EXISTS "Users can update their own places" ON places;
CREATE POLICY "Users can update their own places" ON places FOR UPDATE USING (auth.uid() = added_by);

DROP POLICY IF EXISTS "Admins can update any place" ON places;
CREATE POLICY "Admins can update any place" ON places FOR UPDATE USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Users can delete their own places" ON places;
CREATE POLICY "Users can delete their own places" ON places FOR DELETE USING (auth.uid() = added_by);

DROP POLICY IF EXISTS "Admins can delete any place" ON places;
CREATE POLICY "Admins can delete any place" ON places FOR DELETE USING (is_admin(auth.uid()));

-- Reviews policies
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON reviews;
CREATE POLICY "Reviews are viewable by everyone" ON reviews FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own reviews" ON reviews;
CREATE POLICY "Users can insert their own reviews" ON reviews FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own reviews" ON reviews;
CREATE POLICY "Users can update their own reviews" ON reviews FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own reviews" ON reviews;
CREATE POLICY "Users can delete their own reviews" ON reviews FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can delete any review" ON reviews;
CREATE POLICY "Admins can delete any review" ON reviews FOR DELETE USING (is_admin(auth.uid()));

-- Review replies policies
DROP POLICY IF EXISTS "Review replies are viewable by everyone" ON review_replies;
CREATE POLICY "Review replies are viewable by everyone" ON review_replies FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own replies" ON review_replies;
CREATE POLICY "Users can insert their own replies" ON review_replies FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own replies" ON review_replies;
CREATE POLICY "Users can update their own replies" ON review_replies FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own replies" ON review_replies;
CREATE POLICY "Users can delete their own replies" ON review_replies FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can delete any reply" ON review_replies;
CREATE POLICY "Admins can delete any reply" ON review_replies FOR DELETE USING (is_admin(auth.uid()));

-- Collections policies
DROP POLICY IF EXISTS "Public collections are viewable by everyone" ON collections;
CREATE POLICY "Public collections are viewable by everyone" ON collections FOR SELECT USING (is_public = true OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own collections" ON collections;
CREATE POLICY "Users can insert their own collections" ON collections FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own collections" ON collections;
CREATE POLICY "Users can update their own collections" ON collections FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own collections" ON collections;
CREATE POLICY "Users can delete their own collections" ON collections FOR DELETE USING (auth.uid() = user_id);

-- Collection places policies
DROP POLICY IF EXISTS "Collection places are viewable based on collection visibility" ON collection_places;
CREATE POLICY "Collection places are viewable based on collection visibility" ON collection_places FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM collections 
    WHERE id = collection_id 
    AND (is_public = true OR user_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can manage their own collection places" ON collection_places;
CREATE POLICY "Users can manage their own collection places" ON collection_places FOR ALL USING (
  EXISTS (
    SELECT 1 FROM collections 
    WHERE id = collection_id 
    AND user_id = auth.uid()
  )
);

-- Profiles policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Place photos policies
DROP POLICY IF EXISTS "Place photos are viewable by everyone" ON place_photos;
CREATE POLICY "Place photos are viewable by everyone" ON place_photos FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert their own photos" ON place_photos;
CREATE POLICY "Users can insert their own photos" ON place_photos FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own photos" ON place_photos;
CREATE POLICY "Users can delete their own photos" ON place_photos FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can delete any photo" ON place_photos;
CREATE POLICY "Admins can delete any photo" ON place_photos FOR DELETE USING (is_admin(auth.uid()));

-- Step 10: Create user profile function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_email text;
  user_name text;
  username_base text;
  final_username text;
  counter integer := 1;
BEGIN
  user_email := NEW.email;
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    split_part(user_email, '@', 1)
  );
  
  username_base := split_part(user_email, '@', 1);
  final_username := username_base;
  
  WHILE EXISTS (SELECT 1 FROM profiles WHERE username = final_username) LOOP
    final_username := username_base || '_' || counter::text;
    counter := counter + 1;
  END LOOP;

  INSERT INTO profiles (id, email, full_name, username)
  VALUES (NEW.id, user_email, user_name, final_username)
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = now();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Failed to create profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 11: Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Step 12: Update existing profiles
UPDATE profiles 
SET username = split_part(email, '@', 1) || '_' || substr(id::text, 1, 8)
WHERE username IS NULL AND email IS NOT NULL;

-- Step 13: Add sample data only if no places exist
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
  )
) AS sample_data(name, category, address, latitude, longitude, rating, review_count, image_url, ai_summary, pros, cons, recommendations, is_open, hours, week_hours)
WHERE NOT EXISTS (SELECT 1 FROM places LIMIT 1);

-- Migration complete! 