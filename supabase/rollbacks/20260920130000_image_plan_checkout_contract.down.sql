-- Roll back the plan-aware billing contract without deleting billing evidence.
-- Refuse the rollback if a new image-plan record exists; erasing its type would
-- make lifecycle reconciliation ambiguous.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '10s';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM private.galx_plan_checkouts
    WHERE plan_key IN ('creator-v1', 'studio-v1', 'team-v1')
  ) OR EXISTS (
    SELECT 1 FROM private.galx_plan_subscriptions
    WHERE plan_key IN ('creator-v1', 'studio-v1', 'team-v1')
  ) THEN
    RAISE EXCEPTION 'Cannot roll back image plan contract while image plan billing records exist';
  END IF;
END
$$;

ALTER TABLE private.galx_plan_subscriptions
  DROP CONSTRAINT IF EXISTS galx_plan_subscriptions_plan_key_check;

ALTER TABLE private.galx_plan_subscriptions
  ADD CONSTRAINT galx_plan_subscriptions_plan_key_check
  CHECK (plan_key IN ('pro-v1', 'nova-developer-v1'));

ALTER TABLE private.galx_plan_checkouts
  DROP CONSTRAINT IF EXISTS galx_plan_checkouts_plan_key_check;

ALTER TABLE private.galx_plan_checkouts
  DROP COLUMN IF EXISTS plan_key;
