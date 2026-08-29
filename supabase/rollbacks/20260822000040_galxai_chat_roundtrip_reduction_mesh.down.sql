-- Rollback: 20260822000040_galxai_chat_roundtrip_reduction_mesh
DROP FUNCTION IF EXISTS public.fn_sync_chat_bundle(JSONB, JSONB, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.fn_get_chat_composite_bootstrap(TEXT, TEXT) CASCADE;
