-- Export audit and staff records before rollback. Expiring approvals must remain denied.
UPDATE private.developer_access_requests SET status = 'revoked'
WHERE status = 'declined' OR (status = 'approved' AND expires_at IS NOT NULL);
DROP TABLE IF EXISTS private.preview_admin_audit;
DROP TABLE IF EXISTS private.preview_admin_members;
DROP INDEX IF EXISTS private.developer_access_review_queue;
DROP INDEX IF EXISTS private.developer_feedback_inbox;
ALTER TABLE private.developer_access_requests DROP CONSTRAINT IF EXISTS developer_access_requests_status_check;
ALTER TABLE private.developer_access_requests ADD CONSTRAINT developer_access_requests_status_check CHECK (status IN ('pending', 'approved', 'revoked'));
ALTER TABLE private.developer_access_requests DROP COLUMN IF EXISTS revision, DROP COLUMN IF EXISTS expires_at;
ALTER TABLE private.developer_preview_feedback DROP COLUMN IF EXISTS resolved_at, DROP COLUMN IF EXISTS resolved_by, DROP COLUMN IF EXISTS revision;
