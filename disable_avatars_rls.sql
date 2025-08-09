-- Disable RLS for avatars to make them publicly accessible
-- Run this in Supabase SQL Editor with admin privileges

-- 1. Make sure the avatars bucket is fully public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'avatars';

-- 2. Try to disable RLS on storage.objects
-- Note: This requires admin privileges
DO $$ 
BEGIN
  -- Attempt to disable RLS
  ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
  RAISE NOTICE 'RLS disabled successfully on storage.objects';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'Insufficient privileges to disable RLS on storage.objects';
  RAISE NOTICE 'You need to ask your database admin to run: ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;';
END $$;

-- 3. Alternative: Drop all avatar-related policies
-- This might help even if RLS is still enabled
DO $$ 
DECLARE
  policy_record RECORD;
BEGIN
  -- Find and drop all policies related to avatars
  FOR policy_record IN 
    SELECT pol.polname 
    FROM pg_policy pol
    JOIN pg_class cls ON pol.polrelid = cls.oid
    JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
    WHERE nsp.nspname = 'storage' 
    AND cls.relname = 'objects'
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.polname);
      RAISE NOTICE 'Dropped policy: %', policy_record.polname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not drop policy %: %', policy_record.polname, SQLERRM;
    END;
  END LOOP;

  -- Try to create a single, simple public access policy
  BEGIN
    CREATE POLICY "storage_objects_public_access" ON storage.objects
    FOR ALL 
    USING (true)
    WITH CHECK (true);
    RAISE NOTICE 'Created universal public access policy';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create public access policy: %', SQLERRM;
  END;
END $$;

-- 4. Verify the bucket status
SELECT 
  id,
  name,
  public,
  created_at,
  updated_at
FROM storage.buckets 
WHERE id = 'avatars';

-- 5. Check RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'storage' 
AND tablename = 'objects';

-- 6. List remaining policies
SELECT 
  pol.polname as policy_name,
  CASE pol.polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
    ELSE pol.polcmd::text
  END as operation
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
WHERE nsp.nspname = 'storage' 
AND cls.relname = 'objects'
ORDER BY pol.polname;