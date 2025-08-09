-- Create new user-avatars bucket with simplified setup
-- Run this in your Supabase SQL editor

-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-avatars', 'user-avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Set up RLS policies for the bucket

-- Allow users to upload their own avatars
CREATE POLICY "Users can upload own avatar" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'user-avatars' AND
  auth.uid()::text = (string_to_array(name, '_'))[1]
);

-- Allow users to update their own avatars
CREATE POLICY "Users can update own avatar" ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'user-avatars' AND
  auth.uid()::text = (string_to_array(name, '_'))[1]
);

-- Allow users to delete their own avatars
CREATE POLICY "Users can delete own avatar" ON storage.objects
FOR DELETE
USING (
  bucket_id = 'user-avatars' AND
  auth.uid()::text = (string_to_array(name, '_'))[1]
);

-- Allow public read access to all avatars
CREATE POLICY "Public read access" ON storage.objects
FOR SELECT
USING (bucket_id = 'user-avatars');

-- 3. Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 4. Optional: Clean up old avatars bucket if it exists
-- DELETE FROM storage.objects WHERE bucket_id = 'avatars';
-- DELETE FROM storage.buckets WHERE id = 'avatars';

-- Test the setup
SELECT * FROM storage.buckets WHERE id = 'user-avatars';