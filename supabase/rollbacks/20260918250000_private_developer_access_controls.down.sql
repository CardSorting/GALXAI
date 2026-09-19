-- Controlled rollback for the additive developer-key controls.
-- Run only after the application has stopped reading these columns; the
-- columns are intentionally removed here because this is the paired reverse
-- of the migration, not a live compatibility operation.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '10s';

ALTER TABLE public.galx_developer_keys
  DROP COLUMN IF EXISTS default_compaction_mode,
  DROP COLUMN IF EXISTS expires_at,
  DROP COLUMN IF EXISTS scopes,
  DROP COLUMN IF EXISTS environment;
