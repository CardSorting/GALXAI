CREATE SCHEMA IF NOT EXISTS private;
CREATE TABLE IF NOT EXISTS private.developer_access_requests (
  user_id text PRIMARY KEY CHECK (length(user_id) BETWEEN 1 AND 200),
  email text NOT NULL CHECK (length(email) BETWEEN 3 AND 320),
  use_case text NOT NULL CHECK (length(use_case) BETWEEN 20 AND 2000),
  expected_traffic text NOT NULL CHECK (expected_traffic IN ('exploring', 'under_100_daily', 'under_1000_daily', 'over_1000_daily')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'revoked')),
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by text,
  last_feedback_at timestamptz
);
CREATE INDEX IF NOT EXISTS developer_access_pending ON private.developer_access_requests (requested_at, user_id) WHERE status = 'pending';
CREATE TABLE IF NOT EXISTS private.developer_preview_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL REFERENCES private.developer_access_requests(user_id) ON DELETE CASCADE,
  message text NOT NULL CHECK (length(message) BETWEEN 10 AND 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS developer_feedback_account ON private.developer_preview_feedback (user_id, created_at DESC);
ALTER TABLE private.developer_access_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.developer_access_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE private.developer_preview_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.developer_preview_feedback FORCE ROW LEVEL SECURITY;
REVOKE ALL ON private.developer_access_requests, private.developer_preview_feedback FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON private.developer_access_requests, private.developer_preview_feedback TO service_role;
