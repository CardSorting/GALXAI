SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

-- Restricted $5 welcome benefit. Never a deposit or general-purpose balance.
-- Retain grants across account deletion so recreating an email cannot reset usage.
CREATE TABLE IF NOT EXISTS private.galx_free_generation_grants (
  user_id uuid PRIMARY KEY,
  identity_hash text NOT NULL UNIQUE CHECK (identity_hash ~ '^[a-f0-9]{64}$'),
  allowance_usd numeric(14,6) NOT NULL DEFAULT 5 CHECK (allowance_usd = 5),
  site_id uuid UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS private.galx_free_generation_usage (
  user_id uuid NOT NULL REFERENCES private.galx_free_generation_grants(user_id),
  kind text NOT NULL CHECK (kind IN ('site', 'image')),
  operation_id text NOT NULL CHECK (length(operation_id) BETWEEN 1 AND 160),
  quantity smallint NOT NULL CHECK (quantity BETWEEN 1 AND 5 AND (kind <> 'site' OR quantity = 1)),
  released boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, kind, operation_id)
);
ALTER TABLE private.galx_free_generation_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_free_generation_grants FORCE ROW LEVEL SECURITY;
ALTER TABLE private.galx_free_generation_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_free_generation_usage FORCE ROW LEVEL SECURITY;
REVOKE ALL ON private.galx_free_generation_grants, private.galx_free_generation_usage FROM PUBLIC, anon, authenticated, service_role;
COMMENT ON TABLE private.galx_free_generation_grants IS 'One-time restricted welcome allowance: one workspace, three turns, five images. Server account authority only; no cash value.';
