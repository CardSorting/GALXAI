-- Rollback migration: 20260903000072_galxai_developer_keys_retrieval_and_direct_governance.down.sql

DROP FUNCTION IF EXISTS public.fn_delete_developer_key(VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS public.fn_get_developer_key_by_id(VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS public.fn_get_developer_keys(VARCHAR);
