-- Minimal Migration - Only add missing columns to existing tables
-- This won't break your existing working setup

-- 1. Add missing columns to profiles table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'username') THEN
        ALTER TABLE profiles ADD COLUMN username text;
        -- Update existing profiles to have usernames
        UPDATE profiles 
        SET username = split_part(email, '@', 1) || '_' || substr(id::text, 1, 8)
        WHERE username IS NULL AND email IS NOT NULL;
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

-- 2. Add missing columns to places table
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
                   WHERE table_name = 'places' AND column_name = 'is_verified') THEN
        ALTER TABLE places ADD COLUMN is_verified boolean DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'places' AND column_name = 'verification_source') THEN
        ALTER TABLE places ADD COLUMN verification_source text;
    END IF;
END $$;

-- 3. Add missing columns to collections table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'collections' AND column_name = 'is_public') THEN
        ALTER TABLE collections ADD COLUMN is_public boolean DEFAULT false;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'collections' AND column_name = 'emoji') THEN
        ALTER TABLE collections ADD COLUMN emoji text DEFAULT '📍';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'collections' AND column_name = 'color') THEN
        ALTER TABLE collections ADD COLUMN color text DEFAULT '#007AFF';
    END IF;
END $$;

-- 4. Add missing columns to reviews table
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reviews' AND column_name = 'title') THEN
        ALTER TABLE reviews ADD COLUMN title text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reviews' AND column_name = 'images') THEN
        ALTER TABLE reviews ADD COLUMN images text[] DEFAULT '{}';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reviews' AND column_name = 'likes') THEN
        ALTER TABLE reviews ADD COLUMN likes integer DEFAULT 0;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'reviews' AND column_name = 'is_verified') THEN
        ALTER TABLE reviews ADD COLUMN is_verified boolean DEFAULT false;
    END IF;
END $$;

-- 5. Create review_replies table if it doesn't exist
CREATE TABLE IF NOT EXISTS review_replies (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  review_id uuid REFERENCES reviews(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create place_photos table if it doesn't exist
CREATE TABLE IF NOT EXISTS place_photos (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  place_id uuid REFERENCES places(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  caption text,
  is_primary boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Add constraints only if they don't exist
DO $$
BEGIN
    -- Add unique constraint for reviews if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reviews_place_id_user_id_key') THEN
        ALTER TABLE reviews ADD CONSTRAINT reviews_place_id_user_id_key UNIQUE(place_id, user_id);
    END IF;
    
    -- Add role constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check') THEN
        ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin', 'moderator'));
    END IF;
END $$;

-- 8. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_places_phone ON places(phone);
CREATE INDEX IF NOT EXISTS idx_places_website ON places(website);
CREATE INDEX IF NOT EXISTS idx_collections_is_public ON collections(is_public);
CREATE INDEX IF NOT EXISTS idx_reviews_title ON reviews(title);
CREATE INDEX IF NOT EXISTS idx_reviews_likes ON reviews(likes);
CREATE INDEX IF NOT EXISTS idx_review_replies_review_id ON review_replies(review_id);
CREATE INDEX IF NOT EXISTS idx_place_photos_place_id ON place_photos(place_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 9. Enable RLS on new tables only
DO $$
BEGIN
    -- Enable RLS on review_replies if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'review_replies') THEN
        ALTER TABLE review_replies ENABLE ROW LEVEL SECURITY;
    END IF;
    
    -- Enable RLS on place_photos if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'place_photos') THEN
        ALTER TABLE place_photos ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 10. Create simple policies for new tables only (won't interfere with existing ones)
DO $$
BEGIN
    -- Review replies policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'review_replies') THEN
        DROP POLICY IF EXISTS "Anyone can read review replies" ON review_replies;
        CREATE POLICY "Anyone can read review replies" ON review_replies FOR SELECT USING (true);
        
        DROP POLICY IF EXISTS "Users can insert own replies" ON review_replies;
        CREATE POLICY "Users can insert own replies" ON review_replies FOR INSERT WITH CHECK (auth.uid() = user_id);
        
        DROP POLICY IF EXISTS "Users can update own replies" ON review_replies;
        CREATE POLICY "Users can update own replies" ON review_replies FOR UPDATE USING (auth.uid() = user_id);
        
        DROP POLICY IF EXISTS "Users can delete own replies" ON review_replies;
        CREATE POLICY "Users can delete own replies" ON review_replies FOR DELETE USING (auth.uid() = user_id);
    END IF;
    
    -- Place photos policies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'place_photos') THEN
        DROP POLICY IF EXISTS "Anyone can read place photos" ON place_photos;
        CREATE POLICY "Anyone can read place photos" ON place_photos FOR SELECT USING (true);
        
        DROP POLICY IF EXISTS "Users can insert own photos" ON place_photos;
        CREATE POLICY "Users can insert own photos" ON place_photos FOR INSERT WITH CHECK (auth.uid() = user_id);
        
        DROP POLICY IF EXISTS "Users can delete own photos" ON place_photos;
        CREATE POLICY "Users can delete own photos" ON place_photos FOR DELETE USING (auth.uid() = user_id);
    END IF;
END $$;

-- 11. Create utility functions
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

-- 12. Create/update trigger for place ratings
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

DROP TRIGGER IF EXISTS update_place_rating_trigger ON reviews;
CREATE TRIGGER update_place_rating_trigger
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_place_rating();

-- 13. Create/update user profile function
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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Minimal migration complete!
-- This adds missing columns without breaking your existing setup. 