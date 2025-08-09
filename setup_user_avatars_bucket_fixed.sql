-- Create new user-avatars bucket with proper permissions
-- Run this in your Supabase SQL editor

-- 1. Create the bucket (this should work)
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-avatars', 'user-avatars', true)
ON CONFLICT (id) DO UPDATE
SET public = true;

-- 2. For RLS policies, you need to use Supabase Dashboard
-- Go to Storage > Policies and add these policies manually:
-- 
-- Policy 1: "Give users access to own folder"
-- Allowed operation: SELECT, INSERT, UPDATE, DELETE
-- Target roles: authenticated
-- WITH CHECK expression: ((bucket_id = 'user-avatars'::text) AND (auth.uid()::text = (string_to_array(name, '_'::text))[1]))
--
-- Policy 2: "Public can view all avatars"  
-- Allowed operation: SELECT
-- Target roles: anon, authenticated
-- USING expression: bucket_id = 'user-avatars'

-- 3. Alternative: Set bucket to fully public (easier but less secure)
-- This can be done in the Supabase Dashboard under Storage settings

-- 4. Test the bucket exists
SELECT * FROM storage.buckets WHERE id = 'user-avatars';

-- 5. If you're getting profile update errors, ensure the profiles table has proper RLS:
-- Check existing policies
SELECT * FROM pg_policies WHERE tablename = 'profiles';

-- If needed, create a simple profile update policy
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
FOR UPDATE USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Ensure profiles table has RLS enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read all profiles (for social features)
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone" ON profiles
FOR SELECT USING (true);

-- Test profile access
SELECT * FROM profiles WHERE id = auth.uid();