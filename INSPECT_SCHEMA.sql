-- ============================================
-- DATABASE SCHEMA INSPECTOR FOR FRONTSNAP (FIXED)
-- ============================================
-- Run this to see your exact database structure
-- Then share the results with me
-- ============================================

-- 1. LIST ALL TABLES
SELECT '========== ALL TABLES ==========' as info;
SELECT 
    table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. PLACES TABLE COLUMNS
SELECT '========== PLACES TABLE ==========' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'places'
ORDER BY ordinal_position;

-- 3. COLLECTIONS TABLE COLUMNS
SELECT '========== COLLECTIONS TABLE ==========' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'collections'
ORDER BY ordinal_position;

-- 4. COLLECTION_PLACES TABLE COLUMNS
SELECT '========== COLLECTION_PLACES TABLE ==========' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'collection_places'
ORDER BY ordinal_position;

-- 5. REVIEWS TABLE COLUMNS
SELECT '========== REVIEWS TABLE ==========' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'reviews'
ORDER BY ordinal_position;

-- 6. USER_CONNECTIONS TABLE COLUMNS
SELECT '========== USER_CONNECTIONS TABLE ==========' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_connections'
ORDER BY ordinal_position;

-- 7. HIDDEN_GEMS TABLE COLUMNS
SELECT '========== HIDDEN_GEMS TABLE ==========' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'hidden_gems'
ORDER BY ordinal_position;

-- 8. FRIEND_ACTIVITIES TABLE COLUMNS
SELECT '========== FRIEND_ACTIVITIES TABLE ==========' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'friend_activities'
ORDER BY ordinal_position;

-- 9. PROFILES TABLE COLUMNS
SELECT '========== PROFILES TABLE ==========' as info;
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 10. CHECK EXISTING INDEXES
SELECT '========== EXISTING INDEXES ==========' as info;
SELECT 
    t.relname as table_name,
    i.relname as index_name
FROM pg_class t, pg_class i, pg_index ix
WHERE t.oid = ix.indrelid
AND i.oid = ix.indexrelid
AND t.relkind = 'r'
AND t.relname IN ('places', 'collections', 'collection_places', 'reviews', 
                  'user_connections', 'hidden_gems', 'friend_activities', 'profiles')
ORDER BY t.relname, i.relname;