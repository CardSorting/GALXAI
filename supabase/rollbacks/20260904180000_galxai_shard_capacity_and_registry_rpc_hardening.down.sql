-- ============================================================================
-- GALXAI Rollback: shard capacity and registry RPC hardening
-- Security/availability note: authoritative capacity checks, consistent lease
-- lock ordering, and least-privilege grants intentionally remain because
-- reverting them could reintroduce oversubscription and deadlocks. This safe
-- rollback removes only the optional Data API upsert/renewal surfaces and the
-- additive state constraints.
-- ============================================================================

DROP FUNCTION IF EXISTS public.fn_upsert_shard_registry(JSONB);
DROP FUNCTION IF EXISTS public.fn_extend_shard_lease(VARCHAR, BIGINT, BIGINT, BIGINT);

ALTER TABLE public.galx_shard_accounts
  DROP CONSTRAINT IF EXISTS galx_shards_token_state_nonnegative,
  DROP CONSTRAINT IF EXISTS galx_shards_request_state_nonnegative,
  DROP CONSTRAINT IF EXISTS galx_shards_concurrency_state_valid;

-- Preserve the backend-only authority boundary after rollback.
REVOKE ALL ON FUNCTION public.fn_acquire_shard_lease(
  VARCHAR, VARCHAR, BIGINT, BIGINT, VARCHAR, BIGINT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_release_shard_lease(
  VARCHAR, BIGINT, NUMERIC, BOOLEAN, BIGINT
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_cleanup_expired_leases(BIGINT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_acquire_shard_lease(
  VARCHAR, VARCHAR, BIGINT, BIGINT, VARCHAR, BIGINT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_release_shard_lease(
  VARCHAR, BIGINT, NUMERIC, BOOLEAN, BIGINT
) TO service_role;
GRANT EXECUTE ON FUNCTION public.fn_cleanup_expired_leases(BIGINT)
  TO service_role;
