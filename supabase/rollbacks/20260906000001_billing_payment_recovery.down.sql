SET LOCAL lock_timeout = '5s';
-- Never discard an outstanding financial obligation during rollback.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM public.galx_wallets WHERE payment_debt_usd <> 0) THEN
    RAISE EXCEPTION 'Settle outstanding payment debt before rolling back billing recovery';
  END IF;
END $$;
DROP INDEX IF EXISTS public.idx_checkout_request_v2;
DROP INDEX IF EXISTS public.idx_checkout_payment_intent;
DROP INDEX IF EXISTS public.idx_wallet_payment_reference;
ALTER TABLE public.galx_wallets DROP COLUMN IF EXISTS payment_debt_usd;
