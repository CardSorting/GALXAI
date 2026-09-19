-- Retain the safety boundary: do not remove the discriminator while any paid
-- Developer subscription projection still depends on it.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM private.galx_plan_subscriptions
    WHERE plan_key = 'nova-developer-v1'
  ) THEN
    RAISE EXCEPTION 'Cannot roll back Developer subscription entitlement mapping while Developer subscription records exist';
  END IF;
END $$;

DROP INDEX IF EXISTS private.galx_plan_subscriptions_entitlement;
ALTER TABLE private.galx_plan_subscriptions DROP CONSTRAINT IF EXISTS galx_plan_subscriptions_plan_key_check;
ALTER TABLE private.galx_plan_subscriptions DROP COLUMN IF EXISTS plan_key;

ALTER TABLE private.galx_plan_checkouts
  DROP CONSTRAINT IF EXISTS galx_plan_checkouts_return_path_check;

ALTER TABLE private.galx_plan_checkouts
  ADD CONSTRAINT galx_plan_checkouts_return_path_check
  CHECK (return_path = '/billing/plan');
