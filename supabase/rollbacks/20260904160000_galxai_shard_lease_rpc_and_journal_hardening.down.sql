-- ============================================================================
-- GALXAI Rollback: shard lease RPC and registry journal hardening
-- Security note: backend-only lease procedure grants intentionally remain.
-- ============================================================================

DROP TRIGGER IF EXISTS trg_journal_shard_registry_update
  ON public.galx_shard_accounts;
DROP TRIGGER IF EXISTS trg_journal_shard_registry_change
  ON public.galx_shard_accounts;

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

CREATE TRIGGER trg_journal_shard_registry_change
  AFTER INSERT OR UPDATE OR DELETE ON public.galx_shard_accounts
  FOR EACH ROW EXECUTE FUNCTION public.fn_journal_shard_registry_change();
