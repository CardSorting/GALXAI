SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='10s';
-- NULL preserves the provider parameters of attempts created by older releases.
-- New application attempts explicitly select the canonical Plan destination.
ALTER TABLE private.galx_plan_checkouts
  ADD COLUMN IF NOT EXISTS return_path text CHECK (return_path = '/billing/plan');
COMMENT ON COLUMN private.galx_plan_checkouts.return_path IS
  'Persisted Checkout return contract; NULL retains historical /billing parameters.';
-- Existing forced RLS and denied browser-role privileges remain authoritative.
