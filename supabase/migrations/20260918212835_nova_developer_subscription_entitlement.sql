-- GALX Nova Developer Access uses the existing recurring-subscription
-- projection. The discriminator keeps Pro and Developer entitlement records
-- distinct without creating a second billing ledger or usage system.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '10s';

ALTER TABLE private.galx_plan_subscriptions
  ADD COLUMN IF NOT EXISTS plan_key text NOT NULL DEFAULT 'pro-v1';

ALTER TABLE private.galx_plan_subscriptions
  DROP CONSTRAINT IF EXISTS galx_plan_subscriptions_plan_key_check;

ALTER TABLE private.galx_plan_subscriptions
  ADD CONSTRAINT galx_plan_subscriptions_plan_key_check
  CHECK (plan_key IN ('pro-v1', 'nova-developer-v1'));

CREATE INDEX IF NOT EXISTS galx_plan_subscriptions_entitlement
  ON private.galx_plan_subscriptions (user_id, plan_key, period_end)
  WHERE status = 'active';

ALTER TABLE private.galx_plan_checkouts
  DROP CONSTRAINT IF EXISTS galx_plan_checkouts_return_path_check;

ALTER TABLE private.galx_plan_checkouts
  ADD CONSTRAINT galx_plan_checkouts_return_path_check
  CHECK (return_path IN ('/billing/plan', '/developers'));
