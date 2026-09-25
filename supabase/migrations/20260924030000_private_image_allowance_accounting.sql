-- Server-only purchased image allowance snapshots and reservation ledger.
-- Activation values live in src/lib/billing/image-allowance-config.ts. They
-- remain explicitly UNAPPROVED until business approval; this migration does
-- not create a second configuration surface or invent allocations.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '20s';

CREATE TABLE IF NOT EXISTS private.galx_image_plan_period_usage (
  user_id TEXT NOT NULL CHECK (length(user_id) BETWEEN 1 AND 255),
  subscription_id TEXT NOT NULL REFERENCES private.galx_plan_subscriptions(subscription_id) ON DELETE RESTRICT,
  period_end TIMESTAMPTZ NOT NULL,
  plan_key TEXT NOT NULL CHECK (plan_key IN ('creator-v1','studio-v1','team-v1')),
  allowance_units INTEGER NOT NULL CHECK (allowance_units > 0),
  standard_output_units SMALLINT NOT NULL CHECK (standard_output_units > 0),
  hd_output_units SMALLINT NOT NULL CHECK (hd_output_units >= standard_output_units),
  used_units INTEGER NOT NULL DEFAULT 0 CHECK (used_units >= 0 AND used_units <= allowance_units),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, subscription_id, period_end)
);
CREATE INDEX IF NOT EXISTS galx_image_plan_period_usage_owner
  ON private.galx_image_plan_period_usage (user_id, period_end DESC);
ALTER TABLE private.galx_image_plan_period_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_image_plan_period_usage FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.galx_image_plan_period_usage FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS private.galx_image_usage_reservations (
  operation_id UUID PRIMARY KEY REFERENCES private.galx_image_requests(id) ON DELETE RESTRICT,
  user_id TEXT NOT NULL CHECK (length(user_id) BETWEEN 1 AND 255),
  subscription_id TEXT NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  units INTEGER NOT NULL CHECK (units > 0),
  state TEXT NOT NULL DEFAULT 'reserved' CHECK (state IN ('reserved','settled','released')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  FOREIGN KEY (user_id, subscription_id, period_end)
    REFERENCES private.galx_image_plan_period_usage(user_id, subscription_id, period_end) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS galx_image_usage_reservations_period
  ON private.galx_image_usage_reservations (user_id, subscription_id, period_end, state);
ALTER TABLE private.galx_image_usage_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_image_usage_reservations FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.galx_image_usage_reservations FROM PUBLIC, anon, authenticated, service_role;

COMMENT ON TABLE private.galx_image_usage_reservations IS
  'Private request lifecycle reservations. Unknown outcomes remain reserved; only proven pre-dispatch rejection or queued cancellation releases allowance.';

-- There is no automatic replay path for pre-migration human requests that did
-- not reserve a purchased allowance. Claim code independently checks the ledger.
UPDATE private.galx_image_requests
SET state = 'failed',
    payload = jsonb_build_object('failureCode','generation_not_started'),
    updated_at = now()
WHERE work_class = 'private' AND state = 'queued'
  AND NOT EXISTS (
    SELECT 1 FROM private.galx_image_usage_reservations AS reservation
    WHERE reservation.operation_id = galx_image_requests.id
      AND reservation.user_id = galx_image_requests.user_id
  );

-- One-time privacy hardening cannot be rolled back to an unmetered request path.
