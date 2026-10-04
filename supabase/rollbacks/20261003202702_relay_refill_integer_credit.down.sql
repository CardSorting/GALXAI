-- Retention-preserving rollback. Never restore the known rounding defect or
-- discard exact persisted credit. Admission stays closed until reviewed UP.
-- Existing leases, settlement, credentials and execution records are unchanged.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '10s';
CREATE OR REPLACE FUNCTION private.relay_base_acquire(
  p_shard_id VARCHAR(64), p_user_id VARCHAR(255), p_estimated_tokens BIGINT DEFAULT 2000,
  p_lease_ttl_ms BIGINT DEFAULT 120000, p_job_id VARCHAR(128) DEFAULT NULL, p_now_ms BIGINT DEFAULT NULL
)
RETURNS JSONB LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
  RETURN jsonb_build_object('success',false,'reason','SHARD_NOT_AVAILABLE');
END $$;
REVOKE ALL ON FUNCTION private.relay_base_acquire(varchar,varchar,bigint,bigint,varchar,bigint)
  FROM PUBLIC,anon,authenticated,service_role,galx_relay_control,galx_desktop_writer;
