-- ============================================================================
-- GALXAI Rollback: shard authority registry hardening
-- Security note: least-privilege grants and forced RLS intentionally remain.
-- ============================================================================

DROP TRIGGER IF EXISTS trg_prevent_shard_registry_event_mutation
  ON public.galx_shard_registry_events;
DROP TRIGGER IF EXISTS trg_journal_shard_registry_change ON public.galx_shard_accounts;
DROP TRIGGER IF EXISTS trg_prepare_shard_registry_revision ON public.galx_shard_accounts;

DROP FUNCTION IF EXISTS public.fn_prevent_shard_registry_event_mutation();
DROP FUNCTION IF EXISTS public.fn_journal_shard_registry_change();
DROP FUNCTION IF EXISTS public.fn_prepare_shard_registry_revision();

DROP INDEX IF EXISTS public.idx_galx_shards_routable_projection;
DROP TABLE IF EXISTS public.galx_shard_registry_events;

ALTER TABLE public.galx_shard_accounts
  DROP CONSTRAINT IF EXISTS galx_shards_registry_source_known,
  DROP CONSTRAINT IF EXISTS galx_shards_sliding_window_quota_object,
  DROP CONSTRAINT IF EXISTS galx_shards_privacy_capabilities_object,
  DROP CONSTRAINT IF EXISTS galx_shards_registry_revision_positive,
  DROP COLUMN IF EXISTS registry_revision,
  DROP COLUMN IF EXISTS registry_source,
  DROP COLUMN IF EXISTS unsupported_models,
  DROP COLUMN IF EXISTS supported_models,
  DROP COLUMN IF EXISTS sliding_window_quota,
  DROP COLUMN IF EXISTS privacy_capabilities,
  DROP COLUMN IF EXISTS credential_expires_at_ms;
