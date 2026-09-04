-- ============================================================================
-- GALXAI Migration: retire competing shard authorities
-- Purpose: Remove legacy/client-callable shard mutation paths and provide
--          service-only gateway compatibility RPCs that delegate lease
--          admission and settlement to the authoritative fenced lease API.
-- Risk: HIGH (authorization, quota accounting, and work ownership).
-- ============================================================================

-- 1. REMOVE UNUSED PRIVILEGES FROM CURRENT AUTHORITY TABLES
-- RLS is defense in depth; table grants remain least-privilege as well.
REVOKE ALL ON TABLE public.galx_shard_accounts FROM service_role;
REVOKE ALL ON TABLE public.galx_shard_leases FROM service_role;
REVOKE ALL ON TABLE public.galx_shard_registry_events FROM service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.galx_shard_accounts TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.galx_shard_leases TO service_role;
GRANT SELECT, INSERT ON TABLE public.galx_shard_registry_events TO service_role;

-- 2. FREEZE THE SUPERSEDED LEASE/TIER TELEMETRY SURFACE
-- Keep rows for incident review and rollback analysis, but no runtime role may
-- use these tables as a second work-ownership system.
ALTER TABLE public.galx_shard_concurrency_leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_shard_concurrency_leases FORCE ROW LEVEL SECURITY;
ALTER TABLE public.galx_shard_health_telemetry_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_shard_health_telemetry_ledger FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_role_all_shard_leases
  ON public.galx_shard_concurrency_leases;
DROP POLICY IF EXISTS users_read_own_shard_leases
  ON public.galx_shard_concurrency_leases;
DROP POLICY IF EXISTS service_role_all_shard_telemetry
  ON public.galx_shard_health_telemetry_ledger;

REVOKE ALL ON TABLE public.galx_shard_concurrency_leases
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE public.galx_shard_health_telemetry_ledger
  FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON TABLE public.galx_shard_concurrency_leases IS
  'RETIRED: forensic-only legacy lease ledger. galx_shard_leases is the sole work-ownership authority.';
COMMENT ON TABLE public.galx_shard_health_telemetry_ledger IS
  'RETIRED with the legacy tier lease path; retained read-only for owner-level incident forensics.';

-- 3. HARDEN THE ACTIVE HEALTH-EVIDENCE SURFACE
ALTER TABLE public.galx_shard_health_probes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_shard_health_probes FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS service_role_all_galx_shard_health
  ON public.galx_shard_health_probes;
CREATE POLICY service_role_all_galx_shard_health
  ON public.galx_shard_health_probes FOR ALL TO service_role
  USING (true) WITH CHECK (true);

REVOKE ALL ON TABLE public.galx_shard_health_probes
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON TABLE public.galx_shard_health_probes TO service_role;

REVOKE ALL ON FUNCTION public.fn_report_shard_health_cf(JSONB)
  FROM PUBLIC, anon, authenticated, service_role;
ALTER FUNCTION public.fn_report_shard_health_cf(JSONB)
  SET search_path = public, pg_temp;
GRANT EXECUTE ON FUNCTION public.fn_report_shard_health_cf(JSONB) TO service_role;

-- 4. RETIRE ROUTINES THAT BYPASS OR REPLACE THE AUTHORITY KERNEL
REVOKE ALL ON FUNCTION public.rpc_acquire_tier_shard_lease(
  VARCHAR, VARCHAR, VARCHAR, BIGINT, INTEGER
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.rpc_settle_and_release_shard_lease(
  VARCHAR, BIGINT, NUMERIC, BOOLEAN, VARCHAR
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.fn_reencrypt_vault_shard_record(
  VARCHAR, JSONB, VARCHAR, BIGINT
) FROM PUBLIC, anon, authenticated, service_role;

ALTER FUNCTION public.rpc_acquire_tier_shard_lease(
  VARCHAR, VARCHAR, VARCHAR, BIGINT, INTEGER
) SET search_path = public, pg_temp;
ALTER FUNCTION public.rpc_settle_and_release_shard_lease(
  VARCHAR, BIGINT, NUMERIC, BOOLEAN, VARCHAR
) SET search_path = public, pg_temp;
ALTER FUNCTION public.fn_reencrypt_vault_shard_record(
  VARCHAR, JSONB, VARCHAR, BIGINT
) SET search_path = public, pg_temp;

COMMENT ON FUNCTION public.rpc_acquire_tier_shard_lease(
  VARCHAR, VARCHAR, VARCHAR, BIGINT, INTEGER
) IS 'RETIRED: bypassed authoritative lease admission. No runtime EXECUTE grant.';
COMMENT ON FUNCTION public.rpc_settle_and_release_shard_lease(
  VARCHAR, BIGINT, NUMERIC, BOOLEAN, VARCHAR
) IS 'RETIRED: bypassed authoritative fenced settlement. No runtime EXECUTE grant.';
COMMENT ON FUNCTION public.fn_reencrypt_vault_shard_record(
  VARCHAR, JSONB, VARCHAR, BIGINT
) IS 'RETIRED: arbitrary credential replacement is operator-only through the transactional rotation CLI.';

-- Legacy composite RPCs inserted/deleted lease rows directly. They remain in
-- place only so ownership metadata and old migrations stay intelligible.
REVOKE ALL ON FUNCTION public.fn_gateway_preflight_composite_mesh(
  VARCHAR, VARCHAR, NUMERIC, VARCHAR
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.fn_gateway_postflight_composite_mesh(
  VARCHAR, UUID, VARCHAR, VARCHAR, NUMERIC, VARCHAR,
  INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, VARCHAR
) FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON FUNCTION public.fn_gateway_preflight_composite_mesh(
  VARCHAR, VARCHAR, NUMERIC, VARCHAR
) IS 'RETIRED: use fn_gateway_preflight_composite_mesh_v2 with a caller-supplied idempotency key.';
COMMENT ON FUNCTION public.fn_gateway_postflight_composite_mesh(
  VARCHAR, UUID, VARCHAR, VARCHAR, NUMERIC, VARCHAR,
  INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, VARCHAR
) IS 'RETIRED: use fn_gateway_postflight_composite_mesh_v2 for authoritative idempotent settlement.';

-- This procedure projects QoS state but does not acquire a shard lease. It is
-- retained for backend compatibility and must never be client-callable.
REVOKE ALL ON FUNCTION public.fn_gateway_preflight_qos_universal_v3(
  VARCHAR, VARCHAR, VARCHAR, VARCHAR
) FROM PUBLIC, anon, authenticated, service_role;
ALTER FUNCTION public.fn_gateway_preflight_qos_universal_v3(
  VARCHAR, VARCHAR, VARCHAR, VARCHAR
) SET search_path = public, pg_temp;
GRANT EXECUTE ON FUNCTION public.fn_gateway_preflight_qos_universal_v3(
  VARCHAR, VARCHAR, VARCHAR, VARCHAR
) TO service_role;

-- 5. IDEMPOTENT SETTLEMENT GUARD
-- The wallet row lock serializes normal retries. This unique index is the final
-- integrity boundary if a future caller accidentally bypasses that lock.
CREATE UNIQUE INDEX IF NOT EXISTS idx_galx_wallet_usage_draw_lease_once
  ON public.galx_wallet_transactions ((metadata->>'lease_id'))
  WHERE transaction_type = 'usage_draw'
    AND metadata ? 'lease_id'
    AND NULLIF(metadata->>'lease_id', '') IS NOT NULL;

-- 6. VERSIONED PREFLIGHT: AUTHENTICATE, THEN ASK THE AUTHORITY FOR A LEASE
CREATE OR REPLACE FUNCTION public.fn_gateway_preflight_composite_mesh_v2(
  p_key_hash VARCHAR(64),
  p_requested_model VARCHAR(64),
  p_estimated_cost NUMERIC DEFAULT 0.05,
  p_worker_id VARCHAR(64) DEFAULT 'gateway',
  p_request_id VARCHAR(128) DEFAULT NULL,
  p_estimated_tokens BIGINT DEFAULT 2000
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now_ms BIGINT := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
  v_key RECORD;
  v_workspace RECORD;
  v_wallet RECORD;
  v_shard RECORD;
  v_existing_lease RECORD;
  v_lease_result JSONB;
  v_last_rejection JSONB;
  v_job_id VARCHAR(128);
  v_ticket_id VARCHAR(68);
BEGIN
  IF p_request_id IS NULL OR btrim(p_request_id) = '' OR length(p_request_id) > 128 THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'IDEMPOTENCY_KEY_REQUIRED');
  END IF;
  IF p_estimated_cost < 0 THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_ESTIMATED_COST');
  END IF;
  IF p_estimated_tokens <= 0 OR p_estimated_tokens > 10000000 THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_TOKEN_RESERVATION');
  END IF;

  SELECT * INTO v_key
  FROM public.galx_developer_keys
  WHERE key_hash = p_key_hash
    AND is_revoked = false;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_API_KEY');
  END IF;

  SELECT * INTO v_workspace
  FROM public.galx_workspaces
  WHERE id = v_key.workspace_id;
  IF FOUND AND v_workspace.monthly_spend_cap_usd IS NOT NULL
     AND v_workspace.current_month_spend_usd + p_estimated_cost > v_workspace.monthly_spend_cap_usd THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'SPEND_CAP_EXCEEDED');
  END IF;

  SELECT * INTO v_wallet
  FROM public.galx_wallets
  WHERE user_id = v_key.user_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'WALLET_NOT_FOUND');
  END IF;
  IF v_wallet.balance_usd < p_estimated_cost THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'INSUFFICIENT_FUNDS');
  END IF;

  -- Domain-separated request identity: no raw API key hash or provider identity
  -- appears in the lease/job identifier or in logs.
  v_job_id := 'gateway:' || encode(
    extensions.digest(v_key.id::text || ':preflight:v2:' || p_request_id, 'sha256'),
    'hex'
  );
  v_ticket_id := 'tkt_' || substring(v_job_id FROM 9);

  -- Serialize retries before choosing a shard so concurrent copies of the same
  -- request cannot acquire different shards.
  PERFORM pg_advisory_xact_lock(hashtextextended(v_job_id, 0));

  SELECT l.* INTO v_existing_lease
  FROM public.galx_shard_leases l
  WHERE l.user_id = v_key.user_id
    AND l.job_id = v_job_id
  ORDER BY l.acquired_at_ms DESC
  LIMIT 1;

  IF FOUND THEN
    IF v_existing_lease.is_committed OR v_existing_lease.is_reclaimed THEN
      RETURN jsonb_build_object(
        'success', false,
        'error_code', 'REQUEST_ALREADY_TERMINAL',
        'ticket_id', v_ticket_id,
        'lease_id', v_existing_lease.id
      );
    END IF;

    v_lease_result := public.fn_acquire_shard_lease(
      v_existing_lease.shard_id,
      v_key.user_id,
      p_estimated_tokens,
      120000,
      v_job_id,
      v_now_ms
    );
  ELSE
    FOR v_shard IN
      SELECT a.*
      FROM public.galx_shard_accounts a
      WHERE a.status = 'healthy'
        AND a.permission_retracted = false
        AND a.provider::text = 'openai'
      ORDER BY a.priority DESC, a.hydraulic_headroom_score DESC,
               a.average_latency_ms ASC, a.id ASC
    LOOP
      v_lease_result := public.fn_acquire_shard_lease(
        v_shard.id,
        v_key.user_id,
        p_estimated_tokens,
        120000,
        v_job_id,
        v_now_ms
      );
      IF COALESCE((v_lease_result->>'success')::BOOLEAN, false) THEN
        EXIT;
      END IF;
      v_last_rejection := v_lease_result;
      v_lease_result := NULL;
    END LOOP;
  END IF;

  IF v_lease_result IS NULL OR NOT COALESCE((v_lease_result->>'success')::BOOLEAN, false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', COALESCE(v_last_rejection->>'reason', v_lease_result->>'reason', 'NO_AUTHORIZED_SHARD')
    );
  END IF;

  SELECT * INTO v_shard
  FROM public.galx_shard_accounts
  WHERE id = v_lease_result->>'shard_id';

  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'ticket_id', v_ticket_id,
    'user_id', v_key.user_id,
    'workspace_id', v_key.workspace_id,
    'key_id', v_key.id,
    'scopes', ARRAY['*']::TEXT[],
    'wallet_id', v_wallet.id,
    'current_balance_usd', v_wallet.balance_usd,
    'shard_id', v_shard.id,
    'shard_provider', v_shard.provider,
    'lease_id', v_lease_result->>'lease_id',
    'fencing_token', (v_lease_result->>'fencing_token')::BIGINT,
    'lease_expires_at_ms', (v_lease_result->>'expires_at_ms')::BIGINT,
    'idempotent_replay', COALESCE((v_lease_result->>'idempotent_replay')::BOOLEAN, false),
    'model', p_requested_model,
    'worker_id', p_worker_id,
    'timestamp_ms', v_now_ms
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_gateway_preflight_composite_mesh_v2(
  VARCHAR, VARCHAR, NUMERIC, VARCHAR, VARCHAR, BIGINT
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_gateway_preflight_composite_mesh_v2(
  VARCHAR, VARCHAR, NUMERIC, VARCHAR, VARCHAR, BIGINT
) TO service_role;

COMMENT ON FUNCTION public.fn_gateway_preflight_composite_mesh_v2(
  VARCHAR, VARCHAR, NUMERIC, VARCHAR, VARCHAR, BIGINT
) IS 'Service-only, request-idempotent gateway preflight delegating work ownership to fn_acquire_shard_lease.';

-- 7. VERSIONED POSTFLIGHT: SETTLE EXACTLY ONCE, NEVER DELETE A LEASE
CREATE OR REPLACE FUNCTION public.fn_gateway_postflight_composite_mesh_v2(
  p_user_id VARCHAR(255),
  p_workspace_id UUID,
  p_shard_id VARCHAR(64),
  p_lease_id VARCHAR(64),
  p_actual_cost NUMERIC,
  p_model VARCHAR(64),
  p_prompt_tokens INTEGER DEFAULT 0,
  p_completion_tokens INTEGER DEFAULT 0,
  p_cached_tokens INTEGER DEFAULT 0,
  p_latency_ms INTEGER DEFAULT 50,
  p_status_code INTEGER DEFAULT 200,
  p_client_ip VARCHAR(45) DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_wallet RECORD;
  v_lease RECORD;
  v_existing_tx RECORD;
  v_release_result JSONB;
  v_new_balance NUMERIC;
  v_new_spent NUMERIC;
  v_tx_id UUID;
  v_now_ms BIGINT := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
  v_actual_tokens BIGINT;
BEGIN
  IF p_lease_id IS NULL OR btrim(p_lease_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'LEASE_REQUIRED');
  END IF;
  IF p_actual_cost < 0 OR p_prompt_tokens < 0 OR p_completion_tokens < 0
     OR p_cached_tokens < 0 OR p_latency_ms < 0 THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'INVALID_SETTLEMENT');
  END IF;

  SELECT l.* INTO v_lease
  FROM public.galx_shard_leases l
  WHERE l.id = p_lease_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'LEASE_NOT_FOUND');
  END IF;
  IF v_lease.user_id <> p_user_id
     OR (p_shard_id IS NOT NULL AND v_lease.shard_id <> p_shard_id) THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'LEASE_SUBJECT_MISMATCH');
  END IF;

  -- Serialize financial settlement by wallet before checking the unique lease
  -- receipt. SQL errors roll back both the wallet ledger and lease release.
  SELECT * INTO v_wallet
  FROM public.galx_wallets
  WHERE user_id = p_user_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'WALLET_NOT_FOUND');
  END IF;

  SELECT t.id INTO v_existing_tx
  FROM public.galx_wallet_transactions t
  WHERE t.transaction_type = 'usage_draw'
    AND t.metadata->>'lease_id' = p_lease_id
  LIMIT 1;
  IF FOUND THEN
    RETURN jsonb_build_object(
      'success', true,
      'idempotent_replay', true,
      'transaction_id', v_existing_tx.id,
      'user_id', p_user_id,
      'final_balance_usd', v_wallet.balance_usd,
      'deducted_usd', p_actual_cost,
      'latency_ms', p_latency_ms
    );
  END IF;

  v_actual_tokens := p_prompt_tokens::BIGINT + p_completion_tokens::BIGINT;
  v_release_result := public.fn_release_shard_lease(
    p_lease_id,
    v_actual_tokens,
    p_latency_ms::NUMERIC,
    p_status_code BETWEEN 200 AND 399,
    v_now_ms
  );
  IF NOT COALESCE((v_release_result->>'success')::BOOLEAN, false) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', COALESCE(v_release_result->>'reason', 'LEASE_RELEASE_REJECTED')
    );
  END IF;

  v_new_balance := GREATEST(0.0, v_wallet.balance_usd - p_actual_cost);
  v_new_spent := v_wallet.lifetime_spent_usd + p_actual_cost;

  UPDATE public.galx_wallets
  SET balance_usd = v_new_balance,
      lifetime_spent_usd = v_new_spent,
      updated_at = clock_timestamp()
  WHERE id = v_wallet.id;

  INSERT INTO public.galx_wallet_transactions (
    wallet_id, user_id, transaction_type, amount_usd, balance_after_usd,
    description, metadata, created_at
  ) VALUES (
    v_wallet.id,
    p_user_id,
    'usage_draw',
    -p_actual_cost,
    v_new_balance,
    'Composite Inference: ' || p_model || ' (' || p_prompt_tokens || 'p/' || p_completion_tokens || 'c)',
    jsonb_build_object(
      'model', p_model,
      'prompt_tokens', p_prompt_tokens,
      'completion_tokens', p_completion_tokens,
      'cached_tokens', p_cached_tokens,
      'latency_ms', p_latency_ms,
      'lease_id', p_lease_id,
      'fencing_token', v_lease.fencing_token
    ),
    clock_timestamp()
  ) RETURNING id INTO v_tx_id;

  IF p_workspace_id IS NOT NULL AND p_actual_cost > 0 THEN
    UPDATE public.galx_workspaces
    SET current_month_spend_usd = current_month_spend_usd + p_actual_cost,
        updated_at = clock_timestamp()
    WHERE id = p_workspace_id;
  END IF;

  INSERT INTO public.galx_audit_logs (
    id, user_id, shard_id, action, resource_type, resource_id, ip_address,
    metadata, timestamp_ms, created_at
  ) VALUES (
    'audit_gateway_' || replace(gen_random_uuid()::text, '-', ''),
    p_user_id,
    v_lease.shard_id,
    'inference_dispatch',
    'model',
    p_model,
    p_client_ip,
    jsonb_build_object(
      'cost_usd', p_actual_cost,
      'latency_ms', p_latency_ms,
      'status_code', p_status_code,
      'lease_id', p_lease_id,
      'tokens', jsonb_build_object(
        'prompt', p_prompt_tokens,
        'completion', p_completion_tokens,
        'cached', p_cached_tokens
      )
    ),
    v_now_ms,
    clock_timestamp()
  );

  INSERT INTO public.galx_metrics_telemetry (
    user_id, provider, model_id, shard_id, latency_ms, prompt_tokens,
    completion_tokens, total_tokens, is_error, status_code,
    timestamp_ms, created_at
  ) VALUES (
    p_user_id,
    (SELECT a.provider FROM public.galx_shard_accounts a WHERE a.id = v_lease.shard_id),
    p_model,
    v_lease.shard_id,
    p_latency_ms,
    p_prompt_tokens,
    p_completion_tokens,
    p_prompt_tokens + p_completion_tokens,
    NOT (p_status_code BETWEEN 200 AND 399),
    p_status_code,
    v_now_ms,
    clock_timestamp()
  );

  RETURN jsonb_build_object(
    'success', true,
    'idempotent_replay', false,
    'transaction_id', v_tx_id,
    'user_id', p_user_id,
    'final_balance_usd', v_new_balance,
    'deducted_usd', p_actual_cost,
    'latency_ms', p_latency_ms,
    'lease_id', p_lease_id,
    'committed_tokens', v_release_result->>'committed_tokens'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_gateway_postflight_composite_mesh_v2(
  VARCHAR, UUID, VARCHAR, VARCHAR, NUMERIC, VARCHAR,
  INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, VARCHAR
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_gateway_postflight_composite_mesh_v2(
  VARCHAR, UUID, VARCHAR, VARCHAR, NUMERIC, VARCHAR,
  INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, VARCHAR
) TO service_role;

COMMENT ON FUNCTION public.fn_gateway_postflight_composite_mesh_v2(
  VARCHAR, UUID, VARCHAR, VARCHAR, NUMERIC, VARCHAR,
  INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, VARCHAR
) IS 'Service-only, exactly-once gateway settlement delegating quota reconciliation to fn_release_shard_lease.';
