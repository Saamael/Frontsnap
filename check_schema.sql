-- Check existing database schema
-- Run this to see what tables and columns you actually have

-- Check if tables exist and their columns
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name IN ('places', 'profiles', 'collections', 'reviews', 'review_replies', 'collection_places', 'place_photos', 'hidden_gems')
ORDER BY table_name, ordinal_position;

-- Check constraints
SELECT 
    table_name,
    constraint_name,
    constraint_type
FROM information_schema.table_constraints 
WHERE table_schema = 'public' 
    AND table_name IN ('places', 'profiles', 'collections', 'reviews', 'review_replies', 'collection_places', 'place_photos', 'hidden_gems')
ORDER BY table_name, constraint_name;

-- Check existing policies
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname; 