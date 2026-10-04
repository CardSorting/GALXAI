-- GALX Connect: existing account identities, narrowly delegated Nova access.
-- No enrollment, billing, media or publishing permissions are implied.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '10s';

CREATE TABLE IF NOT EXISTS private.galx_inference_access (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  enabled boolean NOT NULL DEFAULT false,
  valid_until timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS private.galx_connect_requests (
  id uuid PRIMARY KEY,
  client_id text NOT NULL,
  redirect_uri text NOT NULL,
  resource text NOT NULL,
  state text NOT NULL,
  challenge text NOT NULL CHECK (challenge ~ '^[A-Za-z0-9_-]{43}$'),
  browser_hash text NOT NULL CHECK (browser_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '10 minutes',
  decided_at timestamptz
);
CREATE INDEX IF NOT EXISTS galx_connect_requests_expiry ON private.galx_connect_requests (expires_at);
CREATE INDEX IF NOT EXISTS galx_connect_requests_rate ON private.galx_connect_requests (client_id, created_at);
CREATE TABLE IF NOT EXISTS private.galx_connect_grants (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id text NOT NULL,
  resource text NOT NULL,
  scope text NOT NULL DEFAULT 'inference:invoke' CHECK (scope = 'inference:invoke'),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS galx_connect_grants_active ON private.galx_connect_grants (user_id, client_id) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS galx_connect_grants_owner ON private.galx_connect_grants (user_id, created_at);
CREATE TABLE IF NOT EXISTS private.galx_connect_codes (
  code_hash text PRIMARY KEY CHECK (code_hash ~ '^[a-f0-9]{64}$'),
  grant_id uuid NOT NULL REFERENCES private.galx_connect_grants(id) ON DELETE CASCADE,
  redirect_uri text NOT NULL,
  challenge text NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '60 seconds',
  consumed_at timestamptz
);
CREATE INDEX IF NOT EXISTS galx_connect_codes_grant ON private.galx_connect_codes (grant_id);
CREATE INDEX IF NOT EXISTS galx_connect_codes_expiry ON private.galx_connect_codes (expires_at);
CREATE TABLE IF NOT EXISTS private.galx_connect_tokens (
  access_hash text PRIMARY KEY CHECK (access_hash ~ '^[a-f0-9]{64}$'),
  refresh_hash text UNIQUE NOT NULL CHECK (refresh_hash ~ '^[a-f0-9]{64}$'),
  grant_id uuid NOT NULL REFERENCES private.galx_connect_grants(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL DEFAULT now() + interval '5 minutes',
  refresh_expires_at timestamptz NOT NULL DEFAULT now() + interval '30 days',
  consumed_at timestamptz
);
CREATE INDEX IF NOT EXISTS galx_connect_tokens_grant ON private.galx_connect_tokens (grant_id);
CREATE INDEX IF NOT EXISTS galx_connect_tokens_expiry ON private.galx_connect_tokens (refresh_expires_at);
CREATE TABLE IF NOT EXISTS private.galx_nova_requests (
  id uuid PRIMARY KEY,
  grant_id uuid NOT NULL REFERENCES private.galx_connect_grants(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_key text NOT NULL,
  fingerprint text NOT NULL,
  state text NOT NULL DEFAULT 'running' CHECK (state IN ('running', 'completed', 'not_accepted', 'unknown')),
  created_at timestamptz NOT NULL DEFAULT now(),
  lease_until timestamptz NOT NULL DEFAULT now() + interval '6 minutes',
  UNIQUE (grant_id, request_key)
);
CREATE INDEX IF NOT EXISTS galx_nova_requests_owner ON private.galx_nova_requests (user_id, created_at);
CREATE INDEX IF NOT EXISTS galx_nova_requests_active ON private.galx_nova_requests (lease_until) WHERE state IN ('running','unknown');
CREATE INDEX IF NOT EXISTS galx_nova_requests_created ON private.galx_nova_requests (created_at);

ALTER TABLE private.galx_inference_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_inference_access FORCE ROW LEVEL SECURITY;
ALTER TABLE private.galx_connect_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_connect_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE private.galx_connect_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_connect_grants FORCE ROW LEVEL SECURITY;
ALTER TABLE private.galx_connect_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_connect_codes FORCE ROW LEVEL SECURITY;
ALTER TABLE private.galx_connect_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_connect_tokens FORCE ROW LEVEL SECURITY;
ALTER TABLE private.galx_nova_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_nova_requests FORCE ROW LEVEL SECURITY;
REVOKE ALL ON private.galx_inference_access, private.galx_connect_requests,
  private.galx_connect_grants, private.galx_connect_codes, private.galx_connect_tokens,
  private.galx_nova_requests FROM PUBLIC, anon, authenticated, service_role;
-- Only the existing privileged server database connection may use these tables.
-- No public RPC or SECURITY DEFINER function is introduced.
