-- ==============================================================================
-- GALXAI HYPERSCALE SUBSTRATE: DEVELOPER GATEWAY KEYS RETRIEVAL & GOVERNANCE MESH
-- Migration: 20260903000072_galxai_developer_keys_retrieval_and_direct_governance.sql
-- Description:
--   1. Implements SECURITY DEFINER retrieval procedure: fn_get_developer_keys
--   2. Implements SECURITY DEFINER single-key lookup: fn_get_developer_key_by_id
--   3. Implements SECURITY DEFINER deletion procedure: fn_delete_developer_key
--   4. Grants execute permissions across authenticated, service_role, and anon
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. STORED PROCEDURE: fn_get_developer_keys
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_get_developer_keys(
  p_user_id VARCHAR(255) DEFAULT NULL
)
RETURNS SETOF public.galx_developer_keys
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.galx_developer_keys
  WHERE (p_user_id IS NULL OR user_id = p_user_id)
  ORDER BY created_at DESC;
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. STORED PROCEDURE: fn_get_developer_key_by_id
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_get_developer_key_by_id(
  p_id VARCHAR(64),
  p_user_id VARCHAR(255) DEFAULT NULL
)
RETURNS SETOF public.galx_developer_keys
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.galx_developer_keys
  WHERE id = p_id
    AND (p_user_id IS NULL OR user_id = p_user_id)
  LIMIT 1;
END;
$$;

-- ------------------------------------------------------------------------------
-- 3. STORED PROCEDURE: fn_delete_developer_key
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_delete_developer_key(
  p_id VARCHAR(64),
  p_user_id VARCHAR(255) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.galx_developer_keys
  WHERE id = p_id
    AND (p_user_id IS NULL OR user_id = p_user_id);
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN jsonb_build_object('success', v_deleted_count > 0, 'deletedCount', v_deleted_count);
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. GRANT EXECUTION PERMISSIONS
-- ------------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION public.fn_get_developer_keys(VARCHAR) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.fn_get_developer_key_by_id(VARCHAR, VARCHAR) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.fn_delete_developer_key(VARCHAR, VARCHAR) TO authenticated, service_role, anon;
