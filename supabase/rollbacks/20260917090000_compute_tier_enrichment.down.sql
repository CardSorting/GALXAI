-- Rollback for 20260917090000_compute_tier_enrichment.sql
DROP TRIGGER IF EXISTS trg_galx_wallets_compute_tier ON public.galx_wallets;
DROP FUNCTION IF EXISTS public.fn_get_account_tier_limits(text);
DROP FUNCTION IF EXISTS public.fn_refresh_compute_tier();
DROP FUNCTION IF EXISTS public.fn_resolve_compute_tier(numeric);
DROP INDEX IF EXISTS public.idx_galx_stripe_cs_metadata_gin;
DROP INDEX IF EXISTS public.idx_galx_stripe_cs_tier_key;
DROP INDEX IF EXISTS public.idx_galx_wallets_compute_tier;
ALTER TABLE public.galx_stripe_checkout_sessions DROP COLUMN IF EXISTS welcome_grant_usd;
ALTER TABLE public.galx_stripe_checkout_sessions DROP COLUMN IF EXISTS tier_rpm;
ALTER TABLE public.galx_stripe_checkout_sessions DROP COLUMN IF EXISTS tier_key;
ALTER TABLE public.galx_wallets DROP COLUMN IF EXISTS compute_tier_updated_at;
ALTER TABLE public.galx_wallets DROP COLUMN IF EXISTS compute_tier_tpm;
ALTER TABLE public.galx_wallets DROP COLUMN IF EXISTS compute_tier_rpm;
ALTER TABLE public.galx_wallets DROP COLUMN IF EXISTS compute_tier_key;
