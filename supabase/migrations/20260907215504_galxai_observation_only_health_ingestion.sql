-- Remove the telemetry health-authority bypass without changing tables or function signatures.
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
  v_latency NUMERIC(10, 2);
  v_status_code INTEGER;
  v_probe_timestamp_ms BIGINT;
  v_now_ms BIGINT;
  v_rows_inserted INTEGER;
BEGIN
  v_now_ms := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
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

  END LOOP;

  -- Observations are not authority. Never update account state or health counters
  -- here: delayed, duplicated and caller-neutral samples have no lease fence.
  INSERT INTO public.galx_shard_health_probes (
    id, shard_id, worker_id, latency_ms, status_code, is_success,
    error_message, probe_timestamp_ms
  )
  SELECT
    CASE WHEN item->>'id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      THEN (item->>'id')::uuid ELSE gen_random_uuid() END,
    BTRIM(item->>'shardId'), BTRIM(item->>'workerId'),
    COALESCE(NULLIF(item->>'latencyMs', '')::numeric, 0),
    COALESCE(NULLIF(item->>'statusCode', '')::integer, 200),
    COALESCE(NULLIF(item->>'isSuccess', '')::boolean, true),
    NULLIF(item->>'errorMessage', ''),
    COALESCE(NULLIF(item->>'timestampMs', '')::bigint, v_now_ms)
  FROM jsonb_array_elements(p_probes) AS input(item)
  ORDER BY item->>'shardId', item->>'id'
  ON CONFLICT (id) DO NOTHING;
  GET DIAGNOSTICS v_rows_inserted = ROW_COUNT;

  RETURN jsonb_build_object('success', true, 'probesIngested', v_rows_inserted,
    'statusTransitions', '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_report_shard_health_cf(JSONB)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.fn_report_shard_health_cf(JSONB) TO service_role;
COMMENT ON FUNCTION public.fn_report_shard_health_cf(JSONB)
IS 'Backend-only bounded append-only telemetry ingestion. Health authority belongs to fenced lease outcomes. Stable UUID observations are deduplicated.';
