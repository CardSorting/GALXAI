-- ============================================================================
-- GALXAI Rollback: authoritative quota refill and rolling-window admission
-- Safety note: admission enforcement intentionally remains in the lease RPC;
-- rollback removes only additive storage after operators have confirmed no
-- fractional credit is needed. This avoids restoring oversubscription.
-- ============================================================================

DROP INDEX IF EXISTS public.idx_galx_shard_leases_rolling_window;

ALTER TABLE public.galx_shard_accounts
  DROP CONSTRAINT IF EXISTS galx_shards_refill_remainders_valid;

-- Columns are retained under expand/contract discipline. Removing them in an
-- emergency rollback would discard refill credit and requires a later contract migration.

REVOKE ALL ON FUNCTION public.fn_acquire_shard_lease(
  VARCHAR, VARCHAR, BIGINT, BIGINT, VARCHAR, BIGINT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fn_acquire_shard_lease(
  VARCHAR, VARCHAR, BIGINT, BIGINT, VARCHAR, BIGINT
) TO service_role;
