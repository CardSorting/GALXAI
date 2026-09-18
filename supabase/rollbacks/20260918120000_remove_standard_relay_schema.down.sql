-- This migration intentionally deletes retired control-plane records. A
-- rollback cannot reconstruct credentials, registrations, assignments or
-- lease history, so refuse rather than falsely claim data restoration.
DO $rollback$
BEGIN
  RAISE EXCEPTION 'remove_standard_relay_schema is irreversible because retired control-plane records were deleted';
END $rollback$;
