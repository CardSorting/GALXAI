-- Retire the public developer landing path from persisted billing return state.
-- Existing attempts are normalized to the neutral billing destination before the
-- constraint is tightened so this migration is safe against historical rows.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '10s';

UPDATE private.galx_plan_checkouts
SET return_path = '/billing/plan'
WHERE return_path = '/developers';

ALTER TABLE private.galx_plan_checkouts
  DROP CONSTRAINT IF EXISTS galx_plan_checkouts_return_path_check;

ALTER TABLE private.galx_plan_checkouts
  ADD CONSTRAINT galx_plan_checkouts_return_path_check
  CHECK (return_path = '/billing/plan');
