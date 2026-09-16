-- Retain the additive return contract during application rollback.
-- Removing or rewriting it can change provider parameters for an uncertain payment.
-- Roll back presentation only; retain the compatible checkout reader and redirects.
DO $$ BEGIN RAISE NOTICE 'Return-path evidence retained; no payment state changed.'; END $$;
