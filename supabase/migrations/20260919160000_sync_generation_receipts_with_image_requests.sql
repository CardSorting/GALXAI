-- GALXAI: keep canonical generation receipts synchronized with durable image requests
--
-- Image requests are the existing durable execution receipt. The private
-- generation record is the provenance receipt used by autonomous ownership
-- checks and analytics, so state transitions must move together.

SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

CREATE OR REPLACE FUNCTION private.galx_sync_generation_for_image_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  UPDATE private.galx_generation_records
  SET state = NEW.state,
      completed_at = CASE
        WHEN NEW.state = 'completed' THEN COALESCE(completed_at, now())
        ELSE completed_at
      END,
      updated_at = now()
  WHERE id = NEW.id::TEXT
    AND account_id = NEW.user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Image request is missing its canonical generation receipt'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION private.galx_sync_generation_for_image_request() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS galx_sync_generation_for_image_request ON private.galx_image_requests;
CREATE TRIGGER galx_sync_generation_for_image_request
AFTER UPDATE OF state, asset_ids ON private.galx_image_requests
FOR EACH ROW EXECUTE FUNCTION private.galx_sync_generation_for_image_request();

COMMENT ON FUNCTION private.galx_sync_generation_for_image_request() IS
  'Synchronizes durable image request state to the private generation provenance receipt.';
