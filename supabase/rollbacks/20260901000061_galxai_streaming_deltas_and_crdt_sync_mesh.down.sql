-- ==============================================================================
-- ROLLBACK: 20260901000061_galxai_streaming_deltas_and_crdt_sync_mesh.down.sql
-- ==============================================================================

DROP FUNCTION IF EXISTS public.rpc_fetch_stream_deltas_since_seq(VARCHAR(64), VARCHAR(64), INTEGER);
DROP FUNCTION IF EXISTS public.rpc_batch_append_stream_deltas(VARCHAR(64), VARCHAR(64), INTEGER[], TEXT[]);

DROP TABLE IF EXISTS public.galx_chat_stream_deltas CASCADE;
