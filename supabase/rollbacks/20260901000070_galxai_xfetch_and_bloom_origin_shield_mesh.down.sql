-- ==============================================================================
-- ROLLBACK: 20260901000070_galxai_xfetch_and_bloom_origin_shield_mesh.down.sql
-- ==============================================================================

DROP FUNCTION IF EXISTS public.rpc_upsert_bloom_filter(VARCHAR(64), INTEGER, INTEGER, TEXT);
DROP TABLE IF EXISTS public.galx_origin_shield_bloom_filters CASCADE;
