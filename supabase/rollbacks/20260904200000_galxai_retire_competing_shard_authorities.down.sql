-- ============================================================================
-- GALXAI Rollback: retire competing shard authorities
-- Safety: old anonymous/client mutation grants are intentionally NOT restored.
-- The v2 RPCs and forensic tables are retained under expand/contract rules.
-- ============================================================================

-- Restore only backend read/write access needed for an emergency compatibility
-- worker. Never restore PUBLIC, anon, or authenticated access.
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.galx_shard_concurrency_leases TO service_role;
GRANT SELECT, INSERT
  ON TABLE public.galx_shard_health_telemetry_ledger TO service_role;

DROP POLICY IF EXISTS service_role_all_shard_leases
  ON public.galx_shard_concurrency_leases;
CREATE POLICY service_role_all_shard_leases
  ON public.galx_shard_concurrency_leases FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS service_role_all_shard_telemetry
  ON public.galx_shard_health_telemetry_ledger;
CREATE POLICY service_role_all_shard_telemetry
  ON public.galx_shard_health_telemetry_ledger FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- The retired functions remain owner-only. An operator must explicitly opt in
-- to any temporary compatibility grant after reviewing the incident context.
REVOKE ALL ON FUNCTION public.rpc_acquire_tier_shard_lease(
  VARCHAR, VARCHAR, VARCHAR, BIGINT, INTEGER
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.rpc_settle_and_release_shard_lease(
  VARCHAR, BIGINT, NUMERIC, BOOLEAN, VARCHAR
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.fn_reencrypt_vault_shard_record(
  VARCHAR, JSONB, VARCHAR, BIGINT
) FROM PUBLIC, anon, authenticated, service_role;

-- Keep service-only v2 procedures installed so in-flight callers do not lose
-- their supported control-plane path during rollback.
