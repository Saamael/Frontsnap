-- Fix RLS policies for the existing avatars bucket
-- Run this in Supabase SQL Editor

-- 1. Verify the avatars bucket exists and is public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'avatars';

-- Check the bucket configuration
SELECT * FROM storage.buckets WHERE id = 'avatars';

-- 2. Check if RLS is enabled on storage.objects
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- 3. OPTION A: Disable RLS temporarily (affects all buckets)
-- Use this if you need a quick fix for testing
-- ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- 4. OPTION B: Check existing policies
SELECT 
  pol.polname as policy_name,
  pol.polcmd as command,
  pol.polroles as roles,
  pg_get_expr(pol.polqual, pol.polrelid) as using_expression,
  pg_get_expr(pol.polwithcheck, pol.polrelid) as check_expression
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
WHERE nsp.nspname = 'storage' AND cls.relname = 'objects';

-- 5. If you can create policies (may need to be done in Dashboard):
-- Allow authenticated users to upload to avatars bucket
-- CREATE POLICY "Allow avatar uploads" ON storage.objects
-- FOR INSERT WITH CHECK (
--   bucket_id = 'avatars' AND
--   auth.role() = 'authenticated'
-- );

-- 6. Alternative: Create a simpler upload path using folder structure
-- This creates a folder-based permission system
DO $$ 
BEGIN
  -- Try to create a policy that allows users to manage their own folder
  BEGIN
    DROP POLICY IF EXISTS "Users can upload own avatars" ON storage.objects;
    CREATE POLICY "Users can upload own avatars" ON storage.objects
    FOR INSERT WITH CHECK (
      bucket_id = 'avatars' AND
      (auth.uid())::text = split_part(name, '_', 1)
    );
    RAISE NOTICE 'Created INSERT policy successfully';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create INSERT policy: %', SQLERRM;
  END;

  -- Allow everyone to view avatars
  BEGIN
    DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
    CREATE POLICY "Anyone can view avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');
    RAISE NOTICE 'Created SELECT policy successfully';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create SELECT policy: %', SQLERRM;
  END;

  -- Allow users to update their own avatars
  BEGIN
    DROP POLICY IF EXISTS "Users can update own avatars" ON storage.objects;
    CREATE POLICY "Users can update own avatars" ON storage.objects
    FOR UPDATE USING (
      bucket_id = 'avatars' AND
      (auth.uid())::text = split_part(name, '_', 1)
    );
    RAISE NOTICE 'Created UPDATE policy successfully';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create UPDATE policy: %', SQLERRM;
  END;

  -- Allow users to delete their own avatars
  BEGIN
    DROP POLICY IF EXISTS "Users can delete own avatars" ON storage.objects;
    CREATE POLICY "Users can delete own avatars" ON storage.objects
    FOR DELETE USING (
      bucket_id = 'avatars' AND
      (auth.uid())::text = split_part(name, '_', 1)
    );
    RAISE NOTICE 'Created DELETE policy successfully';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create DELETE policy: %', SQLERRM;
  END;
END $$;

-- 7. Final check - list all policies for storage.objects
SELECT 
  polname as policy_name,
  polcmd as operation
FROM pg_policy 
WHERE polrelid = 'storage.objects'::regclass;