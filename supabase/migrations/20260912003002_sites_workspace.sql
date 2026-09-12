-- Account-scoped authoring state. No browser/Data API grants or provider credentials.
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE IF NOT EXISTS private.galx_site_workspaces (
  id uuid PRIMARY KEY,
  user_id text NOT NULL,
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 90),
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  document jsonb CHECK (document IS NULL OR (jsonb_typeof(document)='object' AND octet_length(document::text)<=16000)),
  published_document jsonb CHECK (published_document IS NULL OR (jsonb_typeof(published_document)='object' AND octet_length(published_document::text)<=16000)),
  published_revision integer CHECK (published_revision IS NULL OR published_revision >= 0),
  messages jsonb NOT NULL DEFAULT '[]' CHECK (jsonb_typeof(messages)='array' AND jsonb_array_length(messages)<=80 AND octet_length(messages::text)<=200000),
  archived boolean NOT NULL DEFAULT false,
  operation_id uuid,
  operation_brief text CHECK (operation_brief IS NULL OR octet_length(operation_brief)<=2000),
  operation_started_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((operation_id IS NULL) = (operation_started_at IS NULL)),
  CHECK ((operation_id IS NULL) = (operation_brief IS NULL)),
  CHECK ((published_document IS NULL) = (published_revision IS NULL))
);
CREATE INDEX IF NOT EXISTS galx_site_workspaces_owner_updated ON private.galx_site_workspaces(user_id,updated_at DESC,id);
ALTER TABLE private.galx_site_workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_site_workspaces FORCE ROW LEVEL SECURITY;
REVOKE ALL ON private.galx_site_workspaces FROM PUBLIC,anon,authenticated,service_role;
