-- Verified installations may activate themselves; manual closure always disarms automation.
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
ALTER TABLE private.galx_relay_installation_runtime
 ADD COLUMN automatic_activation boolean NOT NULL DEFAULT false;

-- Owner-only installation configuration remains the emergency stop. Existing callers
-- cannot accidentally leave automation armed after closing or manually changing gates.
ALTER FUNCTION private.relay_configure_installation(text,uuid,uuid,jsonb,boolean,boolean,text)
 RENAME TO relay_configure_installation_before_automatic;
REVOKE ALL ON FUNCTION private.relay_configure_installation_before_automatic(text,uuid,uuid,jsonb,boolean,boolean,text)
 FROM PUBLIC,anon,authenticated,service_role,galx_desktop_writer,galx_relay_control;
CREATE FUNCTION private.relay_configure_installation(p_pool text,p_installation uuid,p_host uuid,p_principals jsonb,p_registration boolean DEFAULT false,p_execution boolean DEFAULT false,p_evidence_sha256 text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
 PERFORM private.relay_configure_installation_before_automatic(p_pool,p_installation,p_host,p_principals,p_registration,p_execution,p_evidence_sha256);
 UPDATE private.galx_relay_installation_runtime SET automatic_activation=false WHERE installation_id=p_installation;
END $$;
REVOKE ALL ON FUNCTION private.relay_configure_installation(text,uuid,uuid,jsonb,boolean,boolean,text)
 FROM PUBLIC,anon,authenticated,service_role,galx_desktop_writer,galx_relay_control;

-- Internal policy evaluator. Lock the installation before any account/registration
-- mutation; close and reconcile serialize on the same row. No network calls or peer dependencies.
CREATE FUNCTION private.relay_reconcile_activation(p_installation uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE i private.galx_relay_installation_runtime%ROWTYPE;
BEGIN
 SELECT * INTO i FROM private.galx_relay_installation_runtime WHERE installation_id=p_installation FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Installation unavailable' USING ERRCODE='42501';END IF;
 IF NOT i.execution_allowed AND i.automatic_activation AND i.registration_allowed
  AND i.isolation_evidence_sha256 IS NOT NULL AND i.owner_epoch IS NOT NULL
  AND i.last_seen_at<=clock_timestamp() AND i.last_seen_at>clock_timestamp()-interval '45 seconds'
  AND EXISTS(
   SELECT 1 FROM private.galx_relay_account_assignments a
   JOIN private.galx_relay_account_control c ON c.account_id=a.account_id
   JOIN public.galx_shard_accounts s ON s.id=a.account_id
   JOIN private.galx_relay_registrations r ON r.id=a.registration_operation_id
   WHERE a.installation_id=p_installation AND r.installation_id=a.installation_id AND r.pool_id=a.pool_id
    AND r.state='registered' AND r.removed_at IS NULL AND c.removed_at IS NULL
    AND c.desired_state='enabled' AND c.connection_state='connected'
    AND c.connection_checked_at IS NOT NULL AND c.connection_checked_at<=clock_timestamp()
    AND c.account_class=CASE WHEN a.pool_id='premium' THEN 'paid' ELSE 'free' END
    AND jsonb_array_length(c.models)>0 AND NOT s.permission_retracted AND s.credential_retired_at IS NULL
    AND s.status::text NOT IN ('revoked','dead','quarantined','paused')
    AND s.credential_expires_at_ms>(extract(epoch FROM clock_timestamp())*1000)::bigint+30000
  ) THEN
  UPDATE private.galx_relay_installation_runtime SET execution_allowed=true WHERE installation_id=p_installation;
  RETURN true;
 END IF;
 RETURN i.execution_allowed;
END $$;
REVOKE ALL ON FUNCTION private.relay_reconcile_activation(uuid)
 FROM PUBLIC,anon,authenticated,service_role,galx_desktop_writer,galx_relay_control;

-- The verified installer supplies evidence once. Arming never enables existing paused accounts.
CREATE FUNCTION private.relay_configure_automatic_activation(p_pool text,p_installation uuid,p_host uuid,p_evidence_sha256 text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE enabled boolean;
BEGIN
 IF p_evidence_sha256 IS NULL OR p_evidence_sha256 !~ '^[a-f0-9]{64}$' THEN RAISE EXCEPTION 'Verification required' USING ERRCODE='22023';END IF;
 -- Same installation -> runtime lock order as the owner configuration function.
 PERFORM 1 FROM private.galx_relay_installations WHERE id=p_installation FOR UPDATE;
 SELECT execution_allowed INTO enabled FROM private.galx_relay_installation_runtime WHERE installation_id=p_installation FOR UPDATE;
 IF NOT FOUND THEN RAISE EXCEPTION 'Installation unavailable' USING ERRCODE='42501';END IF;
 PERFORM private.relay_configure_installation(p_pool,p_installation,p_host,'[]'::jsonb,true,enabled,p_evidence_sha256);
 UPDATE private.galx_relay_installation_runtime SET automatic_activation=true WHERE installation_id=p_installation;
 RETURN private.relay_reconcile_activation(p_installation);
END $$;
REVOKE ALL ON FUNCTION private.relay_configure_automatic_activation(text,uuid,uuid,text)
 FROM PUBLIC,anon,authenticated,service_role,galx_desktop_writer,galx_relay_control;

ALTER FUNCTION private.relay_control(text,text,jsonb) RENAME TO relay_control_before_automatic;
REVOKE ALL ON FUNCTION private.relay_control_before_automatic(text,text,jsonb)
 FROM PUBLIC,anon,authenticated,service_role,galx_desktop_writer,galx_relay_control;
CREATE FUNCTION private.relay_control(p_token_sha256 text,p_action text,p_body jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE principal jsonb; result jsonb; automatic boolean; activated boolean; account text; revision bigint;
BEGIN
 principal:=private.relay_control_before_automatic(p_token_sha256,'authenticate',p_body);
 -- The base protocol still authenticates the role, scope, ticket, epoch and revision.
 -- Take the installation lock first for paths that can reconcile or change intent.
 IF p_action IN ('connect','register','refresh','claim','heartbeat','set_account','manage_registration','credential_failed') THEN
  PERFORM 1 FROM private.galx_relay_installations WHERE id=(principal->>'installationId')::uuid FOR KEY SHARE;
  SELECT automatic_activation INTO automatic FROM private.galx_relay_installation_runtime
   WHERE installation_id=(principal->>'installationId')::uuid FOR UPDATE;
 END IF;
 result:=private.relay_control_before_automatic(p_token_sha256,p_action,p_body);
 IF p_action IN ('connect','register') AND principal->>'kind'='registrar' AND result->>'state'='registered' AND NOT COALESCE((result->>'replayed')::boolean,false) THEN
  account:=result->>'accountId';
  UPDATE private.galx_relay_account_control SET connection_checked_at=clock_timestamp() WHERE account_id=account;
  IF automatic THEN
   UPDATE private.galx_relay_account_control SET desired_state='enabled',desired_revision=desired_revision+1,updated_at=clock_timestamp()
    WHERE account_id=account AND desired_state='paused' AND removed_at IS NULL AND connection_state='connected'
    RETURNING desired_revision INTO revision;
   IF revision IS NOT NULL THEN
    INSERT INTO private.galx_relay_control_operations(id,actor_id,pool_id,installation_id,account_id,command,request_sha256,saved_revision)
     VALUES(gen_random_uuid(),(principal->>'actorId')::uuid,principal->>'pool',(principal->>'installationId')::uuid,account,'enabled',p_body->>'credentialRevision',revision);
   END IF;
  END IF;
 END IF;
 IF p_action IN ('connect','register','refresh','claim','heartbeat','set_account') THEN
  activated:=private.relay_reconcile_activation((principal->>'installationId')::uuid);
  IF p_action IN ('claim','heartbeat') THEN result:=result||jsonb_build_object('executionAllowed',activated);END IF;
 END IF;
 IF p_action='status' THEN
  SELECT automatic_activation INTO automatic FROM private.galx_relay_installation_runtime WHERE installation_id=(principal->>'installationId')::uuid;
  result:=result||jsonb_build_object('automaticActivation',automatic);
 END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION private.relay_control(text,text,jsonb) FROM PUBLIC,anon,authenticated,service_role,galx_desktop_writer;
GRANT EXECUTE ON FUNCTION private.relay_control(text,text,jsonb) TO galx_relay_control;
COMMENT ON COLUMN private.galx_relay_installation_runtime.automatic_activation IS 'Verified installer policy: new manual connections enable atomically and own-runtime heartbeats reconcile activation. Explicit gate configuration disarms. Existing pauses are retained.';
