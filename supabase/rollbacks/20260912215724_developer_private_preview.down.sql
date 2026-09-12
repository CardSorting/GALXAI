-- Export access requests and private feedback before explicitly rolling back.
DROP TABLE IF EXISTS private.developer_preview_feedback;
DROP TABLE IF EXISTS private.developer_access_requests;
