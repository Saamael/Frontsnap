-- ============================================
-- CHECK ACTUAL PERFORMANCE ISSUES
-- ============================================
-- Run these queries to see if you ACTUALLY have performance problems
-- ============================================

-- 1. CHECK TABLE SIZES (are they even big enough to need more indexes?)
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS table_size,
    n_live_tup AS row_count
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- 2. CHECK INDEX USAGE (are existing indexes being used?)
SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan as times_used,
    pg_size_pretty(pg_relation_size(indexrelid)) as index_size,
    CASE 
        WHEN idx_scan = 0 THEN 'NEVER USED - Consider dropping'
        WHEN idx_scan < 100 THEN 'RARELY USED'
        WHEN idx_scan < 1000 THEN 'OCCASIONALLY USED'
        ELSE 'FREQUENTLY USED'
    END as usage_status
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;

-- 3. CHECK SLOW QUERIES (if pg_stat_statements is enabled)
-- This will fail if extension not enabled, which is OK
SELECT 
    calls,
    round(mean_exec_time::numeric, 2) as avg_time_ms,
    round(total_exec_time::numeric / 1000, 2) as total_time_sec,
    regexp_replace(query, '\s+', ' ', 'g')::varchar(100) as query_preview
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_%'
AND mean_exec_time > 100  -- Only queries taking > 100ms
ORDER BY mean_exec_time DESC
LIMIT 10;

-- 4. CHECK MISSING INDEX SUGGESTIONS
SELECT 
    schemaname,
    tablename,
    attname,
    n_distinct,
    correlation
FROM pg_stats
WHERE schemaname = 'public'
AND n_distinct > 100
AND correlation < 0.1
AND tablename IN ('places', 'collections', 'reviews')
ORDER BY n_distinct DESC;

-- 5. CURRENT DATABASE PERFORMANCE METRICS
SELECT 
    'Cache Hit Ratio' as metric,
    round(sum(blks_hit) * 100.0 / sum(blks_hit + blks_read), 2) || '%' as value,
    CASE 
        WHEN sum(blks_hit) * 100.0 / sum(blks_hit + blks_read) > 99 THEN 'EXCELLENT'
        WHEN sum(blks_hit) * 100.0 / sum(blks_hit + blks_read) > 95 THEN 'GOOD'
        WHEN sum(blks_hit) * 100.0 / sum(blks_hit + blks_read) > 90 THEN 'OK'
        ELSE 'NEEDS IMPROVEMENT'
    END as status
FROM pg_stat_database
WHERE datname = current_database()
UNION ALL
SELECT 
    'Total Indexes',
    count(*)::text,
    CASE 
        WHEN count(*) > 100 THEN 'TOO MANY - May slow down writes'
        WHEN count(*) > 50 THEN 'QUITE A LOT'
        ELSE 'REASONABLE'
    END
FROM pg_indexes
WHERE schemaname = 'public';