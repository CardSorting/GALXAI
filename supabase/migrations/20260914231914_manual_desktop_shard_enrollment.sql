-- Manual desktop enrollment is the only credential authority. Existing rows are
-- retained, but receive no desktop binding without an explicit verified enrollment.
-- HIGH impact: brief DDL locks; no credentials, counters, or history are deleted.
SET LOCAL lock_timeout = '5s';
ALTER TABLE public.galx_shard_accounts
  ADD COLUMN IF NOT EXISTS managed_desktop_id uuid,
  ADD COLUMN IF NOT EXISTS desktop_enrolled_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS galx_shards_managed_desktop_unique
  ON public.galx_shard_accounts(managed_desktop_id) WHERE managed_desktop_id IS NOT NULL;
ALTER TABLE public.galx_shard_accounts DROP CONSTRAINT IF EXISTS galx_shards_desktop_binding;
ALTER TABLE public.galx_shard_accounts ADD CONSTRAINT galx_shards_desktop_binding CHECK (
  (managed_desktop_id IS NULL AND desktop_enrolled_at IS NULL) OR
  (managed_desktop_id IS NOT NULL AND desktop_enrolled_at IS NOT NULL AND provider = 'openai' AND auth_type = 'oauth')
);
ALTER TABLE public.galx_shard_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_shard_accounts FORCE ROW LEVEL SECURITY;
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'galx_desktop_writer') THEN
    CREATE ROLE galx_desktop_writer NOLOGIN NOINHERIT;
  END IF;
END $$;
GRANT galx_desktop_writer TO postgres;
GRANT USAGE, CREATE ON SCHEMA private TO galx_desktop_writer;
GRANT USAGE ON SCHEMA public TO galx_desktop_writer;
GRANT SELECT, INSERT, UPDATE ON public.galx_shard_accounts TO galx_desktop_writer;
GRANT SELECT, INSERT ON public.galx_shard_registry_events TO galx_desktop_writer;
GRANT USAGE, SELECT ON SEQUENCE public.galx_shard_registry_events_journal_offset_seq TO galx_desktop_writer;
DROP POLICY IF EXISTS desktop_writer_shards ON public.galx_shard_accounts;
CREATE POLICY desktop_writer_shards ON public.galx_shard_accounts TO galx_desktop_writer USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS desktop_writer_events ON public.galx_shard_registry_events;
CREATE POLICY desktop_writer_events ON public.galx_shard_registry_events TO galx_desktop_writer USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION private.guard_desktop_shard_authority() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF current_user <> 'galx_desktop_writer' OR NEW.managed_desktop_id IS NULL THEN
      RAISE EXCEPTION 'Manual desktop enrollment required' USING ERRCODE = '42501';
    END IF;
  ELSIF ROW(NEW.id, NEW.user_id, NEW.provider, NEW.auth_type, NEW.encrypted_ciphertext,
    NEW.encrypted_iv, NEW.encrypted_tag, NEW.key_version, NEW.credential_expires_at_ms,
    NEW.managed_desktop_id, NEW.desktop_enrolled_at) IS DISTINCT FROM
    ROW(OLD.id, OLD.user_id, OLD.provider, OLD.auth_type, OLD.encrypted_ciphertext,
    OLD.encrypted_iv, OLD.encrypted_tag, OLD.key_version, OLD.credential_expires_at_ms,
    OLD.managed_desktop_id, OLD.desktop_enrolled_at) AND current_user <> 'galx_desktop_writer' THEN
    RAISE EXCEPTION 'Desktop credential authority required' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_desktop_shard_authority() FROM PUBLIC, anon, authenticated, service_role;
DROP TRIGGER IF EXISTS trg_guard_desktop_shard_authority ON public.galx_shard_accounts;
CREATE TRIGGER trg_guard_desktop_shard_authority BEFORE INSERT OR UPDATE ON public.galx_shard_accounts
  FOR EACH ROW EXECUTE FUNCTION private.guard_desktop_shard_authority();
REVOKE INSERT ON public.galx_shard_accounts FROM service_role;

-- This function is deliberately absent from the Data API. Only the host
-- administrator connection may call it after validating a saved desktop login.
CREATE OR REPLACE FUNCTION private.enroll_desktop_shard(p_desktop_id uuid, p_row jsonb, p_expected jsonb DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_old public.galx_shard_accounts%ROWTYPE;
  v_id text := p_row->>'id'; v_now bigint := (extract(epoch FROM clock_timestamp())*1000)::bigint;
BEGIN
  IF p_desktop_id IS NULL OR v_id IS NULL OR v_id !~ '^codex_sh_[a-f0-9]{24}$'
    OR COALESCE(p_row->>'user_id','') = '' OR COALESCE(p_row->>'encrypted_ciphertext','') = ''
    OR COALESCE(p_row->>'encrypted_iv','') = '' OR COALESCE(p_row->>'encrypted_tag','') = ''
    OR COALESCE((p_row->>'credential_expires_at_ms')::bigint,0) <= v_now + 60000 THEN
    RAISE EXCEPTION 'Invalid desktop enrollment' USING ERRCODE = '22023';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_id, 0));
  SELECT * INTO v_old FROM public.galx_shard_accounts WHERE id = v_id FOR UPDATE;
  IF FOUND THEN
    IF v_old.permission_retracted OR v_old.status::text IN ('revoked','dead','quarantined')
      OR v_old.provider <> 'openai' OR v_old.auth_type <> 'oauth' OR v_old.user_id <> p_row->>'user_id'
      OR (v_old.managed_desktop_id IS NOT NULL AND v_old.managed_desktop_id <> p_desktop_id) THEN
      RAISE EXCEPTION 'Enrollment conflict' USING ERRCODE = '23505';
    END IF;
    -- Repeated acknowledgement after a lost response cannot overwrite authority.
    IF v_old.managed_desktop_id = p_desktop_id AND v_old.encrypted_ciphertext = p_row->>'encrypted_ciphertext' THEN RETURN v_id; END IF;
    IF p_expected IS NULL OR ROW(v_old.encrypted_iv,v_old.encrypted_tag,v_old.key_version,v_old.encrypted_ciphertext)
      IS DISTINCT FROM ROW(p_expected->>'encrypted_iv',p_expected->>'encrypted_tag',p_expected->>'key_version',p_expected->>'encrypted_ciphertext') THEN
      RAISE EXCEPTION 'Credential changed; verify again' USING ERRCODE = '40001';
    END IF;
    UPDATE public.galx_shard_accounts SET managed_desktop_id = p_desktop_id,
      desktop_enrolled_at = COALESCE(desktop_enrolled_at, clock_timestamp()),
      encrypted_ciphertext=p_row->>'encrypted_ciphertext', encrypted_iv=p_row->>'encrypted_iv',
      encrypted_tag=p_row->>'encrypted_tag', key_version=p_row->>'key_version',
      credential_expires_at_ms=(p_row->>'credential_expires_at_ms')::bigint, updated_at=clock_timestamp()
      WHERE id=v_id;
  ELSE
    IF p_expected IS NOT NULL THEN RAISE EXCEPTION 'Enrollment conflict' USING ERRCODE='40001'; END IF;
    INSERT INTO public.galx_shard_accounts(id,user_id,provider,auth_type,account_label,api_key_masked,
      encrypted_ciphertext,encrypted_iv,encrypted_tag,key_version,shard_mode,status,priority,weight,
      max_tokens,remaining_tokens,refill_rate_per_minute,max_requests,remaining_requests,last_refill_timestamp_ms,
      created_at_ms,updated_at_ms,credential_expires_at_ms,registry_source,managed_desktop_id,desktop_enrolled_at)
    VALUES(v_id,p_row->>'user_id','openai','oauth','Desktop account','oauth_********',
      p_row->>'encrypted_ciphertext',p_row->>'encrypted_iv',p_row->>'encrypted_tag',p_row->>'key_version',
      'pooled','healthy',10,1,500000,500000,50000,40,40,v_now,v_now,v_now,
      (p_row->>'credential_expires_at_ms')::bigint,'operator_import',p_desktop_id,clock_timestamp());
  END IF;
  RETURN v_id;
END $$;
ALTER FUNCTION private.enroll_desktop_shard(uuid,jsonb,jsonb) OWNER TO galx_desktop_writer;
REVOKE ALL ON FUNCTION private.enroll_desktop_shard(uuid,jsonb,jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.enroll_desktop_shard(uuid,jsonb,jsonb) TO postgres;

CREATE OR REPLACE FUNCTION private.refresh_desktop_shard(p_desktop_id uuid, p_id text, p_expected jsonb, p_next jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_id text;
BEGIN
  IF p_desktop_id IS NULL OR COALESCE((p_next->>'credential_expires_at_ms')::bigint,0) <= extract(epoch FROM clock_timestamp())*1000 + 60000
    OR COALESCE(p_next->>'encrypted_ciphertext','')='' OR COALESCE(p_next->>'encrypted_iv','')='' OR COALESCE(p_next->>'encrypted_tag','')='' THEN
    RAISE EXCEPTION 'Invalid desktop credential' USING ERRCODE='22023';
  END IF;
  UPDATE public.galx_shard_accounts SET encrypted_ciphertext=p_next->>'encrypted_ciphertext',
    encrypted_iv=p_next->>'encrypted_iv',encrypted_tag=p_next->>'encrypted_tag',key_version=p_next->>'key_version',
    credential_expires_at_ms=(p_next->>'credential_expires_at_ms')::bigint,updated_at=clock_timestamp()
  WHERE id=p_id AND managed_desktop_id=p_desktop_id AND provider='openai' AND auth_type='oauth'
    AND user_id=p_expected->>'user_id' AND NOT permission_retracted AND status::text NOT IN ('revoked','dead','quarantined')
    AND ROW(encrypted_iv,encrypted_tag,key_version,encrypted_ciphertext) IS NOT DISTINCT FROM
      ROW(p_expected->>'encrypted_iv',p_expected->>'encrypted_tag',p_expected->>'key_version',p_expected->>'encrypted_ciphertext')
  RETURNING id INTO v_id;
  RETURN v_id IS NOT NULL;
END $$;
ALTER FUNCTION private.refresh_desktop_shard(uuid,text,jsonb,jsonb) OWNER TO galx_desktop_writer;
REVOKE ALL ON FUNCTION private.refresh_desktop_shard(uuid,text,jsonb,jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.refresh_desktop_shard(uuid,text,jsonb,jsonb) TO postgres;
REVOKE CREATE ON SCHEMA private FROM galx_desktop_writer;

-- Retired generic registry ingestion. Metadata updates use explicit UPDATEs.
CREATE OR REPLACE FUNCTION public.fn_upsert_shard_registry(p_row jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN RAISE EXCEPTION 'Registry ingestion is disabled' USING ERRCODE='42501'; END $$;
REVOKE ALL ON FUNCTION public.fn_upsert_shard_registry(jsonb) FROM PUBLIC,anon,authenticated,service_role;
COMMENT ON COLUMN public.galx_shard_accounts.managed_desktop_id IS 'Private manual enrollment binding. NULL rows cannot receive new work. Never inferred from legacy source labels.';
COMMENT ON COLUMN public.galx_shard_accounts.desktop_enrolled_at IS 'First explicit verified enrollment from the bound administrator desktop.';

-- Admission checks the same durable binding, including callers with stale caches.
CREATE OR REPLACE FUNCTION public.fn_acquire_shard_lease(
  p_shard_id VARCHAR(64),
  p_user_id VARCHAR(255),
  p_estimated_tokens BIGINT DEFAULT 2000,
  p_lease_ttl_ms BIGINT DEFAULT 120000,
  p_job_id VARCHAR(128) DEFAULT NULL,
  p_now_ms BIGINT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_shard public.galx_shard_accounts%ROWTYPE;
  v_existing public.galx_shard_leases%ROWTYPE;
  v_expired RECORD;
  v_lease_id VARCHAR(64);
  v_now_ms BIGINT;
  v_expires_at_ms BIGINT;
  v_new_fencing_token BIGINT;
  v_elapsed_ms BIGINT;
  v_token_credit NUMERIC;
  v_request_credit NUMERIC;
  v_tokens_to_add BIGINT;
  v_requests_to_add BIGINT;
  v_window_duration_ms BIGINT;
  v_window_cap INTEGER;
  v_window_used INTEGER;
BEGIN
  v_now_ms := COALESCE(p_now_ms, (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT);

  IF p_estimated_tokens <= 0 OR p_estimated_tokens > 10000000 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'INVALID_TOKEN_RESERVATION');
  END IF;
  IF p_lease_ttl_ms < 1000 OR p_lease_ttl_ms > 1800000 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'INVALID_LEASE_TTL');
  END IF;
  IF p_job_id IS NULL OR btrim(p_job_id) = '' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'IDEMPOTENCY_KEY_REQUIRED');
  END IF;

  SELECT * INTO v_shard
  FROM public.galx_shard_accounts
  WHERE id = p_shard_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'SHARD_NOT_FOUND');
  END IF;

  IF v_shard.managed_desktop_id IS NULL OR v_shard.desktop_enrolled_at IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'SHARD_NOT_AVAILABLE');
  END IF;

  IF p_now_ms IS NULL THEN
    v_now_ms := (EXTRACT(EPOCH FROM clock_timestamp()) * 1000)::BIGINT;
  END IF;

  SELECT * INTO v_existing
  FROM public.galx_shard_leases
  WHERE shard_id = p_shard_id
    AND user_id = p_user_id
    AND job_id = p_job_id
    AND is_reclaimed = false
  ORDER BY acquired_at_ms DESC
  LIMIT 1
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.is_committed THEN
      RETURN jsonb_build_object(
        'success', false,
        'reason', 'LEASE_ALREADY_COMMITTED',
        'lease_id', v_existing.id,
        'fencing_token', v_existing.fencing_token
      );
    ELSIF v_existing.expires_at_ms >= v_now_ms THEN
      RETURN jsonb_build_object(
        'success', true,
        'idempotent_replay', true,
        'lease_id', v_existing.id,
        'shard_id', v_existing.shard_id,
        'fencing_token', v_existing.fencing_token,
        'expires_at_ms', v_existing.expires_at_ms,
        'estimated_tokens', v_existing.estimated_tokens,
        'health_revision', v_existing.health_revision,
        'remaining_tokens', v_shard.remaining_tokens,
        'reserved_tokens', v_shard.reserved_tokens,
        'remaining_requests', v_shard.remaining_requests,
        'active_in_flight_count', v_shard.active_in_flight_count
      );
    END IF;
  END IF;

  FOR v_expired IN
    UPDATE public.galx_shard_leases
    SET is_reclaimed = true, updated_at = clock_timestamp()
    WHERE shard_id = p_shard_id
      AND expires_at_ms < v_now_ms
      AND is_committed = false
      AND is_reclaimed = false
    RETURNING estimated_tokens
  LOOP
    v_shard.reserved_tokens := GREATEST(0, v_shard.reserved_tokens - v_expired.estimated_tokens);
    v_shard.active_in_flight_count := GREATEST(0, v_shard.active_in_flight_count - 1);
  END LOOP;

  -- Continuous refill with fractional carry, evaluated under the shard lock.
  v_elapsed_ms := CASE
    WHEN COALESCE(v_shard.last_refill_timestamp_ms, 0) <= 0 THEN 0
    ELSE GREATEST(0, v_now_ms - v_shard.last_refill_timestamp_ms)
  END;
  v_token_credit := v_shard.token_refill_remainder
    + (v_elapsed_ms::NUMERIC * v_shard.refill_rate_per_minute::NUMERIC / 60000);
  v_request_credit := v_shard.request_refill_remainder
    + (v_elapsed_ms::NUMERIC * v_shard.max_requests::NUMERIC / 60000);
  v_tokens_to_add := FLOOR(v_token_credit)::BIGINT;
  v_requests_to_add := FLOOR(v_request_credit)::BIGINT;

  v_shard.remaining_tokens := LEAST(v_shard.max_tokens, v_shard.remaining_tokens + v_tokens_to_add);
  v_shard.remaining_requests := LEAST(v_shard.max_requests, v_shard.remaining_requests + v_requests_to_add);
  v_shard.token_refill_remainder := CASE
    WHEN v_shard.remaining_tokens >= v_shard.max_tokens THEN 0
    ELSE v_token_credit - FLOOR(v_token_credit)
  END;
  v_shard.request_refill_remainder := CASE
    WHEN v_shard.remaining_requests >= v_shard.max_requests THEN 0
    ELSE v_request_credit - FLOOR(v_request_credit)
  END;

  UPDATE public.galx_shard_accounts
  SET remaining_tokens = v_shard.remaining_tokens,
      remaining_requests = v_shard.remaining_requests,
      reserved_tokens = v_shard.reserved_tokens,
      active_in_flight_count = v_shard.active_in_flight_count,
      token_refill_remainder = v_shard.token_refill_remainder,
      request_refill_remainder = v_shard.request_refill_remainder,
      last_refill_timestamp_ms = v_now_ms,
      updated_at_ms = v_now_ms,
      updated_at = clock_timestamp()
  WHERE id = p_shard_id;

  -- Recovery is admitted under the account row lock, so multiple gateway
  -- processes cannot each start a half-open probe. Untimed cooldowns stay closed.
  IF v_shard.status NOT IN ('healthy', 'cooldown', 'exhausted') THEN
    RETURN jsonb_build_object('success', false, 'reason', 'SHARD_NOT_HEALTHY', 'status', v_shard.status);
  END IF;
  IF v_shard.permission_retracted THEN
    RETURN jsonb_build_object('success', false, 'reason', 'PERMISSION_RETRACTED');
  END IF;
  IF v_shard.cooldown_until_ms IS NOT NULL AND v_shard.cooldown_until_ms > v_now_ms THEN
    RETURN jsonb_build_object('success', false, 'reason', 'SHARD_COOLDOWN', 'retry_at_ms', v_shard.cooldown_until_ms);
  END IF;
  IF v_shard.credential_expires_at_ms IS NOT NULL AND v_shard.credential_expires_at_ms <= v_now_ms THEN
    RETURN jsonb_build_object('success', false, 'reason', 'CREDENTIAL_EXPIRED');
  END IF;
  IF v_shard.status IN ('cooldown', 'exhausted')
     AND (v_shard.cooldown_until_ms IS NULL OR v_shard.cooldown_until_ms <= 0) THEN
    RETURN jsonb_build_object('success', false, 'reason', 'SHARD_NOT_HEALTHY', 'status', v_shard.status);
  END IF;
  IF v_shard.status IN ('cooldown', 'exhausted')
     AND v_shard.active_in_flight_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'SHARD_CONCURRENCY_EXHAUSTED',
      'retry_at_ms', (SELECT MIN(expires_at_ms) FROM public.galx_shard_leases
        WHERE shard_id = p_shard_id AND NOT is_committed AND NOT is_reclaimed));
  END IF;
  IF v_shard.active_in_flight_count >= v_shard.max_concurrency_ceiling THEN
    RETURN jsonb_build_object('success', false, 'reason', 'SHARD_CONCURRENCY_EXHAUSTED',
      'retry_at_ms', (SELECT MIN(expires_at_ms) FROM public.galx_shard_leases
        WHERE shard_id = p_shard_id AND NOT is_committed AND NOT is_reclaimed));
  END IF;
  IF (v_shard.remaining_requests - v_shard.active_in_flight_count) < 1 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'SHARD_REQUEST_QUOTA_EXHAUSTED');
  END IF;
  IF (v_shard.remaining_tokens - v_shard.reserved_tokens) < p_estimated_tokens THEN
    RETURN jsonb_build_object('success', false, 'reason', 'SHARD_TOKEN_QUOTA_EXHAUSTED');
  END IF;

  v_window_duration_ms := CASE
    WHEN jsonb_typeof(v_shard.sliding_window_quota) = 'object'
      THEN NULLIF(v_shard.sliding_window_quota->>'windowDurationMs', '')::BIGINT
    ELSE NULL
  END;
  v_window_cap := CASE
    WHEN jsonb_typeof(v_shard.sliding_window_quota) = 'object'
      THEN COALESCE(
        NULLIF(v_shard.sliding_window_quota->>'dynamicDiscoveredCap', '')::INTEGER,
        NULLIF(v_shard.sliding_window_quota->>'maxRequestsPerWindow', '')::INTEGER
      )
    ELSE NULL
  END;
  IF v_window_duration_ms IS NOT NULL AND v_window_duration_ms > 0
     AND v_window_cap IS NOT NULL AND v_window_cap > 0 THEN
    SELECT COUNT(*)::INTEGER INTO v_window_used
    FROM public.galx_shard_leases
    WHERE shard_id = p_shard_id
      AND acquired_at_ms > v_now_ms - v_window_duration_ms
      AND is_reclaimed = false;
    IF v_window_used >= v_window_cap THEN
      RETURN jsonb_build_object(
        'success', false,
        'reason', 'SHARD_SLIDING_WINDOW_EXHAUSTED',
        'window_used', v_window_used,
        'window_cap', v_window_cap
      );
    END IF;
  END IF;

  v_expires_at_ms := v_now_ms + p_lease_ttl_ms;
  v_new_fencing_token := v_shard.fencing_token + 1;
  v_lease_id := 'lease_' || replace(gen_random_uuid()::text, '-', '');

  UPDATE public.galx_shard_accounts
  SET reserved_tokens = reserved_tokens + p_estimated_tokens,
      active_in_flight_count = active_in_flight_count + 1,
      fencing_token = v_new_fencing_token,
      updated_at_ms = v_now_ms,
      updated_at = clock_timestamp()
  WHERE id = p_shard_id;

  INSERT INTO public.galx_shard_leases (
    id, shard_id, user_id, job_id, fencing_token, estimated_tokens,
    acquired_at_ms, expires_at_ms, health_revision
  ) VALUES (
    v_lease_id, p_shard_id, p_user_id, p_job_id, v_new_fencing_token,
    p_estimated_tokens, v_now_ms, v_expires_at_ms, v_shard.registry_revision
  );

  RETURN jsonb_build_object(
    'success', true,
    'idempotent_replay', false,
    'lease_id', v_lease_id,
    'shard_id', p_shard_id,
    'fencing_token', v_new_fencing_token,
    'expires_at_ms', v_expires_at_ms,
    'estimated_tokens', p_estimated_tokens,
    'health_revision', v_shard.registry_revision,
    'remaining_tokens', v_shard.remaining_tokens,
    'reserved_tokens', v_shard.reserved_tokens + p_estimated_tokens,
    'remaining_requests', v_shard.remaining_requests,
    'active_in_flight_count', v_shard.active_in_flight_count + 1
  );
END;
$$;
