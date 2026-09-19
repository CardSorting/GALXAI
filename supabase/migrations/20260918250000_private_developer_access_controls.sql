-- Preserve durable credential controls for explicitly authorized private cohorts.
-- These columns extend the existing key registry; they do not create a public offer.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '10s';

ALTER TABLE public.galx_developer_keys
  ADD COLUMN IF NOT EXISTS environment text NOT NULL DEFAULT 'live',
  ADD COLUMN IF NOT EXISTS scopes text[] NOT NULL DEFAULT ARRAY['*']::text[],
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS default_compaction_mode text NOT NULL DEFAULT 'auto';

UPDATE public.galx_developer_keys
SET environment = CASE WHEN prefix LIKE 'galx_test_%' THEN 'test' ELSE 'live' END
WHERE environment IS NULL OR environment = '';

ALTER TABLE public.galx_developer_keys
  DROP CONSTRAINT IF EXISTS galx_developer_keys_environment_check,
  ADD CONSTRAINT galx_developer_keys_environment_check CHECK (environment IN ('live', 'test'));

ALTER TABLE public.galx_developer_keys
  DROP CONSTRAINT IF EXISTS galx_developer_keys_compaction_mode_check,
  ADD CONSTRAINT galx_developer_keys_compaction_mode_check CHECK (default_compaction_mode IN ('auto', 'raw'));
