-- Data-retaining marker: canonical generation receipt synchronization remains
-- enabled so ownership and analytics cannot regress during rollback operations.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

DO $$
BEGIN
  IF to_regclass('private.galx_image_requests') IS NULL THEN
    RAISE EXCEPTION 'Durable image request table is missing' USING ERRCODE = '55000';
  END IF;
  RAISE NOTICE 'Generation receipt synchronization retained for data-safe rollback';
END
$$;
