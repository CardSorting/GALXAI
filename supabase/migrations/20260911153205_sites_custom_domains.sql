-- Private address ownership. No user-facing Data API or profile metadata authority.
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '30s';
CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE IF NOT EXISTS private.galx_site_namespaces (
  user_id text PRIMARY KEY CHECK (length(user_id) BETWEEN 1 AND 120),
  username text NOT NULL UNIQUE CHECK (username ~ '^[a-z][a-z0-9-]{1,18}[a-z0-9]$' AND username NOT LIKE 'xn--%'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, username)
);
CREATE TABLE IF NOT EXISTS private.galx_site_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  username text NOT NULL,
  project_id text NOT NULL CHECK (length(project_id) BETWEEN 1 AND 120),
  app_slug text NOT NULL CHECK (app_slug ~ '^[a-z0-9]([a-z0-9-]{0,30}[a-z0-9])?$'),
  hostname text GENERATED ALWAYS AS (app_slug || '.' || username || '.galx.ai') STORED UNIQUE,
  status text NOT NULL DEFAULT 'reserved' CHECK (status IN ('reserved','pending','active')),
  attach_started boolean NOT NULL DEFAULT false,
  plan jsonb CHECK (plan IS NULL OR (jsonb_typeof(plan)='object' AND octet_length(plan::text) <= 16384)),
  lease_id uuid,
  lease_until timestamptz,
  next_check_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY(user_id,username) REFERENCES private.galx_site_namespaces(user_id,username),
  UNIQUE(user_id,project_id),
  UNIQUE(user_id,app_slug),
  CHECK ((lease_id IS NULL) = (lease_until IS NULL))
);
ALTER TABLE private.galx_site_namespaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_site_namespaces FORCE ROW LEVEL SECURITY;
ALTER TABLE private.galx_site_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_site_domains FORCE ROW LEVEL SECURITY;
REVOKE ALL ON private.galx_site_namespaces, private.galx_site_domains FROM PUBLIC, anon, authenticated, service_role;
-- Existing private backend connection owns this registry. No browser role gains authority.
COMMENT ON TABLE private.galx_site_namespaces IS 'Server-mediated Site namespace ownership; do not expose through the Data API.';
COMMENT ON TABLE private.galx_site_domains IS 'Retain address and DNS intent across retries; do not recycle uncertain hostnames.';
