-- Rollback 73: Drop watermark index and RPC
DROP FUNCTION IF EXISTS public.fn_get_developer_keys_watermark(VARCHAR);
DROP INDEX IF EXISTS public.idx_galx_dev_keys_user_updated;
