-- ============================================================================
-- GALXAI Migration: shard authority registry hardening
-- Purpose: Make PostgreSQL the shard control-plane authority and emit a
--          secret-free, transactional change journal for cache projections.
-- Risk: HIGH (credential routing authority); additive DDL + least privilege.
-- ============================================================================

-- 1. RESOURCE VERSION + DURABLE CONFIGURATION FIELDS
ALTER TABLE public.galx_shard_accounts
  ADD COLUMN IF NOT EXISTS credential_expires_at_ms BIGINT,
  ADD COLUMN IF NOT EXISTS privacy_capabilities JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS sliding_window_quota JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS supported_models TEXT[],
  ADD COLUMN IF NOT EXISTS unsupported_models TEXT[],
  ADD COLUMN IF NOT EXISTS registry_source TEXT NOT NULL DEFAULT 'api',
  ADD COLUMN IF NOT EXISTS registry_revision BIGINT NOT NULL DEFAULT 1;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'galx_shards_registry_revision_positive'
      AND conrelid = 'public.galx_shard_accounts'::regclass
  ) THEN
    ALTER TABLE public.galx_shard_accounts
      ADD CONSTRAINT galx_shards_registry_revision_positive
      CHECK (registry_revision > 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'galx_shards_privacy_capabilities_object'
      AND conrelid = 'public.galx_shard_accounts'::regclass
  ) THEN
    ALTER TABLE public.galx_shard_accounts
      ADD CONSTRAINT galx_shards_privacy_capabilities_object
      CHECK (jsonb_typeof(privacy_capabilities) = 'object');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'galx_shards_sliding_window_quota_object'
      AND conrelid = 'public.galx_shard_accounts'::regclass
  ) THEN
    ALTER TABLE public.galx_shard_accounts
      ADD CONSTRAINT galx_shards_sliding_window_quota_object
      CHECK (jsonb_typeof(sliding_window_quota) = 'object');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'galx_shards_registry_source_known'
      AND conrelid = 'public.galx_shard_accounts'::regclass
  ) THEN
    ALTER TABLE public.galx_shard_accounts
      ADD CONSTRAINT galx_shards_registry_source_known
      CHECK (registry_source IN (
        'api', 'oauth', 'operator_import', 'environment_bootstrap', 'legacy_migration'
      ));
  END IF;
END
$$;

-- 2. SECRET-FREE TRANSACTIONAL OUTBOX / CHANGE JOURNAL
CREATE TABLE IF NOT EXISTS public.galx_shard_registry_events (
  journal_offset BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  event_id UUID NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  shard_id VARCHAR(64) NOT NULL,
  registry_revision BIGINT NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'shard.registered', 'shard.changed', 'shard.revoked', 'shard.deleted'
  )),
  actor_id TEXT NOT NULL DEFAULT 'system',
  projection JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  UNIQUE (shard_id, registry_revision)
);

CREATE INDEX IF NOT EXISTS idx_galx_shard_registry_events_shard_offset
  ON public.galx_shard_registry_events (shard_id, journal_offset DESC);

CREATE INDEX IF NOT EXISTS idx_galx_shard_registry_events_occurred
  ON public.galx_shard_registry_events (occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_galx_shards_routable_projection
  ON public.galx_shard_accounts (provider, tier_pool, priority DESC, updated_at_ms DESC)
  WHERE status = 'healthy' AND permission_retracted = false;

-- 3. MONOTONIC RESOURCE VERSIONING
CREATE OR REPLACE FUNCTION public.fn_prepare_shard_registry_revision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.registry_revision := GREATEST(COALESCE(NEW.registry_revision, 1), 1);
  ELSE
    NEW.registry_revision := OLD.registry_revision + 1;
  END IF;
  NEW.updated_at_ms := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prepare_shard_registry_revision ON public.galx_shard_accounts;
CREATE TRIGGER trg_prepare_shard_registry_revision
  BEFORE INSERT OR UPDATE ON public.galx_shard_accounts
  FOR EACH ROW EXECUTE FUNCTION public.fn_prepare_shard_registry_revision();

-- 4. STATE CHANGE + JOURNAL FACT ARE COMMITTED IN THE SAME TRANSACTION
CREATE OR REPLACE FUNCTION public.fn_journal_shard_registry_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_row public.galx_shard_accounts%ROWTYPE;
  v_event_type TEXT;
  v_actor_id TEXT;
  v_revision BIGINT;
BEGIN
  v_row := CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
  v_actor_id := COALESCE(
    NULLIF(current_setting('request.jwt.claim.sub', true), ''),
    current_user,
    'system'
  );

  v_event_type := CASE
    WHEN TG_OP = 'INSERT' THEN 'shard.registered'
    WHEN TG_OP = 'DELETE' THEN 'shard.deleted'
    WHEN NEW.permission_retracted AND NOT OLD.permission_retracted THEN 'shard.revoked'
    ELSE 'shard.changed'
  END;
  v_revision := v_row.registry_revision + CASE WHEN TG_OP = 'DELETE' THEN 1 ELSE 0 END;

  INSERT INTO public.galx_shard_registry_events (
    shard_id, registry_revision, event_type, actor_id, projection
  ) VALUES (
    v_row.id,
    v_revision,
    v_event_type,
    v_actor_id,
    jsonb_build_object(
      'shardId', v_row.id,
      'provider', v_row.provider,
      'authType', v_row.auth_type,
      'shardMode', v_row.shard_mode,
      'status', CASE WHEN TG_OP = 'DELETE' THEN 'deleted' ELSE v_row.status::text END,
      'priority', v_row.priority,
      'weight', v_row.weight,
      'permissionRetracted', CASE WHEN TG_OP = 'DELETE' THEN true ELSE v_row.permission_retracted END,
      'registrySource', v_row.registry_source,
      'registryRevision', v_revision,
      'updatedAtMs', v_row.updated_at_ms
    )
  );

  RETURN CASE WHEN TG_OP = 'DELETE' THEN OLD ELSE NEW END;
END;
$$;

DROP TRIGGER IF EXISTS trg_journal_shard_registry_change ON public.galx_shard_accounts;
CREATE TRIGGER trg_journal_shard_registry_change
  AFTER INSERT OR UPDATE OR DELETE ON public.galx_shard_accounts
  FOR EACH ROW EXECUTE FUNCTION public.fn_journal_shard_registry_change();

CREATE OR REPLACE FUNCTION public.fn_prevent_shard_registry_event_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
BEGIN
  RAISE EXCEPTION 'Shard registry journal is append-only';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_shard_registry_event_mutation
  ON public.galx_shard_registry_events;
CREATE TRIGGER trg_prevent_shard_registry_event_mutation
  BEFORE UPDATE OR DELETE ON public.galx_shard_registry_events
  FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_shard_registry_event_mutation();

-- 5. DEFAULT-DENY DATA API BOUNDARY
ALTER TABLE public.galx_shard_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_shard_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.galx_shard_registry_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_shard_registry_events FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.galx_shard_accounts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.galx_shard_registry_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.galx_shard_registry_events_journal_offset_seq
  FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.galx_shard_accounts TO service_role;
GRANT SELECT, INSERT ON TABLE public.galx_shard_registry_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.galx_shard_registry_events_journal_offset_seq
  TO service_role;

DROP POLICY IF EXISTS service_role_all_galx_shard_accounts ON public.galx_shard_accounts;
CREATE POLICY service_role_all_galx_shard_accounts
  ON public.galx_shard_accounts FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_read_insert_galx_shard_registry_events
  ON public.galx_shard_registry_events;
CREATE POLICY service_role_read_insert_galx_shard_registry_events
  ON public.galx_shard_registry_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

REVOKE EXECUTE ON FUNCTION public.fn_prepare_shard_registry_revision() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_journal_shard_registry_change() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_prevent_shard_registry_event_mutation() FROM PUBLIC, anon, authenticated;

COMMENT ON TABLE public.galx_shard_accounts IS
  'Authoritative shard registry. Ciphertext is backend-only; caches and transports are projections.';
COMMENT ON TABLE public.galx_shard_registry_events IS
  'Append-only, secret-free transactional journal for shard registry projections.';
