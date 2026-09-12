-- Search only completed private conversation pairs. No new data or public privileges.
SET lock_timeout = '3s';
SET statement_timeout = '30s';
CREATE INDEX IF NOT EXISTS galx_site_turns_recall_idx
  ON private.galx_site_turns USING gin
  (to_tsvector('simple'::regconfig, coalesce(user_text,'') || ' ' || coalesce(assistant_text,'')))
  WHERE state='completed' AND user_text IS NOT NULL AND assistant_text IS NOT NULL;
COMMENT ON INDEX private.galx_site_turns_recall_idx IS 'Private, owner-scoped Sites conversation recall; authorization remains in the workspace repository.';
RESET lock_timeout;
RESET statement_timeout;
