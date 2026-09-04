-- ============================================================================
-- GALXAI Migration: shard lease RPC and registry journal hardening
-- Purpose: Make lease mutation procedures backend-only and ensure registry
--          revisions describe control-plane changes, not hot usage counters.
-- Risk: HIGH (credential routing authority); privilege restriction + triggers.
-- ============================================================================

-- 1. LEASE MUTATION IS A BACKEND CONTROL-PLANE CAPABILITY
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

ALTER FUNCTION public.fn_acquire_shard_lease(
  VARCHAR, VARCHAR, BIGINT, BIGINT, VARCHAR, BIGINT
) SET search_path = public, pg_temp;
ALTER FUNCTION public.fn_release_shard_lease(
  VARCHAR, BIGINT, NUMERIC, BOOLEAN, BIGINT
) SET search_path = public, pg_temp;
ALTER FUNCTION public.fn_cleanup_expired_leases(BIGINT)
  SET search_path = public, pg_temp;

-- 2. RESOURCE VERSION CHANGES ONLY FOR REGISTRY/CONTROL-PLANE MUTATIONS
CREATE OR REPLACE FUNCTION public.fn_prepare_shard_registry_revision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.registry_revision := GREATEST(COALESCE(NEW.registry_revision, 1), 1);
  ELSIF ROW(
    NEW.user_id,
    NEW.provider,
    NEW.auth_type,
    NEW.account_label,
    NEW.api_key_masked,
    NEW.encrypted_ciphertext,
    NEW.encrypted_iv,
    NEW.encrypted_tag,
    NEW.key_version,
    NEW.shard_mode,
    NEW.tier_pool,
    NEW.priority,
    NEW.weight,
    NEW.status,
    NEW.max_tokens,
    NEW.refill_rate_per_minute,
    NEW.max_requests,
    NEW.permission_retracted,
    NEW.cooldown_until_ms,
    NEW.credential_expires_at_ms,
    NEW.privacy_capabilities,
    NEW.sliding_window_quota,
    NEW.supported_models,
    NEW.unsupported_models,
    NEW.registry_source
  ) IS DISTINCT FROM ROW(
    OLD.user_id,
    OLD.provider,
    OLD.auth_type,
    OLD.account_label,
    OLD.api_key_masked,
    OLD.encrypted_ciphertext,
    OLD.encrypted_iv,
    OLD.encrypted_tag,
    OLD.key_version,
    OLD.shard_mode,
    OLD.tier_pool,
    OLD.priority,
    OLD.weight,
    OLD.status,
    OLD.max_tokens,
    OLD.refill_rate_per_minute,
    OLD.max_requests,
    OLD.permission_retracted,
    OLD.cooldown_until_ms,
    OLD.credential_expires_at_ms,
    OLD.privacy_capabilities,
    OLD.sliding_window_quota,
    OLD.supported_models,
    OLD.unsupported_models,
    OLD.registry_source
  ) THEN
    NEW.registry_revision := OLD.registry_revision + 1;
  ELSE
    NEW.registry_revision := OLD.registry_revision;
  END IF;

  NEW.updated_at_ms := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
  RETURN NEW;
END;
$$;

-- Insert/delete and revision-changing updates are journalled separately so
-- token reservations, latency samples, and counters do not saturate the outbox.
DROP TRIGGER IF EXISTS trg_journal_shard_registry_change
  ON public.galx_shard_accounts;
DROP TRIGGER IF EXISTS trg_journal_shard_registry_update
  ON public.galx_shard_accounts;

CREATE TRIGGER trg_journal_shard_registry_change
  AFTER INSERT OR DELETE ON public.galx_shard_accounts
  FOR EACH ROW EXECUTE FUNCTION public.fn_journal_shard_registry_change();

CREATE TRIGGER trg_journal_shard_registry_update
  AFTER UPDATE ON public.galx_shard_accounts
  FOR EACH ROW
  WHEN (OLD.registry_revision IS DISTINCT FROM NEW.registry_revision)
  EXECUTE FUNCTION public.fn_journal_shard_registry_change();

COMMENT ON FUNCTION public.fn_prepare_shard_registry_revision() IS
  'Maintains a monotonic control-plane resource version; hot usage counters do not advance it.';
