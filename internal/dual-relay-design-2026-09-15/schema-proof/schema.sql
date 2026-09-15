-- Disposable PostgreSQL proof ONLY. Not a production migration or second registry.
-- run.mjs refuses an external database and creates/destroys its own empty container.
DO $$ BEGIN
  IF current_database()<>'galx_pool_schema_proof' OR to_regclass('public.galx_shard_accounts') IS NOT NULL THEN
    RAISE EXCEPTION 'Use only the empty, disposable pool-schema proof database';
  END IF;
END $$;
CREATE ROLE pool_lab_owner NOLOGIN NOINHERIT NOSUPERUSER NOBYPASSRLS;
CREATE ROLE pool_lab_premium_controller LOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOCREATEDB NOBYPASSRLS;
CREATE ROLE pool_lab_standard_controller LOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOCREATEDB NOBYPASSRLS;
CREATE ROLE pool_lab_premium_operator LOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOCREATEDB NOBYPASSRLS;
CREATE ROLE pool_lab_standard_operator LOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOCREATEDB NOBYPASSRLS;
CREATE ROLE pool_lab_premium_monitor LOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOCREATEDB NOBYPASSRLS;
CREATE ROLE pool_lab_standard_monitor LOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOCREATEDB NOBYPASSRLS;
CREATE ROLE pool_lab_outsider LOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOCREATEDB NOBYPASSRLS;
CREATE ROLE pool_lab_service LOGIN NOINHERIT NOSUPERUSER NOCREATEROLE NOCREATEDB BYPASSRLS;
CREATE SCHEMA pool_lab AUTHORIZATION pool_lab_owner;
CREATE SCHEMA relay_premium AUTHORIZATION pool_lab_owner;
CREATE SCHEMA relay_standard AUTHORIZATION pool_lab_owner;
REVOKE ALL ON SCHEMA pool_lab, relay_premium, relay_standard FROM PUBLIC;
SET ROLE pool_lab_owner;
-- Per-schema default revokes cannot remove PostgreSQL's global PUBLIC execute
-- default. Set it for this dedicated object owner, then revoke existing routines.
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

CREATE TABLE pool_lab.pools (
  id text PRIMARY KEY CHECK (id IN ('premium','standard')),
  account_class text NOT NULL CHECK ((id='premium' AND account_class='paid') OR (id='standard' AND account_class='free')),
  admit_new boolean NOT NULL DEFAULT true,
  UNIQUE(id, account_class)
);
CREATE TABLE pool_lab.instances (
  id uuid PRIMARY KEY, pool_id text NOT NULL REFERENCES pool_lab.pools(id),
  UNIQUE(pool_id,id)
);
CREATE TABLE pool_lab.principals (
  role_name name PRIMARY KEY, pool_id text NOT NULL, instance_id uuid NOT NULL,
  actor_kind text NOT NULL CHECK (actor_kind IN ('controller','operator','monitor')),
  enabled boolean NOT NULL DEFAULT true,
  FOREIGN KEY(pool_id,instance_id) REFERENCES pool_lab.instances(pool_id,id)
);
CREATE INDEX principals_instance ON pool_lab.principals(pool_id,instance_id);
CREATE TABLE pool_lab.pool_workloads (
  pool_id text NOT NULL REFERENCES pool_lab.pools(id), workload text NOT NULL CHECK(workload IN ('text','sites','images')),
  CHECK(pool_id='premium' OR workload='text'), PRIMARY KEY(pool_id,workload)
);
INSERT INTO pool_lab.pools VALUES ('premium','paid',true),('standard','free',true);
INSERT INTO pool_lab.instances VALUES
  ('10000000-0000-4000-8000-000000000001','premium'),('20000000-0000-4000-8000-000000000002','standard');
INSERT INTO pool_lab.principals(role_name,pool_id,instance_id,actor_kind)
SELECT ('pool_lab_'||i.pool_id||'_'||k.kind)::name,i.pool_id,i.id,k.kind
FROM pool_lab.instances i CROSS JOIN (VALUES('controller'),('operator'),('monitor')) k(kind);
INSERT INTO pool_lab.pool_workloads VALUES ('premium','text'),('premium','sites'),('premium','images'),('standard','text');

-- Uses the authenticated database login, not a caller-selected GUC/JWT/body field.
-- The restricted definer can read bindings; runtime principals cannot alter them.
CREATE FUNCTION pool_lab.scope() RETURNS TABLE(pool_id text, instance_id uuid, actor_kind text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
BEGIN
  RETURN QUERY SELECT p.pool_id,p.instance_id,p.actor_kind FROM pool_lab.principals p
    WHERE p.role_name=session_user AND p.enabled;
  IF NOT FOUND THEN RAISE EXCEPTION 'Pool authority unavailable' USING ERRCODE='42501'; END IF;
END $$;

CREATE TABLE pool_lab.accounts (
  id text PRIMARY KEY CHECK(id ~ '^fixture-[a-z0-9-]{1,60}$'),
  pool_id text NOT NULL, instance_id uuid NOT NULL,
  desktop_id uuid NOT NULL UNIQUE,
  account_class text NOT NULL, label text NOT NULL CHECK(length(btrim(label)) BETWEEN 1 AND 64),
  assignment_revision bigint NOT NULL DEFAULT 1 CHECK(assignment_revision>0),
  revision bigint NOT NULL DEFAULT 1 CHECK(revision>0), paused boolean NOT NULL DEFAULT false,
  enrolled_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  FOREIGN KEY(pool_id,account_class) REFERENCES pool_lab.pools(id,account_class),
  FOREIGN KEY(pool_id,instance_id) REFERENCES pool_lab.instances(pool_id,id),
  UNIQUE(pool_id,instance_id,id,assignment_revision)
);
-- Separate secret material from monitor metadata. This is a target shape; moving
-- existing production envelopes requires a compatible migration, not this lab.
CREATE TABLE pool_lab.credentials (
  account_id text PRIMARY KEY, pool_id text NOT NULL, instance_id uuid NOT NULL, assignment_revision bigint NOT NULL,
  envelope text NOT NULL CHECK(envelope LIKE 'fixture:%'),
  FOREIGN KEY(pool_id,instance_id,account_id,assignment_revision) REFERENCES pool_lab.accounts(pool_id,instance_id,id,assignment_revision)
);
CREATE INDEX credentials_scope ON pool_lab.credentials(pool_id,instance_id,account_id,assignment_revision);
CREATE TABLE pool_lab.capabilities (
  pool_id text NOT NULL, instance_id uuid NOT NULL, account_id text NOT NULL, assignment_revision bigint NOT NULL,
  workload text NOT NULL, verified_at timestamptz NOT NULL,
  PRIMARY KEY(account_id,workload),
  FOREIGN KEY(pool_id,instance_id,account_id,assignment_revision) REFERENCES pool_lab.accounts(pool_id,instance_id,id,assignment_revision),
  FOREIGN KEY(pool_id,workload) REFERENCES pool_lab.pool_workloads(pool_id,workload)
);
CREATE INDEX capabilities_scope ON pool_lab.capabilities(pool_id,instance_id,account_id,assignment_revision);
CREATE INDEX capabilities_workload ON pool_lab.capabilities(pool_id,workload);
CREATE TABLE pool_lab.registration_operations (
  pool_id text NOT NULL, instance_id uuid NOT NULL, operation_id uuid NOT NULL,
  digest bytea NOT NULL, account_id text NOT NULL, assignment_revision bigint NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(pool_id,instance_id,operation_id),
  FOREIGN KEY(pool_id,instance_id,account_id,assignment_revision) REFERENCES pool_lab.accounts(pool_id,instance_id,id,assignment_revision)
);
CREATE INDEX registration_account ON pool_lab.registration_operations(pool_id,instance_id,account_id,assignment_revision);
CREATE TABLE pool_lab.leases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), pool_id text NOT NULL, instance_id uuid NOT NULL,
  account_id text NOT NULL, assignment_revision bigint NOT NULL, request_id uuid NOT NULL,
  workload text NOT NULL, payload_digest text NOT NULL CHECK(payload_digest ~ '^[a-f0-9]{64}$'),
  state text NOT NULL DEFAULT 'accepted' CHECK(state IN ('accepted','unknown','completed')),
  UNIQUE(pool_id,instance_id,request_id),
  FOREIGN KEY(pool_id,instance_id,account_id,assignment_revision) REFERENCES pool_lab.accounts(pool_id,instance_id,id,assignment_revision),
  FOREIGN KEY(pool_id,workload) REFERENCES pool_lab.pool_workloads(pool_id,workload)
);
CREATE INDEX leases_account ON pool_lab.leases(pool_id,instance_id,account_id,assignment_revision);
CREATE INDEX leases_workload ON pool_lab.leases(pool_id,workload);

-- Catalogs are inaccessible to clients. The owner role is NOLOGIN/NOBYPASSRLS.
DO $$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY['pools','instances','principals','pool_workloads'] LOOP
    EXECUTE format('ALTER TABLE pool_lab.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('ALTER TABLE pool_lab.%I FORCE ROW LEVEL SECURITY',t);
    EXECUTE format('CREATE POLICY catalog_owner ON pool_lab.%I TO pool_lab_owner USING(true) WITH CHECK(true)',t);
  END LOOP;
  FOREACH t IN ARRAY ARRAY['accounts','credentials','capabilities','registration_operations','leases'] LOOP
    EXECUTE format('ALTER TABLE pool_lab.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('ALTER TABLE pool_lab.%I FORCE ROW LEVEL SECURITY',t);
    EXECUTE format('CREATE POLICY bound_instance ON pool_lab.%I USING
      ((pool_id,instance_id) = (SELECT s.pool_id,s.instance_id FROM pool_lab.scope() s))
      WITH CHECK ((pool_id,instance_id) = (SELECT s.pool_id,s.instance_id FROM pool_lab.scope() s))',t);
  END LOOP;
END $$;

CREATE FUNCTION pool_lab.register_account(p_operation uuid,p_id text,p_desktop uuid,p_class text,p_label text,p_envelope text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE s record; old_op pool_lab.registration_operations%ROWTYPE; d bytea;
BEGIN
  SELECT * INTO STRICT s FROM pool_lab.scope();
  IF s.actor_kind<>'operator' THEN RAISE EXCEPTION 'Operator authority required' USING ERRCODE='42501'; END IF;
  IF p_operation IS NULL OR p_desktop IS NULL OR p_id IS NULL OR p_class IS NULL OR p_label IS NULL
    OR p_envelope IS NULL OR p_envelope NOT LIKE 'fixture:%'
    OR NOT EXISTS(SELECT 1 FROM pool_lab.pools p WHERE p.id=s.pool_id AND p.account_class=p_class)
    THEN RAISE EXCEPTION 'Account type or registration input does not match this pool' USING ERRCODE='22023'; END IF;
  d:=sha256(convert_to(jsonb_build_array(p_id,p_desktop,p_class,p_label,p_envelope)::text,'UTF8'));
  PERFORM pg_advisory_xact_lock(hashtextextended('registration:'||s.instance_id||':'||p_operation,0));
  SELECT * INTO old_op FROM pool_lab.registration_operations WHERE operation_id=p_operation;
  IF FOUND THEN
    IF old_op.digest<>d THEN RAISE EXCEPTION 'Operation already used for another intent' USING ERRCODE='40001'; END IF;
    RETURN jsonb_build_object('status','registered','account_id',old_op.account_id);
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('account:'||p_id,0));
  BEGIN
    INSERT INTO pool_lab.accounts(id,pool_id,instance_id,desktop_id,account_class,label)
      VALUES(p_id,s.pool_id,s.instance_id,p_desktop,p_class,p_label);
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'Account cannot be registered here' USING ERRCODE='23505';
  END;
  INSERT INTO pool_lab.credentials VALUES(p_id,s.pool_id,s.instance_id,1,p_envelope);
  INSERT INTO pool_lab.registration_operations(pool_id,instance_id,operation_id,digest,account_id,assignment_revision)
    VALUES(s.pool_id,s.instance_id,p_operation,d,p_id,1);
  RETURN jsonb_build_object('status','registered','account_id',p_id);
END $$;

CREATE FUNCTION pool_lab.registration_result(p_operation uuid) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE s record; a text; BEGIN
  SELECT * INTO STRICT s FROM pool_lab.scope();
  IF s.actor_kind<>'operator' THEN RAISE EXCEPTION 'Operator authority required' USING ERRCODE='42501'; END IF;
  SELECT account_id INTO a FROM pool_lab.registration_operations WHERE operation_id=p_operation;
  RETURN CASE WHEN FOUND THEN jsonb_build_object('status','registered','account_id',a)
    ELSE jsonb_build_object('status','unknown') END;
END $$;

-- Test evidence only: no upstream execution. Standard cannot record image/Sites evidence.
CREATE FUNCTION pool_lab.record_fixture_verification(p_id text,p_workload text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE s record; a pool_lab.accounts%ROWTYPE; BEGIN
  SELECT * INTO STRICT s FROM pool_lab.scope();
  IF s.actor_kind<>'controller' THEN RAISE EXCEPTION 'Controller authority required' USING ERRCODE='42501'; END IF;
  SELECT * INTO a FROM pool_lab.accounts WHERE id=p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account unavailable' USING ERRCODE='42501'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pool_lab.pool_workloads WHERE pool_id=s.pool_id AND workload=p_workload)
    THEN RAISE EXCEPTION 'Workload not enabled' USING ERRCODE='42501'; END IF;
  INSERT INTO pool_lab.capabilities VALUES(s.pool_id,s.instance_id,p_id,a.assignment_revision,p_workload,clock_timestamp())
    ON CONFLICT(account_id,workload) DO UPDATE SET verified_at=excluded.verified_at;
END $$;

CREATE FUNCTION pool_lab.acquire(p_request uuid,p_account text,p_workload text,p_digest text,p_revision bigint)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE s record; a pool_lab.accounts%ROWTYPE; old_lease pool_lab.leases%ROWTYPE; result uuid;
BEGIN
  SELECT * INTO STRICT s FROM pool_lab.scope();
  IF s.actor_kind<>'controller' THEN RAISE EXCEPTION 'Controller authority required' USING ERRCODE='42501'; END IF;
  IF p_request IS NULL OR p_digest IS NULL OR p_digest !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Invalid request' USING ERRCODE='22023'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('request:'||s.instance_id||':'||p_request,0));
  SELECT * INTO old_lease FROM pool_lab.leases WHERE request_id=p_request;
  IF FOUND THEN
    IF ROW(old_lease.account_id,old_lease.workload,old_lease.payload_digest) IS DISTINCT FROM ROW(p_account,p_workload,p_digest)
      THEN RAISE EXCEPTION 'Request already used for another intent' USING ERRCODE='40001'; END IF;
    RETURN old_lease.id; -- Preserve accepted/unknown work even after pausing new admission.
  END IF;
  IF NOT EXISTS(SELECT 1 FROM pool_lab.pool_workloads WHERE pool_id=s.pool_id AND workload=p_workload)
    THEN RAISE EXCEPTION 'Workload not enabled' USING ERRCODE='42501'; END IF;
  PERFORM 1 FROM pool_lab.pools WHERE id=s.pool_id AND admit_new FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'New work paused' USING ERRCODE='55000'; END IF;
  SELECT * INTO a FROM pool_lab.accounts WHERE id=p_account FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account unavailable' USING ERRCODE='42501'; END IF;
  IF a.revision IS DISTINCT FROM p_revision THEN RAISE EXCEPTION 'Refresh account state' USING ERRCODE='40001'; END IF;
  IF a.paused THEN RAISE EXCEPTION 'New work paused' USING ERRCODE='55000'; END IF;
  IF NOT EXISTS(SELECT 1 FROM pool_lab.capabilities WHERE account_id=p_account AND workload=p_workload
    AND verified_at>clock_timestamp()-interval '5 minutes') THEN RAISE EXCEPTION 'Fresh verification required' USING ERRCODE='55000'; END IF;
  INSERT INTO pool_lab.leases(pool_id,instance_id,account_id,assignment_revision,request_id,workload,payload_digest)
    VALUES(s.pool_id,s.instance_id,p_account,a.assignment_revision,p_request,p_workload,p_digest) RETURNING id INTO result;
  RETURN result;
END $$;

CREATE FUNCTION pool_lab.set_paused(p_account text,p_paused boolean,p_revision bigint) RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,pg_temp AS $$
DECLARE s record; result bigint; BEGIN
  SELECT * INTO STRICT s FROM pool_lab.scope();
  IF s.actor_kind<>'operator' THEN RAISE EXCEPTION 'Operator authority required' USING ERRCODE='42501'; END IF;
  IF p_paused IS NULL THEN RAISE EXCEPTION 'Explicit desired state required' USING ERRCODE='22023'; END IF;
  UPDATE pool_lab.accounts SET paused=p_paused,revision=revision+1 WHERE id=p_account AND revision=p_revision RETURNING revision INTO result;
  IF NOT FOUND THEN RAISE EXCEPTION 'Account changed or unavailable' USING ERRCODE='40001'; END IF;
  RETURN result;
END $$;

-- Two namespaces for familiar operator discovery. Privileges and RLS enforce isolation.
CREATE VIEW relay_premium.accounts WITH(security_invoker=true) AS
  SELECT id,label,pool_id,instance_id,account_class,revision,paused,enrolled_at FROM pool_lab.accounts WHERE pool_id='premium';
CREATE VIEW relay_standard.accounts WITH(security_invoker=true) AS
  SELECT id,label,pool_id,instance_id,account_class,revision,paused,enrolled_at FROM pool_lab.accounts WHERE pool_id='standard';
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA pool_lab FROM PUBLIC;
DO $$ DECLARE p text; k text; r text; BEGIN
  FOREACH p IN ARRAY ARRAY['premium','standard'] LOOP
    FOREACH k IN ARRAY ARRAY['controller','operator','monitor'] LOOP
      r:='pool_lab_'||p||'_'||k;
      EXECUTE format('GRANT USAGE ON SCHEMA pool_lab,relay_%I TO %I',p,r);
      EXECUTE format('GRANT SELECT ON relay_%I.accounts TO %I',p,r);
      EXECUTE format('GRANT SELECT(id,label,pool_id,instance_id,account_class,revision,paused,enrolled_at) ON pool_lab.accounts TO %I',r);
      EXECUTE format('GRANT EXECUTE ON FUNCTION pool_lab.scope() TO %I',r);
      IF k='operator' THEN
        EXECUTE format('GRANT EXECUTE ON FUNCTION pool_lab.register_account(uuid,text,uuid,text,text,text),pool_lab.registration_result(uuid),pool_lab.set_paused(text,boolean,bigint) TO %I',r);
      ELSIF k='controller' THEN
        EXECUTE format('GRANT SELECT ON pool_lab.credentials,pool_lab.capabilities,pool_lab.leases TO %I',r);
        EXECUTE format('GRANT EXECUTE ON FUNCTION pool_lab.record_fixture_verification(text,text),pool_lab.acquire(uuid,text,text,text,bigint) TO %I',r);
      END IF;
    END LOOP;
  END LOOP;
END $$;
RESET ROLE;
