SET LOCAL lock_timeout='2s';
SET LOCAL statement_timeout='10s';
CREATE TABLE IF NOT EXISTS private.galx_plan_checkouts (
  user_id uuid NOT NULL,
  request_id uuid NOT NULL,
  price_id text NOT NULL,
  customer_id text,
  session_id text UNIQUE,
  checkout_url text,
  lease_token uuid,
  lease_until timestamptz,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','open','complete','expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now()+interval '2 hours',
  PRIMARY KEY(user_id,request_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS galx_plan_one_open_checkout ON private.galx_plan_checkouts(user_id) WHERE state IN ('pending','open');
CREATE TABLE IF NOT EXISTS private.galx_plan_subscriptions (
  subscription_id text PRIMARY KEY,
  user_id uuid NOT NULL,
  customer_id text NOT NULL,
  price_id text NOT NULL,
  status text NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  period_end timestamptz,
  event_created bigint NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS galx_plan_subscriptions_owner ON private.galx_plan_subscriptions(user_id,updated_at DESC);
ALTER TABLE private.galx_plan_checkouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_plan_checkouts FORCE ROW LEVEL SECURITY;
ALTER TABLE private.galx_plan_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_plan_subscriptions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON private.galx_plan_checkouts,private.galx_plan_subscriptions FROM PUBLIC,anon,authenticated,service_role;
