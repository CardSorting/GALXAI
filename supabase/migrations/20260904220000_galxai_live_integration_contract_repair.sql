-- ============================================================================
-- GALXAI Migration: live integration contract repair
-- Purpose: Restore queue leasing and shard-health ingestion against the
--          authoritative schema while retaining backend-only capabilities.
-- Risk: MEDIUM (replaces two routines; no table rewrite or data backfill).
-- ============================================================================

-- The worker supplies p_now_ms for wire compatibility only. Lease authority
-- always uses the database clock so a stale or hostile worker cannot mint an
-- already-expired lease or extend ownership into the future.
CREATE OR REPLACE FUNCTION public.fn_lease_queue_tasks(
  p_queue_id VARCHAR(64),
  p_worker_id VARCHAR(128),
  p_max_tasks INTEGER DEFAULT 10,
  p_lease_duration_ms BIGINT DEFAULT 60000,
  p_tag_filter VARCHAR(64) DEFAULT NULL,
  p_group_id_filter VARCHAR(128) DEFAULT NULL,
  p_now_ms BIGINT DEFAULT NULL
)
RETURNS SETOF public.galx_tasks
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now_ms BIGINT := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
  v_lease_expiry BIGINT;
BEGIN
  IF NULLIF(BTRIM(p_queue_id), '') IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'p_queue_id must not be blank';
  END IF;
  IF NULLIF(BTRIM(p_worker_id), '') IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'p_worker_id must not be blank';
  END IF;
  IF p_max_tasks IS NULL OR p_max_tasks < 1 OR p_max_tasks > 100 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'p_max_tasks must be between 1 and 100';
  END IF;
  IF p_lease_duration_ms IS NULL OR p_lease_duration_ms < 1000 OR p_lease_duration_ms > 1800000 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'p_lease_duration_ms must be between 1000 and 1800000';
  END IF;

  v_lease_expiry := v_now_ms + p_lease_duration_ms;

  RETURN QUERY
  WITH candidate_tasks AS (
    SELECT t.id
    FROM public.galx_tasks AS t
    WHERE t.queue_id = p_queue_id
      AND t.status IN ('QUEUED', 'SCHEDULED', 'RETRYING')
      AND t.schedule_time_ms <= v_now_ms
      AND (p_tag_filter IS NULL OR t.tag = p_tag_filter)
      AND (p_group_id_filter IS NULL OR t.group_id = p_group_id_filter)
      AND (
        t.group_id IS NULL
        OR NOT EXISTS (
          SELECT 1
          FROM public.galx_tasks AS active
          WHERE active.queue_id = p_queue_id
            AND active.group_id = t.group_id
            AND active.status IN ('DISPATCHING', 'RUNNING')
            AND active.id <> t.id
        )
      )
    ORDER BY
      (t.priority + LEAST(50, ((v_now_ms - t.created_at_ms) / 30000) * 5)) DESC,
      t.created_at_ms ASC,
      t.id ASC
    LIMIT p_max_tasks
    FOR UPDATE SKIP LOCKED
  )
  UPDATE public.galx_tasks AS leased
  SET status = 'RUNNING',
      dispatch_count = leased.dispatch_count + 1,
      last_attempt_ms = v_now_ms,
      first_attempt_ms = COALESCE(leased.first_attempt_ms, v_now_ms),
      lease_expires_at_ms = v_lease_expiry,
      active_worker_id = p_worker_id,
      active_fencing_token = COALESCE(leased.active_fencing_token, 0) + 1,
      updated_at_ms = v_now_ms,
      updated_at = clock_timestamp()
  FROM candidate_tasks AS candidate
  WHERE leased.id = candidate.id
  RETURNING leased.*;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_lease_queue_tasks(
  VARCHAR, VARCHAR, INTEGER, BIGINT, VARCHAR, VARCHAR, BIGINT
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_lease_queue_tasks(
  VARCHAR, VARCHAR, INTEGER, BIGINT, VARCHAR, VARCHAR, BIGINT
) TO service_role;

COMMENT ON FUNCTION public.fn_lease_queue_tasks(
  VARCHAR, VARCHAR, INTEGER, BIGINT, VARCHAR, VARCHAR, BIGINT
) IS 'Backend-only, database-clocked task leasing with SKIP LOCKED and monotonic fencing.';

-- Health probes are observations. This routine records them and projects only
-- statuses that exist in galx_credential_status. The shard row lock serializes
-- concurrent batches for a shard without imposing a table-wide lock.
CREATE OR REPLACE FUNCTION public.fn_report_shard_health_cf(p_probes JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_item JSONB;
  v_shard_id VARCHAR(64);
  v_worker_id VARCHAR(128);
  v_success BOOLEAN;
  v_recent_success BOOLEAN;
  v_latency NUMERIC(10, 2);
  v_status_code INTEGER;
  v_probe_timestamp_ms BIGINT;
  v_now_ms BIGINT;
  v_consecutive_failures INTEGER;
  v_consecutive_successes INTEGER;
  v_avg_latency NUMERIC(10, 2);
  v_rows_updated INTEGER;
  v_new_status TEXT;
  v_reason TEXT;
  v_updated_shards JSONB := '[]'::JSONB;
BEGIN
  IF p_probes IS NULL OR jsonb_typeof(p_probes) <> 'array' THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'p_probes must be a JSON array';
  END IF;
  IF jsonb_array_length(p_probes) > 100 THEN
    RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'p_probes cannot contain more than 100 observations';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_probes)
  LOOP
    IF jsonb_typeof(v_item) <> 'object' THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'each health probe must be a JSON object';
    END IF;

    v_shard_id := NULLIF(BTRIM(v_item->>'shardId'), '');
    v_worker_id := NULLIF(BTRIM(v_item->>'workerId'), '');
    v_latency := COALESCE(NULLIF(v_item->>'latencyMs', '')::NUMERIC, 0);
    v_status_code := COALESCE(NULLIF(v_item->>'statusCode', '')::INTEGER, 200);
    v_success := COALESCE(NULLIF(v_item->>'isSuccess', '')::BOOLEAN, true);
    v_now_ms := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
    v_probe_timestamp_ms := COALESCE(NULLIF(v_item->>'timestampMs', '')::BIGINT, v_now_ms);

    IF v_shard_id IS NULL OR v_worker_id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'shardId and workerId must not be blank';
    END IF;
    IF v_latency < 0 OR v_latency > 600000 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'latencyMs must be between 0 and 600000';
    END IF;
    IF v_status_code < 100 OR v_status_code > 599 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'statusCode must be between 100 and 599';
    END IF;
    IF ABS(v_probe_timestamp_ms - v_now_ms) > 300000 THEN
      RAISE EXCEPTION USING ERRCODE = '22023', MESSAGE = 'timestampMs must be within five minutes of the database clock';
    END IF;

    PERFORM 1
    FROM public.galx_shard_accounts
    WHERE id = v_shard_id
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'health probe references an unknown shard';
    END IF;

    INSERT INTO public.galx_shard_health_probes (
      shard_id, worker_id, latency_ms, status_code, is_success,
      error_message, probe_timestamp_ms
    ) VALUES (
      v_shard_id, v_worker_id, v_latency, v_status_code, v_success,
      NULLIF(v_item->>'errorMessage', ''), v_probe_timestamp_ms
    );

    v_consecutive_failures := 0;
    v_consecutive_successes := 0;
    FOR v_recent_success IN
      SELECT probe.is_success
      FROM public.galx_shard_health_probes AS probe
      WHERE probe.shard_id = v_shard_id
      ORDER BY probe.probe_timestamp_ms DESC, probe.created_at DESC, probe.id DESC
      LIMIT 10
    LOOP
      IF v_recent_success THEN
        EXIT WHEN v_consecutive_failures > 0;
        v_consecutive_successes := v_consecutive_successes + 1;
      ELSE
        EXIT WHEN v_consecutive_successes > 0;
        v_consecutive_failures := v_consecutive_failures + 1;
      END IF;
    END LOOP;

    SELECT COALESCE(AVG(recent.latency_ms), v_latency)
    INTO v_avg_latency
    FROM (
      SELECT probe.latency_ms
      FROM public.galx_shard_health_probes AS probe
      WHERE probe.shard_id = v_shard_id
      ORDER BY probe.probe_timestamp_ms DESC, probe.created_at DESC, probe.id DESC
      LIMIT 10
    ) AS recent;

    v_new_status := NULL;
    v_reason := NULL;
    IF v_consecutive_failures >= 5 THEN
      v_new_status := 'cooldown';
      v_reason := 'CONSECUTIVE_FAILURES_EXCEEDED';
    ELSIF v_consecutive_failures >= 2 THEN
      v_new_status := 'cooldown';
      v_reason := 'CONSECUTIVE_FAILURES_DETECTED';
    ELSIF v_consecutive_failures = 0 THEN
      v_new_status := 'healthy';
      v_reason := 'HEALTH_RECOVERED';
    END IF;

    UPDATE public.galx_shard_accounts AS shard
    SET consecutive_failures = v_consecutive_failures,
        consecutive_successes = v_consecutive_successes,
        average_latency_ms = v_avg_latency,
        last_latency_ms = v_latency,
        status = CASE
          WHEN v_new_status = 'cooldown'
            AND shard.status IN ('healthy', 'cooldown')
            AND NOT shard.permission_retracted
            THEN 'cooldown'::public.galx_credential_status
          WHEN v_new_status = 'healthy'
            AND shard.status = 'cooldown'
            AND NOT shard.permission_retracted
            THEN 'healthy'::public.galx_credential_status
          ELSE shard.status
        END,
        cooldown_until_ms = CASE
          WHEN v_new_status = 'cooldown' AND shard.status IN ('healthy', 'cooldown')
            THEN v_now_ms + CASE WHEN v_consecutive_failures >= 5 THEN 300000 ELSE 60000 END
          WHEN v_new_status = 'healthy' AND shard.status = 'cooldown'
            THEN NULL
          ELSE shard.cooldown_until_ms
        END,
        updated_at_ms = v_now_ms,
        updated_at = clock_timestamp()
    WHERE shard.id = v_shard_id;

    GET DIAGNOSTICS v_rows_updated = ROW_COUNT;
    IF v_rows_updated = 1 AND v_new_status IS NOT NULL THEN
      v_updated_shards := v_updated_shards || jsonb_build_array(jsonb_build_object(
        'shardId', v_shard_id,
        'newStatus', v_new_status,
        'reason', v_reason
      ));
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'probesIngested', jsonb_array_length(p_probes),
    'statusTransitions', v_updated_shards
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_report_shard_health_cf(JSONB)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_report_shard_health_cf(JSONB) TO service_role;

COMMENT ON FUNCTION public.fn_report_shard_health_cf(JSONB)
IS 'Backend-only health observation ingestion with bounded input, per-shard serialization, and valid circuit-state projection.';
