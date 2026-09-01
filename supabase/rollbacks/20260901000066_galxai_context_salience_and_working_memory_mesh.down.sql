-- ==============================================================================
-- ROLLBACK: 20260901000066_galxai_context_salience_and_working_memory_mesh.down.sql
-- ==============================================================================

DROP FUNCTION IF EXISTS public.rpc_fetch_high_salience_context_window(VARCHAR(64), NUMERIC(5, 4), INTEGER);
DROP FUNCTION IF EXISTS public.rpc_batch_upsert_salience_scores(VARCHAR(64), VARCHAR(64)[], NUMERIC(5, 4)[], INTEGER[], BOOLEAN[], INTEGER[]);

DROP TABLE IF EXISTS public.galx_context_salience_scores CASCADE;
