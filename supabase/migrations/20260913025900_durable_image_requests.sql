-- Private receipts are committed before asynchronous image work is acknowledged.
-- Additive: no rewrite or lock of existing application tables.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '10s';
CREATE TABLE IF NOT EXISTS private.galx_image_requests (
  id uuid PRIMARY KEY,
  user_id text NOT NULL CHECK (length(user_id) BETWEEN 1 AND 255),
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 1 AND 128),
  payload_hash text NOT NULL CHECK (length(payload_hash) = 64),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  is_priority boolean NOT NULL DEFAULT false,
  state text NOT NULL DEFAULT 'queued' CHECK (state IN ('queued','generating','completed','failed','cancelled')),
  asset_ids text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deadline_at timestamptz,
  UNIQUE (user_id, idempotency_key),
  CHECK (state <> 'completed' OR (asset_ids IS NOT NULL AND cardinality(asset_ids) BETWEEN 1 AND 4 AND array_position(asset_ids,NULL) IS NULL))
);
ALTER TABLE private.galx_image_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_image_requests FORCE ROW LEVEL SECURITY;
REVOKE ALL ON private.galx_image_requests FROM PUBLIC, anon, authenticated, service_role;
COMMENT ON TABLE private.galx_image_requests IS 'Server-only image receipts. Owner-scoped queries, atomic dispatch claim, no automatic redispatch after an ambiguous attempt.';
