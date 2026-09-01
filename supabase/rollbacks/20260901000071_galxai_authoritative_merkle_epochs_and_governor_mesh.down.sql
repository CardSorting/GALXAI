-- ==============================================================================
-- ROLLBACK: 20260901000071_galxai_authoritative_merkle_epochs_and_governor_mesh.down.sql
-- ==============================================================================

DROP FUNCTION IF EXISTS public.rpc_advance_authoritative_epoch(VARCHAR(64), VARCHAR(64), VARCHAR(64));
DROP FUNCTION IF EXISTS public.rpc_validate_authoritative_data_epoch(VARCHAR(64), VARCHAR(64), BIGINT);

DROP TABLE IF EXISTS public.galx_authoritative_data_epochs CASCADE;
