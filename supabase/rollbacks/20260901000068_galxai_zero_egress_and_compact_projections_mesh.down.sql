-- ==============================================================================
-- ROLLBACK: 20260901000068_galxai_zero_egress_and_compact_projections_mesh.down.sql
-- ==============================================================================

DROP FUNCTION IF EXISTS public.fn_get_compact_qos_pool_state_v2(VARCHAR(64));
DROP FUNCTION IF EXISTS public.fn_get_compact_chat_delta_sync_v2(TEXT, TEXT, BIGINT, TEXT);
