-- Private preview operations. No browser role can read or mutate these records.
ALTER TABLE private.developer_access_requests
  ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;
ALTER TABLE private.developer_access_requests DROP CONSTRAINT IF EXISTS developer_access_requests_status_check;
ALTER TABLE private.developer_access_requests ADD CONSTRAINT developer_access_requests_status_check
  CHECK (status IN ('pending', 'approved', 'revoked', 'declined'));
ALTER TABLE private.developer_preview_feedback
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS resolved_by text,
  ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1 CHECK (revision > 0);
CREATE INDEX IF NOT EXISTS developer_access_review_queue
  ON private.developer_access_requests (status, requested_at, user_id);
CREATE INDEX IF NOT EXISTS developer_feedback_inbox
  ON private.developer_preview_feedback (created_at DESC, id) WHERE resolved_at IS NULL;

CREATE TABLE IF NOT EXISTS private.preview_admin_members (
  email text PRIMARY KEY CHECK (email = lower(email) AND length(email) BETWEEN 3 AND 320),
  user_id text UNIQUE CHECK (length(user_id) BETWEEN 1 AND 200),
  role text NOT NULL CHECK (role IN ('owner', 'reviewer', 'viewer')),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS private.preview_admin_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id text NOT NULL,
  actor_email text NOT NULL,
  action text NOT NULL CHECK (action IN ('bootstrap', 'staff_added', 'staff_changed', 'staff_removed', 'staff_activated', 'request_reviewed', 'feedback_resolved', 'feedback_reopened')),
  subject text NOT NULL,
  previous_state text,
  next_state text,
  reason text NOT NULL DEFAULT '' CHECK (length(reason) <= 1000),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS preview_admin_audit_subject ON private.preview_admin_audit (subject, created_at DESC, id);
CREATE INDEX IF NOT EXISTS preview_admin_audit_recent ON private.preview_admin_audit (created_at DESC, id);
ALTER TABLE private.preview_admin_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.preview_admin_members FORCE ROW LEVEL SECURITY;
ALTER TABLE private.preview_admin_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.preview_admin_audit FORCE ROW LEVEL SECURITY;
REVOKE ALL ON private.preview_admin_members, private.preview_admin_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON private.preview_admin_members TO service_role;
-- Audit history has no update/delete interface or application-role privileges.
REVOKE ALL ON private.preview_admin_audit FROM service_role;
GRANT SELECT, INSERT ON private.preview_admin_audit TO service_role;
