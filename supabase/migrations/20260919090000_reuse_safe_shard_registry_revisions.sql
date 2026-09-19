-- ============================================================================
-- GALXAI Migration: reuse-safe shard registry revisions
-- Purpose: Preserve journal revision monotonicity when a deterministic shard ID
--          is enrolled again after its prior row was removed.
-- ============================================================================

-- The enrollment ID is deterministic per upstream account. The append-only
-- journal retains earlier revisions after a row is removed, so a later INSERT
-- must continue after the journal's high-water mark instead of restarting at 1.
CREATE OR REPLACE FUNCTION public.fn_prepare_shard_registry_revision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_next_revision BIGINT;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT COALESCE(MAX(registry_revision) + 1, 1)
      INTO v_next_revision
      FROM public.galx_shard_registry_events
     WHERE shard_id = NEW.id;
    NEW.registry_revision := GREATEST(COALESCE(NEW.registry_revision, 1), v_next_revision);
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

COMMENT ON FUNCTION public.fn_prepare_shard_registry_revision() IS
  'Maintains a monotonic control-plane resource version, including deterministic ID reuse; hot usage counters do not advance it.';
