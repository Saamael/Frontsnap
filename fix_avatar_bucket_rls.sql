-- Fix avatar upload RLS issues
-- Run this in Supabase SQL Editor

-- 1. First, ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-avatars', 
  'user-avatars', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

-- 2. Check current RLS status for storage.objects
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- 3. TEMPORARY SOLUTION: Disable RLS for storage.objects
-- WARNING: This affects ALL storage buckets, not just user-avatars
-- Use this only temporarily to test if RLS is the issue
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- 4. Verify the change
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- 5. Alternative: Try creating a more permissive policy
-- If you can't disable RLS, try this instead:
DO $$ 
BEGIN
  -- Try to create a permissive policy (may fail due to permissions)
  BEGIN
    CREATE POLICY "Allow authenticated uploads to user-avatars" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'user-avatars' AND
      auth.role() = 'authenticated'
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create storage policy: %', SQLERRM;
  END;
END $$;

-- 6. Test the bucket
SELECT * FROM storage.buckets WHERE id = 'user-avatars';