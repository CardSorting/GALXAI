-- Preserve unknown provider results as neutral. No historical records are rewritten.
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
CREATE OR REPLACE FUNCTION private.relay_execution(p_pool text,p_installation uuid,p_action text,p_body jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE r private.relay_executions%ROWTYPE;
BEGIN
  IF NOT EXISTS(SELECT FROM private.relay_identity WHERE pool_id=p_pool AND installation_id=p_installation) THEN RAISE EXCEPTION 'Execution scope mismatch' USING ERRCODE='42501'; END IF;
  IF p_body IS NULL OR jsonb_typeof(p_body)<>'object' OR octet_length(p_body::text)>8192 THEN RAISE EXCEPTION 'Invalid request' USING ERRCODE='22023'; END IF;
  IF p_action='identity' THEN RETURN jsonb_build_object('pool',p_pool,'installationId',p_installation); END IF;
  IF p_action='recover' THEN
    IF p_body->>'epoch' IS NULL THEN RAISE EXCEPTION 'Missing owner epoch' USING ERRCODE='22023'; END IF;
    -- Recovered records are uncertain. They may settle, but never dispatch again.
    UPDATE private.relay_executions SET state='unknown',success=NULL,updated_at=clock_timestamp() WHERE state IN ('reserved','running') AND epoch IS DISTINCT FROM (p_body->>'epoch')::uuid;
    RETURN jsonb_build_object('recovered',true);
  END IF;
  IF p_action='pending' THEN
    RETURN COALESCE((SELECT jsonb_agg(jsonb_build_object('requestKey',x.request_key,'epoch',x.epoch,'leaseId',x.lease_id,'success',x.success,'actualTokens',x.actual_tokens))
      FROM (SELECT * FROM private.relay_executions WHERE state IN ('completed','unknown') AND NOT settled AND lease_id IS NOT NULL ORDER BY created_at LIMIT 100) x),'[]'::jsonb);
  END IF;
  IF p_action='reserve' THEN
    IF p_pool='standard' AND p_body->>'workload' IS DISTINCT FROM 'text' THEN RAISE EXCEPTION 'Workload denied' USING ERRCODE='42501'; END IF;
    INSERT INTO private.relay_executions(request_key,request_sha256,tenant_sha256,account_id,epoch,execution_id,workload)
      VALUES(p_body->>'requestKey',p_body->>'requestSha256',p_body->>'tenantSha256',p_body->>'accountId',(p_body->>'epoch')::uuid,p_body->>'executionId',p_body->>'workload') ON CONFLICT(request_key) DO NOTHING;
  END IF;
  IF p_action='lookup' THEN
    SELECT * INTO r FROM private.relay_executions WHERE (request_key=p_body->>'requestKey' OR execution_id=p_body->>'executionId') AND tenant_sha256=p_body->>'tenantSha256';
    IF NOT FOUND THEN RETURN NULL; END IF;
  ELSE
    SELECT * INTO r FROM private.relay_executions WHERE request_key=p_body->>'requestKey' FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Execution not found' USING ERRCODE='P0002'; END IF;
  END IF;
  IF p_action='reserve' AND ROW(r.request_sha256,r.tenant_sha256,r.workload) IS DISTINCT FROM ROW(p_body->>'requestSha256',p_body->>'tenantSha256',p_body->>'workload') THEN RAISE EXCEPTION 'Execution conflict' USING ERRCODE='23505'; END IF;
  IF p_action IN ('bind','finish') AND r.execution_id IS DISTINCT FROM p_body->>'executionId' THEN RAISE EXCEPTION 'Execution conflict' USING ERRCODE='23505'; END IF;
  IF p_action='bind' THEN
    IF r.state<>'reserved' OR p_body->>'leaseId' IS NULL THEN RAISE EXCEPTION 'Execution already dispatched' USING ERRCODE='23505'; END IF;
    UPDATE private.relay_executions SET lease_id=p_body->>'leaseId',state='running',updated_at=clock_timestamp() WHERE request_key=r.request_key RETURNING * INTO r;
  ELSIF p_action='finish' THEN
    IF r.state IN ('reserved','running') THEN
      UPDATE private.relay_executions SET state=CASE WHEN (p_body->>'success')::boolean IS TRUE THEN 'completed' ELSE 'unknown' END,
        success=(p_body->>'success')::boolean,actual_tokens=(p_body->>'actualTokens')::bigint,updated_at=clock_timestamp() WHERE request_key=r.request_key RETURNING * INTO r;
    END IF;
  ELSIF p_action='settled' THEN
    IF r.lease_id IS DISTINCT FROM p_body->>'leaseId' OR r.state NOT IN ('completed','unknown') THEN RAISE EXCEPTION 'Invalid settlement' USING ERRCODE='23505'; END IF;
    UPDATE private.relay_executions SET settled=true,updated_at=clock_timestamp() WHERE request_key=r.request_key RETURNING * INTO r;
  ELSIF p_action NOT IN ('lookup','reserve') THEN RAISE EXCEPTION 'Unsupported action' USING ERRCODE='42501'; END IF;
  RETURN jsonb_build_object('requestKey',r.request_key,'requestSha256',r.request_sha256,'tenantSha256',r.tenant_sha256,'accountId',r.account_id,'epoch',r.epoch,
    'executionId',r.execution_id,'workload',r.workload,'leaseId',r.lease_id,'state',r.state,'success',r.success,'actualTokens',r.actual_tokens,'settled',r.settled);
END $$;
REVOKE ALL ON FUNCTION private.relay_execution(text,uuid,text,jsonb) FROM PUBLIC,anon,authenticated,service_role;
GRANT EXECUTE ON FUNCTION private.relay_execution(text,uuid,text,jsonb) TO galx_relay_execution;
