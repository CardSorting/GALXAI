-- Server-only authority. Deliberately no production limits or paid-price assumptions.
SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='10s';
CREATE TABLE IF NOT EXISTS private.galx_sites_fair_policy (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  mode text NOT NULL DEFAULT 'disabled' CHECK (mode IN ('disabled','shadow','enforce')),
  pool_id text NOT NULL CHECK (char_length(pool_id) BETWEEN 1 AND 120),
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  limits jsonb CHECK (limits IS NULL OR jsonb_typeof(limits)='object'),
  paid_price_ids text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO private.galx_sites_fair_policy(singleton,pool_id) VALUES(true,'sites-shared-delivery') ON CONFLICT DO NOTHING;
CREATE TABLE IF NOT EXISTS private.galx_sites_fair_pools (
  pool_id text PRIMARY KEY,
  revision bigint NOT NULL DEFAULT 0 CHECK (revision >= 0),
  snapshot jsonb,
  refresh_token uuid,
  refresh_until timestamptz,
  cooldown_until timestamptz
);
CREATE TABLE IF NOT EXISTS private.galx_sites_fair_invocations (
  account_id text NOT NULL,
  invocation_id text NOT NULL CHECK (char_length(invocation_id) BETWEEN 1 AND 120),
  pool_id text NOT NULL REFERENCES private.galx_sites_fair_pools(pool_id),
  digest text NOT NULL CHECK (digest ~ '^[a-f0-9]{64}$'),
  allowance_window bigint NOT NULL,
  policy_revision bigint NOT NULL,
  snapshot_revision bigint NOT NULL,
  lane text NOT NULL CHECK (lane IN ('BASELINE','CONTINUATION')),
  counted boolean NOT NULL DEFAULT true,
  state text NOT NULL CHECK (state IN ('reserved','dispatching','completed','not_started','failed','unknown')),
  admitted_at timestamptz NOT NULL,
  grant_id uuid NOT NULL UNIQUE,
  grant_expires_at timestamptz NOT NULL,
  job_id text,
  origin text,
  non_dispatch_evidence jsonb,
  output text CHECK (output IS NULL OR octet_length(output)<=12000),
  PRIMARY KEY(account_id,invocation_id),
  CHECK ((job_id IS NULL) = (origin IS NULL))
);
CREATE INDEX IF NOT EXISTS galx_sites_fair_account_window ON private.galx_sites_fair_invocations(account_id,allowance_window) WHERE counted;
CREATE INDEX IF NOT EXISTS galx_sites_fair_flow ON private.galx_sites_fair_invocations(pool_id,admitted_at);
CREATE INDEX IF NOT EXISTS galx_sites_fair_account_flow ON private.galx_sites_fair_invocations(account_id,admitted_at);
CREATE INDEX IF NOT EXISTS galx_sites_fair_outstanding ON private.galx_sites_fair_invocations(pool_id,account_id) WHERE state IN ('reserved','dispatching','unknown');
CREATE TABLE IF NOT EXISTS private.galx_sites_fair_demand (
  pool_id text NOT NULL REFERENCES private.galx_sites_fair_pools(pool_id),
  account_id text NOT NULL,
  expires_at timestamptz NOT NULL,
  PRIMARY KEY(pool_id,account_id)
);
CREATE INDEX IF NOT EXISTS galx_sites_fair_demand_expiry ON private.galx_sites_fair_demand(pool_id,expires_at);
CREATE TABLE IF NOT EXISTS private.galx_sites_fair_cooldowns (
  account_id text PRIMARY KEY,
  until_at timestamptz NOT NULL
);
-- Old in-progress requests keep their original wallet recovery path.
ALTER TABLE private.galx_site_workspaces ADD COLUMN IF NOT EXISTS operation_mode text NOT NULL DEFAULT 'legacy' CHECK (operation_mode IN ('legacy','included'));
ALTER TABLE private.galx_sites_fair_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_sites_fair_policy FORCE ROW LEVEL SECURITY;
ALTER TABLE private.galx_sites_fair_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_sites_fair_pools FORCE ROW LEVEL SECURITY;
ALTER TABLE private.galx_sites_fair_invocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_sites_fair_invocations FORCE ROW LEVEL SECURITY;
ALTER TABLE private.galx_sites_fair_demand ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_sites_fair_demand FORCE ROW LEVEL SECURITY;
ALTER TABLE private.galx_sites_fair_cooldowns ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_sites_fair_cooldowns FORCE ROW LEVEL SECURITY;
REVOKE ALL ON private.galx_sites_fair_policy,private.galx_sites_fair_pools,private.galx_sites_fair_invocations,private.galx_sites_fair_demand,private.galx_sites_fair_cooldowns FROM PUBLIC,anon,authenticated,service_role;
