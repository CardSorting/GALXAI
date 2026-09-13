-- Roll back the application first. Refuse to discard accepted requests.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '10s';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM private.galx_image_requests) THEN
    RAISE EXCEPTION 'Image receipts exist; retain the additive table during application rollback';
  END IF;
END $$;
DROP TABLE private.galx_image_requests;
