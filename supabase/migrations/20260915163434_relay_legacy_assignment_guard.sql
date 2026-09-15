-- HIGH: close legacy desktop mutations after immutable pool assignment.
-- No account rows or history are deleted. Function DDL is transactional.
SET LOCAL lock_timeout = '5s';
ALTER FUNCTION private.enroll_desktop_shard(uuid,jsonb,jsonb) RENAME TO relay_base_enroll_desktop;
ALTER FUNCTION private.refresh_desktop_shard(uuid,text,jsonb,jsonb) RENAME TO relay_base_refresh_desktop;
REVOKE ALL ON FUNCTION private.relay_base_enroll_desktop(uuid,jsonb,jsonb), private.relay_base_refresh_desktop(uuid,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role,galx_relay_control;

CREATE FUNCTION private.enroll_desktop_shard(p_desktop_id uuid,p_row jsonb,p_expected jsonb DEFAULT NULL)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_row->>'id',0));
  IF EXISTS(SELECT FROM private.galx_relay_account_assignments WHERE account_id=p_row->>'id') THEN
    RAISE EXCEPTION 'Scoped relay registration required' USING ERRCODE='42501'; END IF;
  RETURN private.relay_base_enroll_desktop(p_desktop_id,p_row,p_expected);
END $$;
CREATE FUNCTION private.refresh_desktop_shard(p_desktop_id uuid,p_id text,p_expected jsonb,p_next jsonb)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$ BEGIN
  -- Serialize with initial enrollment/assignment as well as later credential writes.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_id,0));
  IF EXISTS(SELECT FROM private.galx_relay_account_assignments WHERE account_id=p_id) THEN
    RAISE EXCEPTION 'Scoped relay registration required' USING ERRCODE='42501'; END IF;
  RETURN private.relay_base_refresh_desktop(p_desktop_id,p_id,p_expected,p_next);
END $$;
REVOKE ALL ON FUNCTION private.enroll_desktop_shard(uuid,jsonb,jsonb),private.refresh_desktop_shard(uuid,text,jsonb,jsonb) FROM PUBLIC,anon,authenticated,service_role,galx_relay_control;
GRANT EXECUTE ON FUNCTION private.enroll_desktop_shard(uuid,jsonb,jsonb),private.refresh_desktop_shard(uuid,text,jsonb,jsonb) TO postgres;
-- Preserve the reviewed scoped protocol and all of its role/revision/ticket checks.
DO $$ DECLARE definition text; BEGIN
  definition:=pg_get_functiondef('private.relay_control(text,text,jsonb)'::regprocedure);
  IF position('private.enroll_desktop_shard(' IN definition)=0 OR position('private.refresh_desktop_shard(' IN definition)=0 THEN
    RAISE EXCEPTION 'Unexpected relay protocol definition'; END IF;
  EXECUTE replace(replace(definition,'private.enroll_desktop_shard(','private.relay_base_enroll_desktop('),'private.refresh_desktop_shard(','private.relay_base_refresh_desktop(');
END $$;
