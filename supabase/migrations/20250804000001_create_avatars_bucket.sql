-- Create avatars storage bucket for user profile pictures
-- SIMPLIFIED VERSION - Safe to run manually without permissions issues

-- Step 1: Create the avatars bucket (this should work)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']::text[]
);

-- NOTE: The RLS policies below require special permissions.
-- If they fail, you can set them up through the Supabase Dashboard instead:
-- Go to Storage > avatars bucket > Policies

-- Step 2: Try to create RLS policies (may require dashboard setup)
-- If these fail, skip them and use the dashboard method below

-- Policy: Allow authenticated users to upload their own avatars
CREATE POLICY "Users can upload their own avatar" ON storage.objects
FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow public read access to all avatars
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
FOR SELECT 
TO public 
USING (bucket_id = 'avatars');

-- Policy: Allow users to update/replace their own avatars
CREATE POLICY "Users can update their own avatar" ON storage.objects
FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Allow users to delete their own avatars
CREATE POLICY "Users can delete their own avatar" ON storage.objects
FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'avatars' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);

/*
ALTERNATIVE: Dashboard Method (if policies above fail)

1. Go to Supabase Dashboard > Storage
2. Find the 'avatars' bucket
3. Click on 'Policies' tab
4. Add these policies:

   a) "Users can upload their own avatar"
      - Type: INSERT
      - Target roles: authenticated
      - USING expression: bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text

   b) "Avatar images are publicly accessible"
      - Type: SELECT
      - Target roles: public
      - USING expression: bucket_id = 'avatars'

   c) "Users can update their own avatar"
      - Type: UPDATE
      - Target roles: authenticated
      - USING expression: bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text

   d) "Users can delete their own avatar"
      - Type: DELETE
      - Target roles: authenticated
      - USING expression: bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text
*/
