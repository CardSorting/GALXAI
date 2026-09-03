-- Migration 73: galxai_developer_keys_watermark_and_sync_index
-- Optimizes multi-instance watermark queries (count, max updated_at) to avoid full table scans and eliminate egress.

CREATE INDEX IF NOT EXISTS idx_galx_dev_keys_user_updated 
ON public.galx_developer_keys(user_id, updated_at DESC);

CREATE OR REPLACE FUNCTION public.fn_get_developer_keys_watermark(p_user_id VARCHAR DEFAULT NULL)
RETURNS TABLE (
  key_count INT,
  max_updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INT AS key_count,
    MAX(updated_at) AS max_updated_at
  FROM public.galx_developer_keys
  WHERE (p_user_id IS NULL OR user_id = p_user_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_get_developer_keys_watermark(VARCHAR) TO authenticated, service_role, anon;
