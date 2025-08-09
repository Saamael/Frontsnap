-- Simplified setup - just create the public bucket
-- This is often sufficient for avatar storage

-- 1. Create or update the bucket to be fully public
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-avatars', 'user-avatars', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- 2. Verify bucket is created and public
SELECT id, name, public FROM storage.buckets WHERE id = 'user-avatars';

-- 3. Fix profiles table RLS (this might be your actual issue)
-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies that might be blocking
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;

-- Create simple, working policies
CREATE POLICY "Enable read access for all users" ON profiles
FOR SELECT USING (true);

CREATE POLICY "Enable update for users based on user_id" ON profiles
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Test that you can update your profile
SELECT * FROM profiles WHERE id = auth.uid();

-- 4. If you're still having issues, check if your user exists in profiles
-- Sometimes the profile doesn't get created properly
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()) THEN
    INSERT INTO profiles (id, email, full_name)
    SELECT id, email, raw_user_meta_data->>'full_name'
    FROM auth.users
    WHERE id = auth.uid();
  END IF;
END $$;