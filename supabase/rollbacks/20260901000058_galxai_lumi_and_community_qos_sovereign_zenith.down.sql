-- ==============================================================================
-- ROLLBACK: 20260901000058_galxai_lumi_and_community_qos_sovereign_zenith.down.sql
-- ==============================================================================

DROP FUNCTION IF EXISTS public.rpc_draw_hierarchical_community_grant(VARCHAR(255), NUMERIC(10, 4));
DROP FUNCTION IF EXISTS public.rpc_settle_lumi_composite_ledger_entry(VARCHAR(128), VARCHAR(255), VARCHAR(64), VARCHAR(64), BIGINT, BIGINT, BIGINT, BIGINT);
DROP FUNCTION IF EXISTS public.rpc_poll_and_promote_lumi_queue_ticket(VARCHAR(64), VARCHAR(255));
DROP FUNCTION IF EXISTS public.rpc_enqueue_lumi_request_ticket(VARCHAR(255), VARCHAR(64), VARCHAR(64), INTEGER, INTEGER);

DROP TABLE IF EXISTS public.lumi_cluster_telemetry_rollups_1m CASCADE;
DROP TABLE IF EXISTS public.community_grant_allocations CASCADE;
DROP TABLE IF EXISTS public.lumi_compute_settlement_ledger CASCADE;
DROP TABLE IF EXISTS public.lumi_pool_queue_tickets CASCADE;
