/*
  # Initial Schema for FrontSnap

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text)
      - `full_name` (text)
      - `avatar_url` (text, optional)
      - `points` (integer, default 0)
      - `level` (text, default 'Explorer')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `places`
      - `id` (uuid, primary key)
      - `name` (text)
      - `category` (text)
      - `address` (text)
      - `latitude` (decimal)
      - `longitude` (decimal)
      - `rating` (decimal)
      - `review_count` (integer)
      - `image_url` (text)
      - `ai_summary` (text)
      - `pros` (text array)
      - `cons` (text array)
      - `recommendations` (text array)
      - `google_place_id` (text, optional)
      - `is_open` (boolean)
      - `hours` (text)
      - `week_hours` (text array)
      - `added_by` (uuid, references profiles)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `reviews`
      - `id` (uuid, primary key)
      - `place_id` (uuid, references places)
      - `user_id` (uuid, references profiles)
      - `rating` (integer)
      - `text` (text)
      - `likes` (integer, default 0)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `collections`
      - `id` (uuid, primary key)
      - `name` (text)
      - `user_id` (uuid, references profiles)
      - `color` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `collection_places`
      - `id` (uuid, primary key)
      - `collection_id` (uuid, references collections)
      - `place_id` (uuid, references places)
      - `created_at` (timestamp)

    - `hidden_gems`
      - `id` (uuid, primary key)
      - `city` (text)
      - `country` (text)
      - `title` (text)
      - `description` (text)
      - `reward` (text)
      - `difficulty` (text)
      - `clues` (text array)
      - `rules` (text array)
      - `hint_image_url` (text)
      - `latitude` (decimal)
      - `longitude` (decimal)
      - `is_active` (boolean, default true)
      - `winner_id` (uuid, references profiles, optional)
      - `attempts` (integer, default 0)
      - `participants` (integer, default 0)
      - `time_left` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for public read access to places and reviews
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  avatar_url text,
  points integer DEFAULT 0,
  level text DEFAULT 'Explorer',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create places table
CREATE TABLE IF NOT EXISTS places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  address text NOT NULL,
  latitude decimal NOT NULL,
  longitude decimal NOT NULL,
  rating decimal DEFAULT 0,
  review_count integer DEFAULT 0,
  image_url text NOT NULL,
  ai_summary text NOT NULL,
  pros text[] DEFAULT '{}',
  cons text[] DEFAULT '{}',
  recommendations text[] DEFAULT '{}',
  google_place_id text,
  is_open boolean DEFAULT true,
  hours text DEFAULT '',
  week_hours text[] DEFAULT '{}',
  added_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create reviews table
CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id uuid REFERENCES places(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  text text NOT NULL,
  likes integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create collections table
CREATE TABLE IF NOT EXISTS collections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  color text DEFAULT '#007AFF',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create collection_places table
CREATE TABLE IF NOT EXISTS collection_places (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid REFERENCES collections(id) ON DELETE CASCADE,
  place_id uuid REFERENCES places(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(collection_id, place_id)
);

-- Create hidden_gems table
CREATE TABLE IF NOT EXISTS hidden_gems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city text NOT NULL,
  country text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  reward text NOT NULL,
  difficulty text NOT NULL,
  clues text[] DEFAULT '{}',
  rules text[] DEFAULT '{}',
  hint_image_url text NOT NULL,
  latitude decimal NOT NULL,
  longitude decimal NOT NULL,
  is_active boolean DEFAULT true,
  winner_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  attempts integer DEFAULT 0,
  participants integer DEFAULT 0,
  time_left text DEFAULT '30 days',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE places ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_places ENABLE ROW LEVEL SECURITY;
ALTER TABLE hidden_gems ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Places policies
CREATE POLICY "Anyone can read places"
  ON places
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert places"
  ON places
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = added_by);

CREATE POLICY "Users can update own places"
  ON places
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = added_by);

-- Reviews policies
CREATE POLICY "Anyone can read reviews"
  ON reviews
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own reviews"
  ON reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
  ON reviews
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews"
  ON reviews
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Collections policies
CREATE POLICY "Users can read own collections"
  ON collections
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own collections"
  ON collections
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own collections"
  ON collections
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own collections"
  ON collections
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Collection places policies
CREATE POLICY "Users can read own collection places"
  ON collection_places
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_places.collection_id
      AND collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert into own collections"
  ON collection_places
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_places.collection_id
      AND collections.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete from own collections"
  ON collection_places
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_places.collection_id
      AND collections.user_id = auth.uid()
    )
  );

-- Hidden gems policies
CREATE POLICY "Anyone can read active hidden gems"
  ON hidden_gems
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_places_location ON places USING GIST (point(longitude, latitude));
CREATE INDEX IF NOT EXISTS idx_places_category ON places(category);
CREATE INDEX IF NOT EXISTS idx_places_added_by ON places(added_by);
CREATE INDEX IF NOT EXISTS idx_reviews_place_id ON reviews(place_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_collections_user_id ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_collection_places_collection_id ON collection_places(collection_id);
CREATE INDEX IF NOT EXISTS idx_hidden_gems_city ON hidden_gems(city);

-- Create function to get nearby places
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
  added_by uuid,
  created_at timestamptz,
  updated_at timestamptz,
  distance_km decimal
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.*,
    (6371 * acos(cos(radians(lat)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(lng)) + sin(radians(lat)) * sin(radians(p.latitude))))::decimal AS distance_km
  FROM places p
  WHERE (6371 * acos(cos(radians(lat)) * cos(radians(p.latitude)) * cos(radians(p.longitude) - radians(lng)) + sin(radians(lat)) * sin(radians(p.latitude)))) <= radius_km
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;

-- Create function to handle profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user profile creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_places_updated_at BEFORE UPDATE ON places FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON collections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_hidden_gems_updated_at BEFORE UPDATE ON hidden_gems FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();