-- Retain debt from refunds of already-consumed credit without making spendable
-- balance negative. Only the server-owned payment ledger changes this column.
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.galx_wallets ADD COLUMN IF NOT EXISTS payment_debt_usd NUMERIC(14,6) NOT NULL DEFAULT 0 CHECK (payment_debt_usd >= 0);
ALTER TABLE public.galx_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_wallets FORCE ROW LEVEL SECURITY;
DO $$ BEGIN
  ALTER TABLE public.galx_wallets ADD CONSTRAINT payment_debt_blocks_spending CHECK (payment_debt_usd = 0 OR balance_usd = 0);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_checkout_request_v2 ON public.galx_stripe_checkout_sessions (user_id,(metadata->>'requestId')) WHERE metadata->>'fulfillmentVersion' = '2';
CREATE INDEX IF NOT EXISTS idx_checkout_payment_intent ON public.galx_stripe_checkout_sessions (payment_intent_id) WHERE payment_intent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wallet_payment_reference ON public.galx_wallet_transactions ((metadata->>'payment_ref')) WHERE transaction_type IN ('deposit','auto_reload','refund','adjustment');
