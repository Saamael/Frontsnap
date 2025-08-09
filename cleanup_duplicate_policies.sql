-- Clean up duplicate avatar bucket policies
-- Run this in Supabase SQL Editor

-- 1. First, see all the policies with their details
SELECT 
  pol.polname as policy_name,
  pol.polcmd as command,
  pg_get_expr(pol.polqual, pol.polrelid) as using_expression,
  pg_get_expr(pol.polwithcheck, pol.polrelid) as check_expression
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
WHERE nsp.nspname = 'storage' AND cls.relname = 'objects'
AND pol.polname LIKE '%avatar%'
ORDER BY pol.polcmd, pol.polname;

-- 2. Drop ALL avatar-related policies to start fresh
DO $$ 
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT pol.polname 
    FROM pg_policy pol
    JOIN pg_class cls ON pol.polrelid = cls.oid
    JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
    WHERE nsp.nspname = 'storage' AND cls.relname = 'objects'
    AND (
      pol.polname LIKE '%avatar%' OR 
      pol.polname LIKE '%Avatar%'
    )
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.polname);
      RAISE NOTICE 'Dropped policy: %', policy_record.polname;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not drop policy %: %', policy_record.polname, SQLERRM;
    END;
  END LOOP;
END $$;

-- 3. Create clean, simple policies (one for each operation)
DO $$ 
BEGIN
  -- Policy 1: Allow authenticated users to INSERT (upload) avatars
  BEGIN
    CREATE POLICY "avatars_insert_authenticated" ON storage.objects
    FOR INSERT 
    TO authenticated
    WITH CHECK (bucket_id = 'avatars');
    RAISE NOTICE 'Created INSERT policy';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create INSERT policy: %', SQLERRM;
  END;

  -- Policy 2: Allow anyone to SELECT (view) avatars
  BEGIN
    CREATE POLICY "avatars_select_public" ON storage.objects
    FOR SELECT 
    TO public
    USING (bucket_id = 'avatars');
    RAISE NOTICE 'Created SELECT policy';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create SELECT policy: %', SQLERRM;
  END;

  -- Policy 3: Allow authenticated users to UPDATE their own avatars
  BEGIN
    CREATE POLICY "avatars_update_own" ON storage.objects
    FOR UPDATE 
    TO authenticated
    USING (
      bucket_id = 'avatars' AND
      (auth.uid())::text = split_part(name, '_', 1)
    )
    WITH CHECK (
      bucket_id = 'avatars' AND
      (auth.uid())::text = split_part(name, '_', 1)
    );
    RAISE NOTICE 'Created UPDATE policy';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create UPDATE policy: %', SQLERRM;
  END;

  -- Policy 4: Allow authenticated users to DELETE their own avatars
  BEGIN
    CREATE POLICY "avatars_delete_own" ON storage.objects
    FOR DELETE 
    TO authenticated
    USING (
      bucket_id = 'avatars' AND
      (auth.uid())::text = split_part(name, '_', 1)
    );
    RAISE NOTICE 'Created DELETE policy';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not create DELETE policy: %', SQLERRM;
  END;
END $$;

-- 4. Verify final policies
SELECT 
  pol.polname as policy_name,
  CASE pol.polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    ELSE pol.polcmd::text
  END as operation,
  pg_get_expr(pol.polqual, pol.polrelid) as using_expression,
  pg_get_expr(pol.polwithcheck, pol.polrelid) as check_expression
FROM pg_policy pol
JOIN pg_class cls ON pol.polrelid = cls.oid
JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
WHERE nsp.nspname = 'storage' AND cls.relname = 'objects'
ORDER BY pol.polcmd, pol.polname;

-- 5. Make sure RLS is enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 6. Test: Check if current user can theoretically insert to avatars
SELECT 
  current_user,
  auth.uid() as user_id,
  auth.role() as user_role;