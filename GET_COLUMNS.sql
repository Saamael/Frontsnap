-- ============================================
-- GET COLUMN NAMES FOR EACH TABLE
-- ============================================
-- Run each query separately if needed
-- ============================================

-- PLACES TABLE COLUMNS
SELECT 
    'PLACES' as table_name,
    column_name
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'places'
ORDER BY ordinal_position;

-- COLLECTIONS TABLE COLUMNS  
SELECT 
    'COLLECTIONS' as table_name,
    column_name
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'collections'
ORDER BY ordinal_position;

-- COLLECTION_PLACES TABLE COLUMNS
SELECT 
    'COLLECTION_PLACES' as table_name,
    column_name
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'collection_places'
ORDER BY ordinal_position;

-- USER_CONNECTIONS TABLE COLUMNS
SELECT 
    'USER_CONNECTIONS' as table_name,
    column_name
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'user_connections'
ORDER BY ordinal_position;

-- HIDDEN_GEMS TABLE COLUMNS
SELECT 
    'HIDDEN_GEMS' as table_name,
    column_name
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'hidden_gems'
ORDER BY ordinal_position;