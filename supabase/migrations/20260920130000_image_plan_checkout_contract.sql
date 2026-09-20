-- Add the allowlisted Image Studio plan identity to durable billing records.
-- Historical checkout attempts stay compatible with a nullable plan_key; all
-- new application-created attempts write one of the supported plan values.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '10s';

ALTER TABLE private.galx_plan_checkouts
  ADD COLUMN IF NOT EXISTS plan_key text;

ALTER TABLE private.galx_plan_checkouts
  DROP CONSTRAINT IF EXISTS galx_plan_checkouts_plan_key_check;

ALTER TABLE private.galx_plan_checkouts
  ADD CONSTRAINT galx_plan_checkouts_plan_key_check
  CHECK (plan_key IS NULL OR plan_key IN ('pro-v1', 'creator-v1', 'studio-v1', 'team-v1', 'nova-developer-v1'));

COMMENT ON COLUMN private.galx_plan_checkouts.plan_key IS
  'Server-selected billing contract. NULL is retained only for historical attempts created before plan-aware checkout.';

ALTER TABLE private.galx_plan_subscriptions
  DROP CONSTRAINT IF EXISTS galx_plan_subscriptions_plan_key_check;

ALTER TABLE private.galx_plan_subscriptions
  ADD CONSTRAINT galx_plan_subscriptions_plan_key_check
  CHECK (plan_key IN ('pro-v1', 'creator-v1', 'studio-v1', 'team-v1', 'nova-developer-v1'));
