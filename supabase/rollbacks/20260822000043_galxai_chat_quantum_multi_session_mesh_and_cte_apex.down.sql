-- Rollback: 20260822000043_galxai_chat_quantum_multi_session_mesh_and_cte_apex
DROP FUNCTION IF EXISTS public.fn_get_chat_delta_sync(TEXT, TEXT, BIGINT, TEXT) CASCADE;
