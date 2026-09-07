-- Restore the preceding telemetry function. This reinstates legacy unfenced health projection.
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
