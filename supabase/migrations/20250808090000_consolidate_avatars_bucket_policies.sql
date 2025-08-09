-- Consolidated, idempotent RLS for avatars bucket
-- Ensures folder-based ownership: avatars/{auth.uid()}/...
-- Public read; authenticated users can manage only their own folder

-- 1) Ensure bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

-- 2) RLS on storage.objects is managed by Supabase
-- NOTE: Do NOT ALTER storage.objects here; it requires the owning role and will error.
-- If you see privilege errors, create/adjust policies via Dashboard UI instead.

-- 3) Drop older/conflicting policies if they exist
DO $$
BEGIN
  -- Legacy names used in prior scripts
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can upload own avatars') THEN
    DROP POLICY "Users can upload own avatars" ON storage.objects;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Anyone can view avatars') THEN
    DROP POLICY "Anyone can view avatars" ON storage.objects;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can update own avatars') THEN
    DROP POLICY "Users can update own avatars" ON storage.objects;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Users can delete own avatars') THEN
    DROP POLICY "Users can delete own avatars" ON storage.objects;
  END IF;

  -- New consolidated names to be re-created below
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='avatars: select public') THEN
    DROP POLICY "avatars: select public" ON storage.objects;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='avatars: insert own folder') THEN
    DROP POLICY "avatars: insert own folder" ON storage.objects;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='avatars: update own folder') THEN
    DROP POLICY "avatars: update own folder" ON storage.objects;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='avatars: delete own folder') THEN
    DROP POLICY "avatars: delete own folder" ON storage.objects;
  END IF;
END $$;

-- 4) Create consolidated folder-based policies for avatars bucket
-- Public read for all avatars (bucket is public, but this also allows API SELECT)
CREATE POLICY "avatars: select public"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Insert into own folder only (authenticated)
CREATE POLICY "avatars: insert own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND position('/' in name) > 0
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- Update only files in own folder (authenticated)
CREATE POLICY "avatars: update own folder"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'avatars'
  AND split_part(name, '/', 1) = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- Delete only files in own folder (authenticated)
CREATE POLICY "avatars: delete own folder"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'avatars'
  AND split_part(name, '/', 1) = auth.uid()::text
);

-- 5) Profiles RLS to support avatar_url updates
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles: update own" ON profiles;
CREATE POLICY "profiles: update own" ON profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles: read all" ON profiles;
CREATE POLICY "profiles: read all" ON profiles
FOR SELECT USING (true);

-- 6) Quick verification queries
-- SELECT * FROM storage.buckets WHERE id = 'avatars';
-- SELECT polname, polcmd, roles, qual, with_check
-- FROM pg_policy pol
-- JOIN pg_class cls ON pol.polrelid = cls.oid
-- JOIN pg_namespace nsp ON cls.relnamespace = nsp.oid
-- WHERE nsp.nspname = 'storage' AND cls.relname = 'objects' AND polname LIKE 'avatars:%';
