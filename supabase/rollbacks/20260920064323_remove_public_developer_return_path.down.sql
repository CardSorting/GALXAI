-- Restore the prior schema allowance without rewriting normalized billing rows.
-- The public route remains retired; rollback only restores the historical
-- database compatibility boundary for an operator-led migration reversal.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '10s';

ALTER TABLE private.galx_plan_checkouts
  DROP CONSTRAINT IF EXISTS galx_plan_checkouts_return_path_check;

ALTER TABLE private.galx_plan_checkouts
  ADD CONSTRAINT galx_plan_checkouts_return_path_check
  CHECK (return_path IN ('/billing/plan', '/developers'));
