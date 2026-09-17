-- ============================================================================
-- GALXAI: Compute Tier Enrichment Migration
-- Adds durable tier snapshot columns and helpers for the Prepaid Compute Tier
-- strategy ($10-$500 one-time deposits with RPM/TPM concurrency tiers).
-- ============================================================================

-- 1. Add compute_tier columns to galx_wallets
ALTER TABLE public.galx_wallets
  ADD COLUMN IF NOT EXISTS compute_tier_key TEXT NOT NULL DEFAULT 'free'
    CHECK (compute_tier_key IN ('free','developer_10','starter_25','growth_50','fleet_100','sovereign_250','hyperscale_500'));

ALTER TABLE public.galx_wallets
  ADD COLUMN IF NOT EXISTS compute_tier_rpm INTEGER NOT NULL DEFAULT 20
    CHECK (compute_tier_rpm >= 0);

ALTER TABLE public.galx_wallets
  ADD COLUMN IF NOT EXISTS compute_tier_tpm INTEGER NOT NULL DEFAULT 20000
    CHECK (compute_tier_tpm >= 0);

ALTER TABLE public.galx_wallets
  ADD COLUMN IF NOT EXISTS compute_tier_updated_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Add tier_key snapshot to galx_stripe_checkout_sessions
ALTER TABLE public.galx_stripe_checkout_sessions
  ADD COLUMN IF NOT EXISTS tier_key TEXT NOT NULL DEFAULT 'developer_10'
    CHECK (tier_key IN ('developer_10','starter_25','growth_50','fleet_100','sovereign_250','hyperscale_500'));

ALTER TABLE public.galx_stripe_checkout_sessions
  ADD COLUMN IF NOT EXISTS tier_rpm INTEGER NOT NULL DEFAULT 60
    CHECK (tier_rpm >= 0);

ALTER TABLE public.galx_stripe_checkout_sessions
  ADD COLUMN IF NOT EXISTS welcome_grant_usd NUMERIC(14,6) NOT NULL DEFAULT 0
    CHECK (welcome_grant_usd >= 0);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_galx_wallets_compute_tier
  ON public.galx_wallets (compute_tier_key);

CREATE INDEX IF NOT EXISTS idx_galx_stripe_cs_tier_key
  ON public.galx_stripe_checkout_sessions (tier_key);

CREATE INDEX IF NOT EXISTS idx_galx_stripe_cs_metadata_gin
  ON public.galx_stripe_checkout_sessions USING GIN (metadata jsonb_path_ops);

-- 4. Deterministic tier resolver function
-- Single source of truth matching src/lib/stripe/products.ts STRIPE_PRODUCT_TIERS
CREATE OR REPLACE FUNCTION public.fn_resolve_compute_tier(p_deposited_total NUMERIC)
RETURNS TABLE(
  tier_key  TEXT,
  rpm_limit INTEGER,
  tpm_limit INTEGER,
  tier_name TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_deposited_total >= 500 THEN
    RETURN QUERY SELECT 'hyperscale_500'::TEXT, 10000, 2147483647, 'Hyperscale Infra'::TEXT;
  ELSIF p_deposited_total >= 250 THEN
    RETURN QUERY SELECT 'sovereign_250'::TEXT, 1200, 1000000, 'Enterprise Sovereign'::TEXT;
  ELSIF p_deposited_total >= 100 THEN
    RETURN QUERY SELECT 'fleet_100'::TEXT, 600, 500000, 'Fleet Scale'::TEXT;
  ELSIF p_deposited_total >= 50 THEN
    RETURN QUERY SELECT 'growth_50'::TEXT, 300, 200000, 'Growth VIP'::TEXT;
  ELSIF p_deposited_total >= 25 THEN
    RETURN QUERY SELECT 'starter_25'::TEXT, 120, 80000, 'Starter Builder'::TEXT;
  ELSIF p_deposited_total >= 10 THEN
    RETURN QUERY SELECT 'developer_10'::TEXT, 60, 40000, 'Developer Tier'::TEXT;
  ELSE
    RETURN QUERY SELECT 'free'::TEXT, 20, 20000, 'Free Tier'::TEXT;
  END IF;
END;
$$;

-- 5. Trigger function: keep compute_tier_key in sync when deposited_total_usd changes
CREATE OR REPLACE FUNCTION public.fn_refresh_compute_tier()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tier RECORD;
BEGIN
  IF NEW.deposited_total_usd IS NOT DISTINCT FROM OLD.deposited_total_usd THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_tier FROM public.fn_resolve_compute_tier(NEW.deposited_total_usd) LIMIT 1;

  NEW.compute_tier_key        := v_tier.tier_key;
  NEW.compute_tier_rpm        := v_tier.rpm_limit;
  NEW.compute_tier_tpm        := v_tier.tpm_limit;
  NEW.compute_tier_updated_at := NOW();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_galx_wallets_compute_tier ON public.galx_wallets;
CREATE TRIGGER trg_galx_wallets_compute_tier
  BEFORE UPDATE OF deposited_total_usd ON public.galx_wallets
  FOR EACH ROW EXECUTE FUNCTION public.fn_refresh_compute_tier();

-- 6. Back-fill existing wallets
UPDATE public.galx_wallets w
SET
  compute_tier_key        = t.tier_key,
  compute_tier_rpm        = t.rpm_limit,
  compute_tier_tpm        = t.tpm_limit,
  compute_tier_updated_at = NOW()
FROM public.fn_resolve_compute_tier(w.deposited_total_usd) t
WHERE w.compute_tier_key = 'free'
   OR w.compute_tier_updated_at IS NULL;

-- 7. RPC: single-roundtrip tier limits for gateway layer
CREATE OR REPLACE FUNCTION public.fn_get_account_tier_limits(p_user_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_wallet public.galx_wallets%ROWTYPE;
  v_tier   RECORD;
BEGIN
  SELECT * INTO v_wallet FROM public.galx_wallets WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'tier_key', 'free', 'rpm_limit', 20, 'tpm_limit', 20000,
      'tier_name', 'Free Tier', 'balance_usd', 0, 'is_paid', false
    );
  END IF;

  -- Serve hot-path from cached snapshot (refreshed by trigger on every deposit)
  IF v_wallet.compute_tier_updated_at IS NOT NULL
     AND v_wallet.compute_tier_updated_at > NOW() - INTERVAL '1 hour' THEN
    RETURN jsonb_build_object(
      'tier_key',   v_wallet.compute_tier_key,
      'rpm_limit',  v_wallet.compute_tier_rpm,
      'tpm_limit',  v_wallet.compute_tier_tpm,
      'tier_name',  v_wallet.compute_tier_key,
      'balance_usd', v_wallet.balance_usd,
      'is_paid',    v_wallet.proof_of_deposit_verified
    );
  END IF;

  SELECT * INTO v_tier
    FROM public.fn_resolve_compute_tier(v_wallet.deposited_total_usd) LIMIT 1;

  RETURN jsonb_build_object(
    'tier_key',   v_tier.tier_key,
    'rpm_limit',  v_tier.rpm_limit,
    'tpm_limit',  v_tier.tpm_limit,
    'tier_name',  v_tier.tier_name,
    'balance_usd', v_wallet.balance_usd,
    'is_paid',    v_wallet.proof_of_deposit_verified
  );
END;
$$;

COMMENT ON COLUMN public.galx_wallets.compute_tier_key IS
  'Durable tier snapshot: developer_10|starter_25|growth_50|fleet_100|sovereign_250|hyperscale_500|free. Auto-updated by trg_galx_wallets_compute_tier when deposited_total_usd changes.';

COMMENT ON COLUMN public.galx_wallets.compute_tier_rpm IS
  'RPM ceiling for this account at the time the tier was last resolved.';

COMMENT ON COLUMN public.galx_wallets.compute_tier_tpm IS
  'TPM ceiling for this account at the time the tier was last resolved.';

COMMENT ON COLUMN public.galx_stripe_checkout_sessions.tier_key IS
  'Compute tier quoted and locked at checkout creation time.';
