-- ==============================================================================
-- ROLLBACK: 20260901000057_galxai_lumi_and_community_pools_industrial_apex.down.sql
-- ==============================================================================

DROP FUNCTION IF EXISTS public.rpc_sweep_expired_lumi_leases();
DROP FUNCTION IF EXISTS public.rpc_settle_lumi_stream_lease_v2(TEXT, TEXT, BIGINT, BIGINT, BIGINT);
DROP FUNCTION IF EXISTS public.rpc_heartbeat_lumi_stream_lease(TEXT, TEXT, INTEGER);
DROP FUNCTION IF EXISTS public.rpc_acquire_lumi_stream_lease_v2(TEXT, TEXT, TEXT, TEXT, INTEGER, INTEGER, INTEGER);

ALTER TABLE public.community_user_monthly_grants
  DROP COLUMN IF EXISTS is_quarantined,
  DROP COLUMN IF EXISTS trust_score,
  DROP COLUMN IF EXISTS ip_subnet_prefix,
  DROP COLUMN IF EXISTS primary_device_fingerprint;

DROP TABLE IF EXISTS public.community_anti_abuse_quarantine CASCADE;

ALTER TABLE public.lumi_user_pool_leases
  DROP COLUMN IF EXISTS client_fingerprint_sha256,
  DROP COLUMN IF EXISTS is_reasoning_extended,
  DROP COLUMN IF EXISTS heartbeat_count,
  DROP COLUMN IF EXISTS heartbeat_at;

ALTER TABLE public.lumi_user_rolling_quotas
  DROP COLUMN IF EXISTS model_warp_spent_5h,
  DROP COLUMN IF EXISTS fractional_credits_available,
  DROP COLUMN IF EXISTS last_credit_refill_at,
  DROP COLUMN IF EXISTS continuous_decay_rate_per_sec;

DROP TABLE IF EXISTS public.lumi_model_warp_multipliers CASCADE;
