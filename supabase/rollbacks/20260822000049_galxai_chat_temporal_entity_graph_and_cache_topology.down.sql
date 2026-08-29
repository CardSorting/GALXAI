-- ROLLBACK: Migration 49 (Temporal Entity Graph and Cache Topology)
DROP FUNCTION IF EXISTS public.fn_upsert_memory_graph_edges(VARCHAR, JSONB);
DROP FUNCTION IF EXISTS public.fn_get_graph_linked_context(VARCHAR, TEXT[], INT);
DROP TABLE IF EXISTS public.galx_chat_memory_graph_edges CASCADE;
