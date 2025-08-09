-- ============================================
-- DATABASE SCHEMA INSPECTOR FOR FRONTSNAP
-- ============================================
-- Run this FIRST to see your exact database structure
-- Then share the results with me
-- ============================================

-- 1. CHECK ALL TABLES IN YOUR DATABASE
SELECT '=== ALL TABLES IN DATABASE ===' as section;
SELECT 
    table_name,
    '(' || COUNT(column_name) || ' columns)' as column_count
FROM information_schema.columns
WHERE table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;

-- 2. DETAILED SCHEMA FOR KEY TABLES
SELECT '=== PLACES TABLE SCHEMA ===' as section;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'places'
ORDER BY ordinal_position;

SELECT '=== COLLECTIONS TABLE SCHEMA ===' as section;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'collections'
ORDER BY ordinal_position;

SELECT '=== COLLECTION_PLACES TABLE SCHEMA ===' as section;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'collection_places'
ORDER BY ordinal_position;

SELECT '=== REVIEWS TABLE SCHEMA ===' as section;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'reviews'
ORDER BY ordinal_position;

SELECT '=== USER_CONNECTIONS TABLE SCHEMA ===' as section;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_connections'
ORDER BY ordinal_position;

SELECT '=== HIDDEN_GEMS TABLE SCHEMA ===' as section;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'hidden_gems'
ORDER BY ordinal_position;

SELECT '=== FRIEND_ACTIVITIES TABLE SCHEMA ===' as section;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'friend_activities'
ORDER BY ordinal_position;

SELECT '=== PROFILES TABLE SCHEMA ===' as section;
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 3. CHECK EXISTING INDEXES
SELECT '=== EXISTING INDEXES ===' as section;
SELECT 
    tablename as table_name,
    indexname as index_name,
    indexdef as definition
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('places', 'collections', 'collection_places', 'reviews', 
                  'user_connections', 'hidden_gems', 'friend_activities', 'profiles')
ORDER BY tablename, indexname;

-- 4. CHECK TABLE SIZES AND ROW COUNTS
SELECT '=== TABLE SIZES AND ROW COUNTS ===' as section;
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
    n_live_tup AS approximate_row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;