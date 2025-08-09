-- ============================================
-- CHECK ACTUAL PERFORMANCE - FIXED VERSION
-- ============================================
-- Run these to see if you ACTUALLY need more indexes
-- ============================================

-- 1. CHECK TABLE SIZES
SELECT 
    relname as table_name,
    pg_size_pretty(pg_total_relation_size(C.oid)) AS table_size,
    n_live_tup AS row_count,
    CASE 
        WHEN n_live_tup < 1000 THEN '✅ Too small to need indexes'
        WHEN n_live_tup < 10000 THEN '⚠️ May benefit from indexes'
        ELSE '🔴 Definitely needs optimization'
    END as recommendation
FROM pg_class C
LEFT JOIN pg_namespace N ON (N.oid = C.relnamespace)
LEFT JOIN pg_stat_user_tables S ON (S.relname = C.relname)
WHERE nspname = 'public' 
AND C.relkind='r'
AND C.relname IN ('places', 'collections', 'reviews', 'profiles', 'user_connections', 'friend_activities', 'hidden_gems')
ORDER BY pg_total_relation_size(C.oid) DESC;

-- 2. CHECK INDEX USAGE (Which indexes are actually being used?)
SELECT 
    t.relname AS table_name,
    i.relname AS index_name,
    idx_scan as times_used,
    CASE 
        WHEN idx_scan = 0 THEN '❌ NEVER USED - Consider dropping'
        WHEN idx_scan < 100 THEN '⚠️ RARELY USED'
        WHEN idx_scan < 1000 THEN '✅ OCCASIONALLY USED'
        ELSE '✅ FREQUENTLY USED'
    END as usage_status
FROM pg_stat_user_indexes idx
JOIN pg_class t ON t.oid = idx.relid
JOIN pg_class i ON i.oid = idx.indexrelid
WHERE idx.schemaname = 'public'
ORDER BY idx_scan DESC;

-- 3. COUNT YOUR INDEXES
SELECT 
    'Total Indexes in Database' as metric,
    COUNT(*) as count,
    CASE 
        WHEN COUNT(*) > 100 THEN '❌ TOO MANY - Will slow down writes'
        WHEN COUNT(*) > 50 THEN '⚠️ Quite a lot - Review unused ones'
        ELSE '✅ Reasonable amount'
    END as assessment
FROM pg_indexes
WHERE schemaname = 'public';

-- 4. CHECK CACHE HIT RATIO (Is your database using memory efficiently?)
SELECT 
    'Cache Hit Ratio' as metric,
    CASE 
        WHEN sum(blks_hit + blks_read) = 0 THEN 'No data'
        ELSE round(sum(blks_hit) * 100.0 / NULLIF(sum(blks_hit + blks_read), 0), 2) || '%'
    END as value,
    CASE 
        WHEN sum(blks_hit + blks_read) = 0 THEN 'No activity yet'
        WHEN sum(blks_hit) * 100.0 / NULLIF(sum(blks_hit + blks_read), 0) > 99 THEN '✅ EXCELLENT'
        WHEN sum(blks_hit) * 100.0 / NULLIF(sum(blks_hit + blks_read), 0) > 95 THEN '✅ GOOD'
        WHEN sum(blks_hit) * 100.0 / NULLIF(sum(blks_hit + blks_read), 0) > 90 THEN '⚠️ OK'
        ELSE '❌ NEEDS IMPROVEMENT'
    END as status
FROM pg_stat_database
WHERE datname = current_database();

-- 5. FIND UNUSED INDEXES (These are wasting space)
SELECT 
    'Unused Indexes' as finding,
    i.relname AS index_name,
    t.relname AS table_name,
    pg_size_pretty(pg_relation_size(i.oid)) as index_size,
    '❌ DROP THIS INDEX' as recommendation
FROM pg_stat_user_indexes idx
JOIN pg_class t ON t.oid = idx.relid
JOIN pg_class i ON i.oid = idx.indexrelid
WHERE idx.schemaname = 'public'
AND idx_scan = 0
AND i.relname NOT LIKE '%_pkey'
AND i.relname NOT LIKE '%_key';

-- 6. SUMMARY RECOMMENDATION
SELECT 
    '🎯 FINAL RECOMMENDATION' as title,
    CASE 
        WHEN (SELECT MAX(n_live_tup) FROM pg_stat_user_tables WHERE schemaname = 'public') < 1000 
        THEN 'Your tables are too small to need more indexes. Focus on frontend optimization instead!'
        WHEN (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') > 50
        THEN 'You have enough indexes! Check for unused ones to DROP instead.'
        ELSE 'Your database seems fine. Run actual slow query analysis before adding indexes.'
    END as action;