-- ============================================
-- SIMPLE PERFORMANCE CHECK - NO ERRORS VERSION
-- ============================================

-- 1. HOW BIG ARE YOUR TABLES?
SELECT 
    C.relname as table_name,
    pg_size_pretty(pg_total_relation_size(C.oid)) AS size,
    S.n_live_tup AS rows,
    CASE 
        WHEN S.n_live_tup < 1000 THEN 'Too small for indexes'
        WHEN S.n_live_tup < 10000 THEN 'Indexes might help'
        ELSE 'Needs optimization'
    END as status
FROM pg_class C
JOIN pg_stat_user_tables S ON S.relid = C.oid
WHERE S.schemaname = 'public'
ORDER BY pg_total_relation_size(C.oid) DESC;

-- 2. HOW MANY INDEXES DO YOU HAVE?
SELECT 
    COUNT(*) as total_indexes,
    CASE 
        WHEN COUNT(*) > 100 THEN 'TOO MANY'
        WHEN COUNT(*) > 50 THEN 'A LOT'
        ELSE 'REASONABLE'
    END as assessment
FROM pg_indexes
WHERE schemaname = 'public';

-- 3. WHICH INDEXES ARE NEVER USED?
SELECT 
    indexrelname AS unused_index,
    relname AS on_table,
    idx_scan as times_used
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
AND idx_scan = 0
AND indexrelname NOT LIKE '%_pkey'
AND indexrelname NOT LIKE '%_key'
ORDER BY relname;

-- 4. DATABASE CACHE PERFORMANCE
SELECT 
    round(100.0 * sum(heap_blks_hit) / 
    NULLIF(sum(heap_blks_hit) + sum(heap_blks_read), 0), 2) as cache_hit_percentage
FROM pg_statio_user_tables;

-- 5. BIGGEST TABLES BY ROW COUNT
SELECT 
    relname as table_name,
    n_live_tup as row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY n_live_tup DESC
LIMIT 5;