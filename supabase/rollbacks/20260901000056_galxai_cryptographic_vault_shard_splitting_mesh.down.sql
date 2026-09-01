-- ==============================================================================
-- ROLLBACK: 20260901000056_galxai_cryptographic_vault_shard_splitting_mesh.down.sql
-- ==============================================================================

DROP FUNCTION IF EXISTS public.rpc_register_vault_threshold_shards(VARCHAR(64), VARCHAR(255), INTEGER, INTEGER, JSONB);
DROP TABLE IF EXISTS public.galx_vault_threshold_shards CASCADE;
