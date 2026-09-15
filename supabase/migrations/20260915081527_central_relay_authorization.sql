-- Main account authority only. No automatic enrollment or activation.
SET LOCAL lock_timeout='5s';
DO $$ BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname='galx_relay_control') THEN
    CREATE ROLE galx_relay_control NOLOGIN NOINHERIT;
  END IF;
END $$;
GRANT USAGE ON SCHEMA private TO galx_relay_control;

CREATE TABLE IF NOT EXISTS private.galx_relay_principals (
  id uuid PRIMARY KEY, actor_id uuid NOT NULL,
  pool_id text NOT NULL, installation_id uuid NOT NULL,
  kind text NOT NULL CHECK(kind IN ('runtime','registrar','operator','viewer')),
  token_sha256 text NOT NULL UNIQUE CHECK(token_sha256 ~ '^[a-f0-9]{64}$'),
  disabled boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY(installation_id,pool_id) REFERENCES private.galx_relay_installations(id,pool_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS galx_relay_principals_installation_idx ON private.galx_relay_principals(installation_id,pool_id);
CREATE TABLE IF NOT EXISTS private.galx_relay_installation_runtime (
  installation_id uuid PRIMARY KEY REFERENCES private.galx_relay_installations(id) ON DELETE RESTRICT,
  registration_allowed boolean NOT NULL DEFAULT false,
  execution_allowed boolean NOT NULL DEFAULT false,
  owner_epoch uuid, owner_generation bigint NOT NULL DEFAULT 0 CHECK(owner_generation>=0),
  last_seen_at timestamptz,
  isolation_evidence_sha256 text CHECK(isolation_evidence_sha256 ~ '^[a-f0-9]{64}$'),
  CHECK (NOT execution_allowed OR isolation_evidence_sha256 IS NOT NULL)
);
CREATE TABLE IF NOT EXISTS private.galx_relay_registrations (
  id uuid PRIMARY KEY, pool_id text NOT NULL, installation_id uuid NOT NULL,
  desktop_id uuid NOT NULL UNIQUE, actor_id uuid NOT NULL,
  name text NOT NULL CHECK(length(name) BETWEEN 1 AND 64 AND name !~ '[[:cntrl:]]'),
  state text NOT NULL DEFAULT 'prepared' CHECK(state IN ('prepared','reviewed','registered')),
  fingerprint text CHECK(fingerprint ~ '^[a-f0-9]{64}$'),
  account_class text CHECK(account_class IN ('paid','free')),
  models jsonb NOT NULL DEFAULT '[]'::jsonb CHECK(jsonb_typeof(models)='array' AND jsonb_array_length(models)<=512),
  reviewed_at timestamptz,
  ticket_sha256 text CHECK(ticket_sha256 ~ '^[a-f0-9]{64}$'),
  ticket_purpose text CHECK(ticket_purpose IN ('review','register','refresh')),
  ticket_expires_at timestamptz,
  account_id varchar(64) REFERENCES public.galx_shard_accounts(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY(installation_id,pool_id) REFERENCES private.galx_relay_installations(id,pool_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS galx_relay_registrations_scope_idx ON private.galx_relay_registrations(installation_id,pool_id,created_at,id);
CREATE INDEX IF NOT EXISTS galx_relay_registrations_account_idx ON private.galx_relay_registrations(account_id);
CREATE TABLE IF NOT EXISTS private.galx_relay_account_control (
  account_id varchar(64) PRIMARY KEY REFERENCES private.galx_relay_account_assignments(account_id) ON DELETE RESTRICT,
  account_class text NOT NULL CHECK(account_class IN ('paid','free')),
  desired_state text NOT NULL DEFAULT 'paused' CHECK(desired_state IN ('enabled','paused','revoked')),
  desired_revision bigint NOT NULL DEFAULT 1 CHECK(desired_revision>0),
  acknowledged_revision bigint, acknowledged_epoch uuid, acknowledged_at timestamptz,
  credential_revision text NOT NULL CHECK(credential_revision ~ '^[a-f0-9]{64}$'),
  models jsonb NOT NULL CHECK(jsonb_typeof(models)='array' AND jsonb_array_length(models)<=512),
  updated_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE IF NOT EXISTS private.galx_relay_control_operations (
  id uuid PRIMARY KEY, actor_id uuid NOT NULL, pool_id text NOT NULL, installation_id uuid NOT NULL,
  account_id varchar(64) NOT NULL REFERENCES private.galx_relay_account_assignments(account_id) ON DELETE RESTRICT,
  command text NOT NULL CHECK(command IN ('enabled','paused','revoked','rename')),
  request_sha256 text NOT NULL CHECK(request_sha256 ~ '^[a-f0-9]{64}$'),
  saved_revision bigint NOT NULL CHECK(saved_revision>0),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY(installation_id,pool_id) REFERENCES private.galx_relay_installations(id,pool_id) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS galx_relay_control_operations_scope_idx ON private.galx_relay_control_operations(installation_id,pool_id,created_at,id);
CREATE INDEX IF NOT EXISTS galx_relay_control_operations_account_idx ON private.galx_relay_control_operations(account_id);
CREATE UNIQUE INDEX IF NOT EXISTS galx_relay_assignment_scope_unique ON private.galx_relay_account_assignments(account_id,pool_id,installation_id);
CREATE TABLE IF NOT EXISTS private.galx_relay_lease_bindings (
  lease_id varchar(64) PRIMARY KEY REFERENCES public.galx_shard_leases(id) ON DELETE RESTRICT,
  pool_id text NOT NULL, installation_id uuid NOT NULL, account_id varchar(64) NOT NULL,
  owner_epoch uuid NOT NULL, assignment_revision bigint NOT NULL, control_revision bigint NOT NULL,
  credential_revision text NOT NULL CHECK(credential_revision ~ '^[a-f0-9]{64}$'),
  workload text NOT NULL CHECK(workload IN ('text','sites','images')),
  request_key text NOT NULL CHECK(request_key ~ '^[a-f0-9]{64}$'),
  request_sha256 text NOT NULL CHECK(request_sha256 ~ '^[a-f0-9]{64}$'),
  tenant_sha256 text NOT NULL CHECK(tenant_sha256 ~ '^[a-f0-9]{64}$'),
  deadline_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  UNIQUE(installation_id,request_key),
  FOREIGN KEY(installation_id,pool_id) REFERENCES private.galx_relay_installations(id,pool_id) ON DELETE RESTRICT,
  FOREIGN KEY(account_id,pool_id,installation_id) REFERENCES private.galx_relay_account_assignments(account_id,pool_id,installation_id) ON DELETE RESTRICT,
  CHECK(pool_id='premium' OR workload='text')
);
CREATE INDEX IF NOT EXISTS galx_relay_lease_bindings_account_idx ON private.galx_relay_lease_bindings(account_id);

ALTER TABLE private.galx_relay_principals ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_relay_principals FORCE ROW LEVEL SECURITY;
REVOKE ALL ON private.galx_relay_principals FROM PUBLIC,anon,authenticated,service_role,galx_desktop_writer,galx_relay_control;
ALTER TABLE private.galx_relay_installation_runtime ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_relay_installation_runtime FORCE ROW LEVEL SECURITY;
REVOKE ALL ON private.galx_relay_installation_runtime FROM PUBLIC,anon,authenticated,service_role,galx_desktop_writer,galx_relay_control;
ALTER TABLE private.galx_relay_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_relay_registrations FORCE ROW LEVEL SECURITY;
REVOKE ALL ON private.galx_relay_registrations FROM PUBLIC,anon,authenticated,service_role,galx_desktop_writer,galx_relay_control;
ALTER TABLE private.galx_relay_account_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_relay_account_control FORCE ROW LEVEL SECURITY;
REVOKE ALL ON private.galx_relay_account_control FROM PUBLIC,anon,authenticated,service_role,galx_desktop_writer,galx_relay_control;
ALTER TABLE private.galx_relay_control_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_relay_control_operations FORCE ROW LEVEL SECURITY;
REVOKE ALL ON private.galx_relay_control_operations FROM PUBLIC,anon,authenticated,service_role,galx_desktop_writer,galx_relay_control;
ALTER TABLE private.galx_relay_lease_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_relay_lease_bindings FORCE ROW LEVEL SECURITY;
REVOKE ALL ON private.galx_relay_lease_bindings FROM PUBLIC,anon,authenticated,service_role,galx_desktop_writer,galx_relay_control;

-- Existing owner-scoped consumers must exclude permanently assigned accounts.
ALTER TABLE public.galx_shard_accounts ADD COLUMN IF NOT EXISTS relay_pool_id text;
DO $$ BEGIN
  IF NOT EXISTS(SELECT FROM pg_constraint WHERE conname='galx_shard_relay_pool_fkey') THEN
    ALTER TABLE public.galx_shard_accounts ADD CONSTRAINT galx_shard_relay_pool_fkey
      FOREIGN KEY(relay_pool_id) REFERENCES private.galx_relay_pools(id) ON DELETE RESTRICT;
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS galx_shard_relay_pool_idx ON public.galx_shard_accounts(relay_pool_id) WHERE relay_pool_id IS NOT NULL;
CREATE OR REPLACE FUNCTION private.guard_relay_pool_marker() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$ BEGIN
  IF NEW.relay_pool_id IS DISTINCT FROM OLD.relay_pool_id AND current_user<>'postgres' THEN
    RAISE EXCEPTION 'Central account assignment required' USING ERRCODE='42501';
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_relay_pool_marker() FROM PUBLIC,anon,authenticated,service_role;
DROP TRIGGER IF EXISTS guard_relay_pool_marker ON public.galx_shard_accounts;
CREATE TRIGGER guard_relay_pool_marker BEFORE UPDATE ON public.galx_shard_accounts FOR EACH ROW EXECUTE FUNCTION private.guard_relay_pool_marker();

-- Openable only through the administrator installation procedure, never a runtime flag.
ALTER TABLE private.galx_relay_pools DROP CONSTRAINT IF EXISTS galx_relay_registration_not_activated;
CREATE OR REPLACE FUNCTION private.guard_relay_foundation() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE a public.galx_shard_accounts%ROWTYPE;
BEGIN
  IF TG_OP='UPDATE' AND TG_TABLE_NAME='galx_relay_pools' THEN
    IF current_user='postgres' AND ROW(NEW.id,NEW.account_class,NEW.workloads,NEW.created_at) IS NOT DISTINCT FROM ROW(OLD.id,OLD.account_class,OLD.workloads,OLD.created_at) THEN RETURN NEW; END IF;
  END IF;
  IF TG_OP IN ('UPDATE','DELETE','TRUNCATE') THEN RAISE EXCEPTION 'Relay identity and registration history are immutable' USING ERRCODE='42501'; END IF;
  IF TG_TABLE_NAME IN ('galx_relay_account_assignments','galx_relay_registration_operations') AND
    NOT COALESCE((SELECT registration_enabled FROM private.galx_relay_pools WHERE id=NEW.pool_id),false) THEN
    RAISE EXCEPTION 'Relay registration is not activated' USING ERRCODE='42501';
  END IF;
  IF TG_TABLE_NAME='galx_relay_account_assignments' THEN
    SELECT * INTO a FROM public.galx_shard_accounts WHERE id=NEW.account_id FOR SHARE;
    IF NOT FOUND OR a.managed_desktop_id IS DISTINCT FROM NEW.managed_desktop_id OR a.desktop_enrolled_at IS NULL
      OR a.permission_retracted OR a.status::text IN ('revoked','dead','quarantined') THEN
      RAISE EXCEPTION 'A current manual desktop enrollment is required' USING ERRCODE='42501';
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- Retain the existing accounting implementation exactly once; wrap legacy entry points.
DO $$ BEGIN
  IF to_regprocedure('private.relay_base_acquire(character varying,character varying,bigint,bigint,character varying,bigint)') IS NULL THEN
    ALTER FUNCTION public.fn_acquire_shard_lease(varchar,varchar,bigint,bigint,varchar,bigint) SET SCHEMA private;
    ALTER FUNCTION private.fn_acquire_shard_lease(varchar,varchar,bigint,bigint,varchar,bigint) RENAME TO relay_base_acquire;
    ALTER FUNCTION public.fn_extend_shard_lease(varchar,bigint,bigint,bigint) SET SCHEMA private;
    ALTER FUNCTION private.fn_extend_shard_lease(varchar,bigint,bigint,bigint) RENAME TO relay_base_extend;
    ALTER FUNCTION public.fn_release_shard_lease(varchar,bigint,numeric,boolean,bigint) SET SCHEMA private;
    ALTER FUNCTION private.fn_release_shard_lease(varchar,bigint,numeric,boolean,bigint) RENAME TO relay_base_release;
  END IF;
END $$;
REVOKE ALL ON FUNCTION private.relay_base_acquire(varchar,varchar,bigint,bigint,varchar,bigint),
  private.relay_base_extend(varchar,bigint,bigint,bigint),private.relay_base_release(varchar,bigint,numeric,boolean,bigint)
  FROM PUBLIC,anon,authenticated,service_role,galx_relay_control,galx_desktop_writer;
CREATE OR REPLACE FUNCTION public.fn_acquire_shard_lease(p_shard_id varchar,p_user_id varchar,p_estimated_tokens bigint DEFAULT 2000,p_lease_ttl_ms bigint DEFAULT 120000,p_job_id varchar DEFAULT NULL,p_now_ms bigint DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
  IF EXISTS(SELECT FROM private.galx_relay_account_assignments WHERE account_id=p_shard_id) THEN
    RETURN jsonb_build_object('success',false,'reason','SCOPED_RELAY_REQUIRED'); END IF;
  RETURN private.relay_base_acquire(p_shard_id,p_user_id,p_estimated_tokens,p_lease_ttl_ms,p_job_id,p_now_ms);
END $$;
CREATE OR REPLACE FUNCTION public.fn_extend_shard_lease(p_lease_id varchar,p_fencing_token bigint,p_extension_ms bigint DEFAULT 120000,p_now_ms bigint DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
  IF EXISTS(SELECT FROM private.galx_relay_lease_bindings WHERE lease_id=p_lease_id) THEN
    RETURN jsonb_build_object('success',false,'reason','SCOPED_RELAY_REQUIRED'); END IF;
  RETURN private.relay_base_extend(p_lease_id,p_fencing_token,p_extension_ms,p_now_ms);
END $$;
CREATE OR REPLACE FUNCTION public.fn_release_shard_lease(p_lease_id varchar,p_actual_tokens bigint DEFAULT NULL,p_latency_ms numeric DEFAULT NULL,p_success boolean DEFAULT true,p_now_ms bigint DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
  IF EXISTS(SELECT FROM private.galx_relay_lease_bindings WHERE lease_id=p_lease_id) THEN
    RETURN jsonb_build_object('success',false,'reason','SCOPED_RELAY_REQUIRED'); END IF;
  RETURN private.relay_base_release(p_lease_id,p_actual_tokens,p_latency_ms,p_success,p_now_ms);
END $$;
REVOKE ALL ON FUNCTION public.fn_acquire_shard_lease(varchar,varchar,bigint,bigint,varchar,bigint),public.fn_extend_shard_lease(varchar,bigint,bigint,bigint),public.fn_release_shard_lease(varchar,bigint,numeric,boolean,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_acquire_shard_lease(varchar,varchar,bigint,bigint,varchar,bigint),public.fn_extend_shard_lease(varchar,bigint,bigint,bigint),public.fn_release_shard_lease(varchar,bigint,numeric,boolean,bigint) TO service_role;

-- Administrator provisioning only; credentials are generated off-database and only hashes persist.
CREATE OR REPLACE FUNCTION private.relay_configure_installation(p_pool text,p_installation uuid,p_host uuid,p_principals jsonb,p_registration boolean DEFAULT false,p_execution boolean DEFAULT false,p_evidence_sha256 text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE x jsonb; old private.galx_relay_installations%ROWTYPE;
BEGIN
  IF p_pool IS NULL OR p_pool NOT IN ('premium','standard') OR p_installation IS NULL OR p_host IS NULL
    OR p_principals IS NULL OR jsonb_typeof(p_principals)<>'array' OR jsonb_array_length(p_principals)>16
    OR (p_execution AND (p_evidence_sha256 IS NULL OR p_evidence_sha256 !~ '^[a-f0-9]{64}$')) THEN
    RAISE EXCEPTION 'Invalid installation configuration' USING ERRCODE='22023'; END IF;
  SELECT * INTO old FROM private.galx_relay_installations WHERE id=p_installation FOR UPDATE;
  IF FOUND AND (old.pool_id<>p_pool OR old.host_id<>p_host) THEN RAISE EXCEPTION 'Installation conflict' USING ERRCODE='23505'; END IF;
  INSERT INTO private.galx_relay_installations(id,pool_id,host_id) VALUES(p_installation,p_pool,p_host) ON CONFLICT(id) DO NOTHING;
  INSERT INTO private.galx_relay_installation_runtime(installation_id,registration_allowed,execution_allowed,isolation_evidence_sha256)
    VALUES(p_installation,p_registration,p_execution,p_evidence_sha256) ON CONFLICT(installation_id) DO UPDATE
      SET registration_allowed=EXCLUDED.registration_allowed,execution_allowed=EXCLUDED.execution_allowed,isolation_evidence_sha256=EXCLUDED.isolation_evidence_sha256;
  UPDATE private.galx_relay_pools SET registration_enabled=p_registration WHERE id=p_pool;
  FOR x IN SELECT value FROM jsonb_array_elements(p_principals) LOOP
    INSERT INTO private.galx_relay_principals(id,actor_id,pool_id,installation_id,kind,token_sha256)
      VALUES((x->>'id')::uuid,(x->>'actorId')::uuid,p_pool,p_installation,x->>'kind',x->>'tokenSha256')
      ON CONFLICT(id) DO UPDATE SET disabled=COALESCE((x->>'disabled')::boolean,false)
      WHERE private.galx_relay_principals.pool_id=p_pool AND private.galx_relay_principals.installation_id=p_installation
        AND private.galx_relay_principals.token_sha256=x->>'tokenSha256' AND private.galx_relay_principals.kind=x->>'kind'
        AND private.galx_relay_principals.actor_id=(x->>'actorId')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Principal conflict' USING ERRCODE='23505'; END IF;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION private.relay_configure_installation(text,uuid,uuid,jsonb,boolean,boolean,text) FROM PUBLIC,anon,authenticated,service_role,galx_relay_control;

-- Narrow service protocol. Scope comes from a hashed authenticated principal, never request JSON or a GUC.
CREATE OR REPLACE FUNCTION private.relay_control(p_token_sha256 text,p_action text,p_body jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE p private.galx_relay_principals%ROWTYPE; i private.galx_relay_installation_runtime%ROWTYPE;
  r private.galx_relay_registrations%ROWTYPE; a private.galx_relay_account_assignments%ROWTYPE;
  c private.galx_relay_account_control%ROWTYPE; s public.galx_shard_accounts%ROWTYPE;
  op private.galx_relay_control_operations%ROWTYPE; b private.galx_relay_lease_bindings%ROWTYPE;
  l public.galx_shard_leases%ROWTYPE; result jsonb; now_ms bigint; account text; command text;
BEGIN
  IF p_body IS NULL OR jsonb_typeof(p_body)<>'object' OR octet_length(p_body::text)>262144 THEN RAISE EXCEPTION 'Invalid request' USING ERRCODE='22023'; END IF;
  SELECT * INTO p FROM private.galx_relay_principals WHERE token_sha256=p_token_sha256 AND NOT disabled;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unauthorized' USING ERRCODE='42501'; END IF;
  SELECT * INTO i FROM private.galx_relay_installation_runtime WHERE installation_id=p.installation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Installation unavailable' USING ERRCODE='42501'; END IF;
  IF p_body ? 'pool' AND p_body->>'pool' IS DISTINCT FROM p.pool_id THEN RAISE EXCEPTION 'Scope mismatch' USING ERRCODE='42501'; END IF;
  IF p_body ? 'installationId' AND (p_body->>'installationId')::uuid IS DISTINCT FROM p.installation_id THEN RAISE EXCEPTION 'Scope mismatch' USING ERRCODE='42501'; END IF;
  IF p_action='authenticate' THEN RETURN jsonb_build_object('id',p.id,'actorId',p.actor_id,'pool',p.pool_id,'installationId',p.installation_id,'kind',p.kind); END IF;
  IF p_action IN ('status','operation') AND p.kind IN ('operator','viewer') THEN
    IF p_action='operation' THEN
      SELECT * INTO r FROM private.galx_relay_registrations WHERE id=(p_body->>'id')::uuid AND installation_id=p.installation_id AND pool_id=p.pool_id;
      IF NOT FOUND THEN RAISE EXCEPTION 'Not found' USING ERRCODE='P0002'; END IF;
      RETURN jsonb_build_object('id',r.id,'desktopId',r.desktop_id,'name',r.name,'state',r.state,'accountId',r.account_id,'accountClass',r.account_class,'models',r.models,'updatedAt',r.updated_at);
    END IF;
    RETURN jsonb_build_object('pool',p.pool_id,'installationId',p.installation_id,'registrationAllowed',i.registration_allowed,
      'executionAllowed',i.execution_allowed,'lastSeenAt',i.last_seen_at,'epoch',i.owner_epoch,
      'accounts',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',aa.account_id,'desktopId',aa.managed_desktop_id,'name',ss.account_label,
        'state',cc.desired_state,'revision',cc.desired_revision,'acknowledgedRevision',cc.acknowledged_revision,'acknowledgedEpoch',cc.acknowledged_epoch,
        'acknowledgedAt',cc.acknowledged_at,'models',cc.models,'accountClass',cc.account_class,'credentialExpiresAt',ss.credential_expires_at_ms) ORDER BY aa.created_at,aa.account_id)
        FROM private.galx_relay_account_assignments aa JOIN private.galx_relay_account_control cc ON cc.account_id=aa.account_id
        JOIN public.galx_shard_accounts ss ON ss.id=aa.account_id WHERE aa.installation_id=p.installation_id AND aa.pool_id=p.pool_id),'[]'::jsonb),
      'registrations',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',rr.id,'desktopId',rr.desktop_id,'name',rr.name,'state',rr.state,'accountId',rr.account_id,'accountClass',rr.account_class,'models',rr.models,'updatedAt',rr.updated_at) ORDER BY rr.created_at,rr.id)
        FROM private.galx_relay_registrations rr WHERE rr.installation_id=p.installation_id AND rr.pool_id=p.pool_id),'[]'::jsonb),
      'activity',COALESCE((SELECT jsonb_agg(x.item) FROM (SELECT jsonb_build_object('id',oo.id,'accountId',oo.account_id,'command',oo.command,'revision',oo.saved_revision,'at',oo.created_at) item
        FROM private.galx_relay_control_operations oo WHERE oo.installation_id=p.installation_id AND oo.pool_id=p.pool_id ORDER BY oo.created_at DESC,oo.id LIMIT 100) x),'[]'::jsonb));
  END IF;
  IF p_action='prepare' AND p.kind='operator' THEN
    IF NOT i.registration_allowed THEN RAISE EXCEPTION 'Registration closed' USING ERRCODE='42501'; END IF;
    INSERT INTO private.galx_relay_registrations(id,pool_id,installation_id,desktop_id,actor_id,name)
      VALUES((p_body->>'id')::uuid,p.pool_id,p.installation_id,(p_body->>'desktopId')::uuid,p.actor_id,p_body->>'name') ON CONFLICT(id) DO NOTHING;
    SELECT * INTO r FROM private.galx_relay_registrations WHERE id=(p_body->>'id')::uuid FOR UPDATE;
    IF r.pool_id<>p.pool_id OR r.installation_id<>p.installation_id OR r.actor_id<>p.actor_id OR r.desktop_id<>(p_body->>'desktopId')::uuid OR r.name<>p_body->>'name' THEN
      RAISE EXCEPTION 'Operation conflict' USING ERRCODE='23505'; END IF;
    RETURN jsonb_build_object('id',r.id,'desktopId',r.desktop_id,'name',r.name,'state',r.state,'accountId',r.account_id);
  END IF;
  IF p_action IN ('ticket','review','register','refresh','registration_context') THEN
    IF (p_action='ticket' AND p.kind<>'operator') OR (p_action<>'ticket' AND p.kind<>'registrar') THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
    SELECT * INTO r FROM private.galx_relay_registrations WHERE id=(p_body->>'id')::uuid AND pool_id=p.pool_id AND installation_id=p.installation_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Not found' USING ERRCODE='P0002'; END IF;
    IF NOT i.registration_allowed THEN RAISE EXCEPTION 'Registration closed' USING ERRCODE='42501'; END IF;
    IF p_action='ticket' THEN
      IF p_body->>'purpose' IS NULL OR p_body->>'ticketSha256' IS NULL OR p_body->>'purpose' NOT IN ('review','register','refresh') OR p_body->>'ticketSha256' !~ '^[a-f0-9]{64}$'
        OR (p_body->>'purpose'='register' AND r.state NOT IN ('reviewed','registered'))
        OR (p_body->>'purpose'='refresh' AND r.state<>'registered') THEN RAISE EXCEPTION 'Review required' USING ERRCODE='22023'; END IF;
      UPDATE private.galx_relay_registrations SET ticket_sha256=p_body->>'ticketSha256',ticket_purpose=p_body->>'purpose',ticket_expires_at=clock_timestamp()+interval '2 minutes',updated_at=clock_timestamp() WHERE id=r.id;
      RETURN jsonb_build_object('id',r.id,'desktopId',r.desktop_id,'name',r.name,'state',r.state);
    END IF;
    IF p_body->>'ticketSha256' IS NULL OR p_body->>'purpose' IS NULL OR r.ticket_sha256 IS DISTINCT FROM p_body->>'ticketSha256' OR r.ticket_expires_at<=clock_timestamp() OR r.ticket_expires_at IS NULL
      OR r.ticket_purpose IS DISTINCT FROM p_body->>'purpose' THEN RAISE EXCEPTION 'Action authorization expired' USING ERRCODE='42501'; END IF;
    IF p_action='registration_context' THEN
      RETURN jsonb_build_object('id',r.id,'desktopId',r.desktop_id,'pool',r.pool_id,'state',r.state,'fingerprint',r.fingerprint,'accountId',r.account_id,
        'accounts',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',q.id,'user_id',q.user_id,'provider',q.provider,'auth_type',q.auth_type,'status',q.status,'permission_retracted',q.permission_retracted,
          'managed_desktop_id',q.managed_desktop_id,'encrypted_ciphertext',q.encrypted_ciphertext,'encrypted_iv',q.encrypted_iv,'encrypted_tag',q.encrypted_tag,'key_version',q.key_version)) FROM public.galx_shard_accounts q WHERE q.provider='openai'),'[]'::jsonb));
    END IF;
    IF p_body->>'fingerprint' IS NULL OR p_body->>'credentialRevision' IS NULL OR p_body->'models' IS NULL
      OR p_body->>'accountClass' IS DISTINCT FROM (CASE WHEN p.pool_id='premium' THEN 'paid' ELSE 'free' END)
      OR p_body->>'fingerprint' !~ '^[a-f0-9]{64}$' OR jsonb_typeof(p_body->'models')<>'array' OR jsonb_array_length(p_body->'models')=0 THEN
      RAISE EXCEPTION 'Account not eligible' USING ERRCODE='42501'; END IF;
    IF p_action='review' THEN
      IF r.ticket_purpose<>'review' OR r.state='registered' THEN RAISE EXCEPTION 'Operation conflict' USING ERRCODE='23505'; END IF;
      UPDATE private.galx_relay_registrations SET state='reviewed',fingerprint=p_body->>'fingerprint',account_class=p_body->>'accountClass',models=p_body->'models',reviewed_at=clock_timestamp(),updated_at=clock_timestamp(),ticket_sha256=NULL WHERE id=r.id;
      RETURN jsonb_build_object('id',r.id,'desktopId',r.desktop_id,'name',r.name,'state','reviewed','accountClass',p_body->>'accountClass','models',p_body->'models');
    END IF;
    IF p_action='register' THEN
      IF r.ticket_purpose<>'register' OR r.fingerprint IS DISTINCT FROM p_body->>'fingerprint' THEN RAISE EXCEPTION 'Review changed' USING ERRCODE='40001'; END IF;
      IF r.state='registered' THEN
        RETURN jsonb_build_object('id',r.id,'accountId',r.account_id,'state','registered','replayed',true);
      END IF;
      IF r.state<>'reviewed' OR r.reviewed_at<clock_timestamp()-interval '5 minutes' THEN RAISE EXCEPTION 'Review expired' USING ERRCODE='40001'; END IF;
      account:=private.enroll_desktop_shard(r.desktop_id,p_body->'row',NULLIF(p_body->'expected','null'::jsonb));
      INSERT INTO private.galx_relay_account_assignments(account_id,pool_id,installation_id,managed_desktop_id,registration_operation_id)
        VALUES(account,p.pool_id,p.installation_id,r.desktop_id,r.id);
      INSERT INTO private.galx_relay_registration_operations(id,account_id,pool_id,installation_id,actor_id,request_sha256)
        VALUES(r.id,account,p.pool_id,p.installation_id,r.actor_id,r.fingerprint);
      UPDATE public.galx_shard_accounts SET relay_pool_id=p.pool_id,account_label=r.name WHERE id=account;
      INSERT INTO private.galx_relay_account_control(account_id,account_class,credential_revision,models)
        VALUES(account,p_body->>'accountClass',p_body->>'credentialRevision',p_body->'models');
      UPDATE private.galx_relay_registrations SET state='registered',account_id=account,updated_at=clock_timestamp() WHERE id=r.id;
      RETURN jsonb_build_object('id',r.id,'accountId',account,'state','registered','replayed',false);
    END IF;
    IF p_action='refresh' THEN
      IF r.ticket_purpose<>'refresh' OR r.state<>'registered' THEN RAISE EXCEPTION 'Operation conflict' USING ERRCODE='23505'; END IF;
      PERFORM 1 FROM public.galx_shard_accounts WHERE id=r.account_id FOR UPDATE;
      SELECT * INTO c FROM private.galx_relay_account_control WHERE account_id=r.account_id FOR UPDATE;
      IF c.desired_state='revoked' THEN RAISE EXCEPTION 'Account revoked' USING ERRCODE='42501'; END IF;
      IF c.credential_revision=p_body->>'credentialRevision' THEN RETURN jsonb_build_object('accountId',r.account_id,'state','current','revision',c.desired_revision); END IF;
      IF NOT private.refresh_desktop_shard(r.desktop_id,r.account_id,p_body->'expected',p_body->'row') THEN RAISE EXCEPTION 'Credential changed' USING ERRCODE='40001'; END IF;
      UPDATE private.galx_relay_account_control SET credential_revision=p_body->>'credentialRevision',models=p_body->'models',desired_revision=desired_revision+1,updated_at=clock_timestamp() WHERE account_id=r.account_id RETURNING * INTO c;
      RETURN jsonb_build_object('accountId',r.account_id,'state','updated','revision',c.desired_revision);
    END IF;
  END IF;
  IF p_action='set_account' AND p.kind='operator' THEN
    SELECT * INTO a FROM private.galx_relay_account_assignments WHERE account_id=p_body->>'accountId' AND pool_id=p.pool_id AND installation_id=p.installation_id;
    IF NOT FOUND THEN RAISE EXCEPTION 'Not found' USING ERRCODE='P0002'; END IF;
    PERFORM pg_advisory_xact_lock(hashtextextended(p_body->>'id',9));
    SELECT * INTO op FROM private.galx_relay_control_operations WHERE id=(p_body->>'id')::uuid;
    IF FOUND THEN
      IF op.actor_id<>p.actor_id OR op.pool_id<>p.pool_id OR op.installation_id<>p.installation_id OR op.account_id<>a.account_id OR op.request_sha256<>p_body->>'requestSha256' THEN RAISE EXCEPTION 'Operation conflict' USING ERRCODE='23505'; END IF;
      RETURN jsonb_build_object('id',op.id,'accountId',op.account_id,'savedRevision',op.saved_revision,'replayed',true);
    END IF;
    PERFORM 1 FROM public.galx_shard_accounts WHERE id=a.account_id FOR UPDATE;
    SELECT * INTO c FROM private.galx_relay_account_control WHERE account_id=a.account_id FOR UPDATE;
    IF c.desired_revision IS DISTINCT FROM (p_body->>'expectedRevision')::bigint THEN RAISE EXCEPTION 'Account changed' USING ERRCODE='40001'; END IF;
    command:=p_body->>'command';
    IF command IS NULL OR command NOT IN ('enabled','paused','revoked','rename') OR (c.desired_state='revoked' AND command<>'revoked') THEN RAISE EXCEPTION 'Invalid account action' USING ERRCODE='42501'; END IF;
    IF command='rename' THEN
      IF p_body->>'name' IS NULL OR length(p_body->>'name') NOT BETWEEN 1 AND 64 OR p_body->>'name' ~ '[[:cntrl:]]' THEN RAISE EXCEPTION 'Invalid name' USING ERRCODE='22023'; END IF;
      UPDATE public.galx_shard_accounts SET account_label=p_body->>'name' WHERE id=a.account_id;
    END IF;
    UPDATE private.galx_relay_account_control SET desired_state=CASE WHEN command='rename' THEN desired_state ELSE command END,desired_revision=desired_revision+1,updated_at=clock_timestamp() WHERE account_id=a.account_id RETURNING * INTO c;
    IF command='revoked' THEN UPDATE public.galx_shard_accounts SET permission_retracted=true,status='revoked' WHERE id=a.account_id; END IF;
    INSERT INTO private.galx_relay_control_operations(id,actor_id,pool_id,installation_id,account_id,command,request_sha256,saved_revision)
      VALUES((p_body->>'id')::uuid,p.actor_id,p.pool_id,p.installation_id,a.account_id,command,p_body->>'requestSha256',c.desired_revision);
    RETURN jsonb_build_object('id',p_body->>'id','accountId',a.account_id,'savedRevision',c.desired_revision,'replayed',false);
  END IF;
  IF p.kind<>'runtime' THEN RAISE EXCEPTION 'Forbidden' USING ERRCODE='42501'; END IF;
  IF p_action='claim' THEN
    SELECT * INTO i FROM private.galx_relay_installation_runtime WHERE installation_id=p.installation_id FOR UPDATE;
    IF p_body->>'epoch' IS NULL THEN RAISE EXCEPTION 'Missing epoch' USING ERRCODE='22023'; END IF;
    IF i.owner_epoch IS DISTINCT FROM (p_body->>'epoch')::uuid AND i.last_seen_at>clock_timestamp()-interval '60 seconds' THEN RAISE EXCEPTION 'Installation owned' USING ERRCODE='55P03'; END IF;
    UPDATE private.galx_relay_installation_runtime SET owner_generation=owner_generation+CASE WHEN owner_epoch IS DISTINCT FROM (p_body->>'epoch')::uuid THEN 1 ELSE 0 END,
      owner_epoch=(p_body->>'epoch')::uuid,last_seen_at=clock_timestamp() WHERE installation_id=p.installation_id RETURNING * INTO i;
    RETURN jsonb_build_object('epoch',i.owner_epoch,'generation',i.owner_generation);
  END IF;
  IF p_action='settle' THEN
    SELECT * INTO b FROM private.galx_relay_lease_bindings WHERE lease_id=p_body->>'leaseId' AND pool_id=p.pool_id AND installation_id=p.installation_id;
    IF NOT FOUND OR b.owner_epoch IS DISTINCT FROM (p_body->>'epoch')::uuid THEN RAISE EXCEPTION 'Lease not found' USING ERRCODE='P0002'; END IF;
    result:=private.relay_base_release(b.lease_id,(p_body->>'actualTokens')::bigint,(p_body->>'latencyMs')::numeric,(p_body->>'success')::boolean,NULL);
    RETURN jsonb_build_object('success',result->'success','replayed',result->'idempotent_replay','reason',result->'reason');
  END IF;
  SELECT * INTO i FROM private.galx_relay_installation_runtime WHERE installation_id=p.installation_id FOR SHARE;
  IF i.owner_epoch IS DISTINCT FROM (p_body->>'epoch')::uuid OR i.last_seen_at IS NULL OR i.last_seen_at<clock_timestamp()-interval '45 seconds' THEN RAISE EXCEPTION 'Installation expired' USING ERRCODE='42501'; END IF;
  IF p_action='heartbeat' THEN
    UPDATE private.galx_relay_installation_runtime SET last_seen_at=clock_timestamp() WHERE installation_id=p.installation_id;
    RETURN jsonb_build_object('epoch',i.owner_epoch,'executionAllowed',i.execution_allowed);
  END IF;
  IF p_action='projection' THEN
    RETURN jsonb_build_object('pool',p.pool_id,'installationId',p.installation_id,'epoch',i.owner_epoch,'executionAllowed',i.execution_allowed,
      'accounts',COALESCE((SELECT jsonb_agg(jsonb_build_object('id',aa.account_id,'desktopId',aa.managed_desktop_id,'assignmentRevision',aa.assignment_revision,
        'revision',cc.desired_revision,'state',cc.desired_state,'credentialRevision',cc.credential_revision,'models',cc.models,
        'expiresAtMs',ss.credential_expires_at_ms,'cooldownUntilMs',ss.cooldown_until_ms,
        'envelope',CASE WHEN i.execution_allowed AND cc.desired_state='enabled' AND NOT ss.permission_retracted AND ss.status::text NOT IN ('revoked','dead','quarantined','paused')
          THEN jsonb_build_object('id',ss.id,'user_id',ss.user_id,'provider',ss.provider,'key_version',ss.key_version,'encrypted_ciphertext',ss.encrypted_ciphertext,'encrypted_iv',ss.encrypted_iv,'encrypted_tag',ss.encrypted_tag) ELSE NULL END) ORDER BY aa.account_id)
        FROM private.galx_relay_account_assignments aa JOIN private.galx_relay_account_control cc ON cc.account_id=aa.account_id JOIN public.galx_shard_accounts ss ON ss.id=aa.account_id
        WHERE aa.pool_id=p.pool_id AND aa.installation_id=p.installation_id),'[]'::jsonb));
  END IF;
  SELECT * INTO a FROM private.galx_relay_account_assignments WHERE account_id=p_body->>'accountId' AND pool_id=p.pool_id AND installation_id=p.installation_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Not found' USING ERRCODE='P0002'; END IF;
  -- Keep the established account -> lease lock order during admission and renewal.
  SELECT * INTO s FROM public.galx_shard_accounts WHERE id=a.account_id FOR UPDATE;
  SELECT * INTO c FROM private.galx_relay_account_control WHERE account_id=a.account_id FOR UPDATE;
  IF p_action='acknowledge' THEN
    IF c.desired_revision IS DISTINCT FROM (p_body->>'revision')::bigint OR c.credential_revision IS DISTINCT FROM p_body->>'credentialRevision' THEN RAISE EXCEPTION 'Stale acknowledgement' USING ERRCODE='40001'; END IF;
    UPDATE private.galx_relay_account_control SET acknowledged_revision=c.desired_revision,acknowledged_epoch=i.owner_epoch,acknowledged_at=clock_timestamp() WHERE account_id=a.account_id;
    RETURN jsonb_build_object('acknowledgedRevision',c.desired_revision);
  END IF;
  now_ms:=(extract(epoch FROM clock_timestamp())*1000)::bigint;
  IF NOT i.execution_allowed OR c.desired_state<>'enabled' OR s.permission_retracted OR s.status::text IN ('revoked','dead','quarantined','paused')
    OR s.managed_desktop_id IS DISTINCT FROM a.managed_desktop_id OR s.credential_expires_at_ms<=now_ms+30000
    OR c.credential_revision IS DISTINCT FROM p_body->>'credentialRevision' OR c.desired_revision IS DISTINCT FROM (p_body->>'revision')::bigint THEN
    RAISE EXCEPTION 'Execution unavailable' USING ERRCODE='42501'; END IF;
  IF p_action='acquire' THEN
    IF p_body->>'workload' IS NULL OR p_body->>'requestKey' IS NULL OR p_body->>'requestSha256' IS NULL OR p_body->>'tenantSha256' IS NULL OR p_body->>'estimatedTokens' IS NULL
      OR p_body->>'workload' NOT IN ('text','sites','images') OR (p.pool_id='standard' AND p_body->>'workload'<>'text')
      OR p_body->>'requestKey' !~ '^[a-f0-9]{64}$' OR p_body->>'requestSha256' !~ '^[a-f0-9]{64}$' OR p_body->>'tenantSha256' !~ '^[a-f0-9]{64}$' THEN
      RAISE EXCEPTION 'Invalid execution request' USING ERRCODE='42501'; END IF;
    SELECT * INTO b FROM private.galx_relay_lease_bindings WHERE installation_id=p.installation_id AND request_key=p_body->>'requestKey';
    IF FOUND THEN
      IF b.account_id<>a.account_id OR b.owner_epoch<>i.owner_epoch OR b.request_sha256<>p_body->>'requestSha256' OR b.workload<>p_body->>'workload' OR b.tenant_sha256<>p_body->>'tenantSha256'
        OR b.control_revision<>c.desired_revision OR b.credential_revision<>c.credential_revision THEN RAISE EXCEPTION 'Execution conflict' USING ERRCODE='23505'; END IF;
      SELECT * INTO l FROM public.galx_shard_leases WHERE id=b.lease_id;
      IF l.is_committed OR l.is_reclaimed OR l.expires_at_ms<=now_ms THEN RAISE EXCEPTION 'Execution already resolved' USING ERRCODE='23505'; END IF;
      RETURN jsonb_build_object('leaseId',l.id,'fencingToken',l.fencing_token,'expiresAtMs',l.expires_at_ms);
    END IF;
    result:=private.relay_base_acquire(a.account_id,(p_body->>'tenantSha256')::varchar,(p_body->>'estimatedTokens')::bigint,30000,(p_body->>'requestKey')::varchar,NULL);
    IF NOT COALESCE((result->>'success')::boolean,false) THEN RETURN jsonb_build_object('denied',true,'reason',result->>'reason'); END IF;
    INSERT INTO private.galx_relay_lease_bindings(lease_id,pool_id,installation_id,account_id,owner_epoch,assignment_revision,control_revision,credential_revision,workload,request_key,request_sha256,tenant_sha256,deadline_at)
      VALUES(result->>'lease_id',p.pool_id,p.installation_id,a.account_id,i.owner_epoch,a.assignment_revision,c.desired_revision,c.credential_revision,p_body->>'workload',p_body->>'requestKey',p_body->>'requestSha256',p_body->>'tenantSha256',clock_timestamp()+interval '10 minutes');
    RETURN jsonb_build_object('leaseId',result->>'lease_id','fencingToken',result->'fencing_token','expiresAtMs',result->'expires_at_ms');
  END IF;
  IF p_action='renew' THEN
    IF p_body->>'fencingToken' IS NULL THEN RAISE EXCEPTION 'Missing lease fencing token' USING ERRCODE='42501'; END IF;
    SELECT * INTO b FROM private.galx_relay_lease_bindings WHERE lease_id=p_body->>'leaseId' AND pool_id=p.pool_id AND installation_id=p.installation_id AND account_id=a.account_id;
    IF NOT FOUND OR b.owner_epoch<>i.owner_epoch OR b.control_revision<>c.desired_revision OR b.credential_revision<>c.credential_revision OR b.assignment_revision<>a.assignment_revision OR b.deadline_at<=clock_timestamp()+interval '30 seconds' THEN RAISE EXCEPTION 'Lease expired' USING ERRCODE='42501'; END IF;
    result:=private.relay_base_extend(b.lease_id,(p_body->>'fencingToken')::bigint,30000,NULL);
    IF NOT COALESCE((result->>'success')::boolean,false) THEN RAISE EXCEPTION 'Lease expired' USING ERRCODE='42501'; END IF;
    RETURN jsonb_build_object('leaseId',b.lease_id,'fencingToken',result->'fencing_token','expiresAtMs',result->'expires_at_ms');
  END IF;
  RAISE EXCEPTION 'Unsupported action' USING ERRCODE='42501';
END $$;
REVOKE ALL ON FUNCTION private.relay_control(text,text,jsonb) FROM PUBLIC,anon,authenticated,service_role,galx_desktop_writer;
GRANT EXECUTE ON FUNCTION private.relay_control(text,text,jsonb) TO galx_relay_control;
COMMENT ON FUNCTION private.relay_control(text,text,jsonb) IS 'Central service only. Hashed service identity fixes pool and installation. Runtime/registrar/operator/viewer scopes are disjoint; no browser or relay database grants.';

CREATE OR REPLACE FUNCTION private.guard_relay_history() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN RAISE EXCEPTION 'Relay operation and lease evidence is immutable' USING ERRCODE='42501'; END $$;
REVOKE ALL ON FUNCTION private.guard_relay_history() FROM PUBLIC,anon,authenticated,service_role,galx_relay_control;
DROP TRIGGER IF EXISTS relay_control_operations_immutable ON private.galx_relay_control_operations;
CREATE TRIGGER relay_control_operations_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON private.galx_relay_control_operations FOR EACH STATEMENT EXECUTE FUNCTION private.guard_relay_history();
DROP TRIGGER IF EXISTS relay_lease_bindings_immutable ON private.galx_relay_lease_bindings;
CREATE TRIGGER relay_lease_bindings_immutable BEFORE UPDATE OR DELETE OR TRUNCATE ON private.galx_relay_lease_bindings FOR EACH STATEMENT EXECUTE FUNCTION private.guard_relay_history();
