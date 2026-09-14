-- Free admission is disabled until an operator grants a bounded, expiring budget.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '30s';

CREATE TABLE IF NOT EXISTS private.galx_free_generation_policy (
  kind text PRIMARY KEY CHECK (kind IN ('site','image')),
  enabled boolean NOT NULL DEFAULT false,
  revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
  valid_until timestamptz,
  max_outstanding integer NOT NULL DEFAULT 0 CHECK (max_outstanding BETWEEN 0 AND 100),
  max_hour_units integer NOT NULL DEFAULT 0 CHECK (max_hour_units BETWEEN 0 AND 10000),
  max_day_units integer NOT NULL DEFAULT 0 CHECK (max_day_units BETWEEN 0 AND 100000),
  max_total_units bigint NOT NULL DEFAULT 0 CHECK (max_total_units BETWEEN 0 AND 10000000),
  admitted_units bigint NOT NULL DEFAULT 0 CHECK (admitted_units >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (max_outstanding <= max_hour_units AND max_hour_units <= max_day_units AND max_day_units <= max_total_units),
  CHECK (NOT enabled OR (valid_until IS NOT NULL AND max_outstanding > 0))
);
ALTER TABLE private.galx_free_generation_policy ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_free_generation_policy FORCE ROW LEVEL SECURITY;
REVOKE ALL ON private.galx_free_generation_policy FROM PUBLIC, anon, authenticated, service_role;
INSERT INTO private.galx_free_generation_policy(kind,admitted_units)
SELECT kind,coalesce((SELECT sum(quantity) FROM private.galx_free_generation_usage u WHERE u.kind=k.kind),0)
FROM (VALUES ('site'),('image')) AS k(kind) ON CONFLICT DO NOTHING;

-- Unknown work retains capacity. Only positive completion or non-dispatch settles it.
ALTER TABLE private.galx_free_generation_usage ADD COLUMN IF NOT EXISTS capacity_settled boolean NOT NULL DEFAULT false;
UPDATE private.galx_free_generation_usage SET capacity_settled=true WHERE released AND NOT capacity_settled;
CREATE INDEX IF NOT EXISTS galx_free_generation_usage_flow ON private.galx_free_generation_usage(kind,created_at) INCLUDE(quantity);
CREATE INDEX IF NOT EXISTS galx_free_generation_usage_active ON private.galx_free_generation_usage(kind,user_id) INCLUDE(quantity) WHERE NOT capacity_settled;

-- Existing hosted Sites admission was Pro-only; new records carry verified authority.
ALTER TABLE private.galx_sites_fair_invocations ADD COLUMN IF NOT EXISTS tier text NOT NULL DEFAULT 'pro' CHECK (tier IN ('pro','free'));
