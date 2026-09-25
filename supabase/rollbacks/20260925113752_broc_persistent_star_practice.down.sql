DO $rollback$
BEGIN
  IF EXISTS (SELECT 1 FROM private.galx_star_practice_events LIMIT 1) THEN
    RAISE EXCEPTION
      'BROC practice history is in use; preserve its canon and events instead of dropping the table';
  END IF;
END;
$rollback$;

DROP TRIGGER IF EXISTS galx_guard_star_practice_event
  ON private.galx_star_practice_events;
DROP TABLE IF EXISTS private.galx_star_practice_events;
DROP FUNCTION IF EXISTS private.galx_guard_star_practice_event();
