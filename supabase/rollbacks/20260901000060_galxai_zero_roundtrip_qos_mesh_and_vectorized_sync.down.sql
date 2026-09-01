-- ==============================================================================
-- ROLLBACK: 20260901000060_galxai_zero_roundtrip_qos_mesh_and_vectorized_sync.down.sql
-- ==============================================================================

DROP FUNCTION IF EXISTS public.fn_vectorized_batch_settle_stream_leases_v3(TEXT[], TEXT[], TEXT[], BIGINT[], BIGINT[], BIGINT[], TEXT[]);
DROP FUNCTION IF EXISTS public.fn_gateway_preflight_qos_universal_v3(VARCHAR(64), VARCHAR(64), VARCHAR(64), VARCHAR(64));
