-- Private connection lifecycle. No automatic cleanup, registration or execution activation.
SET LOCAL lock_timeout='5s';
SET LOCAL statement_timeout='30s';
ALTER TABLE public.galx_shard_accounts ADD COLUMN IF NOT EXISTS credential_retired_at timestamptz;
ALTER TABLE private.galx_relay_account_control ADD COLUMN IF NOT EXISTS connection_state text NOT NULL DEFAULT 'connected' CHECK(connection_state IN ('connected','sign_in_required'));
ALTER TABLE private.galx_relay_account_control ADD COLUMN IF NOT EXISTS rejected_credential_revision text;
ALTER TABLE private.galx_relay_account_control ADD COLUMN IF NOT EXISTS connection_checked_at timestamptz;

-- Retired legacy credential material cannot be restored by an old writer or enrollment path.
CREATE FUNCTION private.guard_retired_shard_credentials() RETURNS trigger
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 IF OLD.credential_retired_at IS NOT NULL AND ROW(NEW.id,NEW.credential_retired_at,NEW.managed_desktop_id,NEW.desktop_enrolled_at,NEW.permission_retracted,NEW.encrypted_ciphertext,NEW.encrypted_iv,NEW.encrypted_tag,NEW.key_version,NEW.credential_expires_at_ms,NEW.relay_pool_id,NEW.provider,NEW.user_id)
 IS DISTINCT FROM ROW(OLD.id,OLD.credential_retired_at,OLD.managed_desktop_id,OLD.desktop_enrolled_at,OLD.permission_retracted,OLD.encrypted_ciphertext,OLD.encrypted_iv,OLD.encrypted_tag,OLD.key_version,OLD.credential_expires_at_ms,OLD.relay_pool_id,OLD.provider,OLD.user_id) THEN
  RAISE EXCEPTION 'Retired credentials cannot be restored' USING ERRCODE='42501';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION private.guard_retired_shard_credentials() FROM PUBLIC,anon,authenticated,service_role,galx_relay_control;
CREATE TRIGGER guard_retired_shard_credentials BEFORE UPDATE ON public.galx_shard_accounts FOR EACH ROW EXECUTE FUNCTION private.guard_retired_shard_credentials();

-- Narrow writer helper; the owner-only wrapper validates dependencies while holding row locks.
CREATE FUNCTION private.retire_legacy_credential_material(p_ids text[]) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE n integer;
BEGIN
 UPDATE public.galx_shard_accounts SET credential_retired_at=clock_timestamp(),permission_retracted=true,
  encrypted_ciphertext='',encrypted_iv='',encrypted_tag='',credential_expires_at_ms=0,updated_at=clock_timestamp()
 WHERE id=ANY(p_ids) AND credential_retired_at IS NULL AND managed_desktop_id IS NULL AND relay_pool_id IS NULL AND COALESCE(active_in_flight_count,0)=0;
 GET DIAGNOSTICS n=ROW_COUNT;RETURN n;
END $$;
-- Production removes schema CREATE from this no-login writer after provisioning.
-- Ownership transfer requires it briefly, within this migration transaction only.
GRANT CREATE ON SCHEMA private TO galx_desktop_writer;
ALTER FUNCTION private.retire_legacy_credential_material(text[]) OWNER TO galx_desktop_writer;
REVOKE CREATE ON SCHEMA private FROM galx_desktop_writer;
REVOKE ALL ON FUNCTION private.retire_legacy_credential_material(text[]) FROM PUBLIC,anon,authenticated,service_role,galx_relay_control;
GRANT EXECUTE ON FUNCTION private.retire_legacy_credential_material(text[]) TO postgres;
CREATE FUNCTION private.retire_legacy_credentials(p_ids text[]) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE n integer;
BEGIN
 IF cardinality(p_ids) IS NULL OR cardinality(p_ids) NOT BETWEEN 1 AND 2048 OR array_position(p_ids,NULL) IS NOT NULL OR cardinality(p_ids)<>(SELECT count(DISTINCT x) FROM unnest(p_ids) x) THEN RAISE EXCEPTION 'Invalid retirement set' USING ERRCODE='22023';END IF;
 PERFORM 1 FROM public.galx_shard_accounts WHERE id=ANY(p_ids) ORDER BY id FOR UPDATE;
 SELECT count(*) INTO n FROM public.galx_shard_accounts WHERE id=ANY(p_ids) AND provider='openai' AND managed_desktop_id IS NULL AND relay_pool_id IS NULL AND COALESCE(active_in_flight_count,0)=0;
 IF n<>cardinality(p_ids) OR EXISTS(SELECT 1 FROM private.galx_relay_account_assignments WHERE account_id=ANY(p_ids))
 OR EXISTS(SELECT 1 FROM public.galx_shard_leases WHERE shard_id=ANY(p_ids) AND NOT is_committed AND NOT is_reclaimed AND expires_at_ms>(extract(epoch FROM clock_timestamp())*1000)::bigint)
 THEN RAISE EXCEPTION 'Legacy credentials are still in use' USING ERRCODE='42501';END IF;
 RETURN private.retire_legacy_credential_material(p_ids);
END $$;
REVOKE ALL ON FUNCTION private.retire_legacy_credentials(text[]) FROM PUBLIC,anon,authenticated,service_role,galx_desktop_writer,galx_relay_control;
GRANT EXECUTE ON FUNCTION private.retire_legacy_credentials(text[]) TO postgres;

-- The management replacement accidentally reinstated the legacy assignment guards
-- inside the scoped protocol. Keep those guards at the legacy entry points only.
DO $$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('private.relay_control(text,text,jsonb)'::regprocedure) INTO definition;
 IF position('private.refresh_desktop_shard(' IN definition)=0 THEN RAISE EXCEPTION 'Unexpected relay protocol definition';END IF;
 EXECUTE replace(replace(definition,'private.enroll_desktop_shard(','private.relay_base_enroll_desktop('),'private.refresh_desktop_shard(','private.relay_base_refresh_desktop(');
END $$;
ALTER FUNCTION private.relay_control(text,text,jsonb) RENAME TO relay_control_before_connections;
REVOKE ALL ON FUNCTION private.relay_control_before_connections(text,text,jsonb) FROM PUBLIC,anon,authenticated,service_role,galx_relay_control;
CREATE FUNCTION private.relay_control(p_token_sha256 text,p_action text,p_body jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE principal jsonb; result jsonb; r private.galx_relay_registrations%ROWTYPE;
 c private.galx_relay_account_control%ROWTYPE; i private.galx_relay_installation_runtime%ROWTYPE; a private.galx_relay_account_assignments%ROWTYPE;
BEGIN
 principal:=private.relay_control_before_connections(p_token_sha256,'authenticate',p_body);
 IF p_action='ticket' AND p_body->>'purpose'='connect' THEN
  RETURN private.relay_control_before_connections(p_token_sha256,'ticket',p_body||jsonb_build_object('purpose','review'));
 END IF;
 IF p_action='registration_context' THEN
  result:=private.relay_control_before_connections(p_token_sha256,p_action,CASE WHEN p_body->>'purpose'='connect' THEN p_body||jsonb_build_object('purpose','review') ELSE p_body END);
  RETURN result||jsonb_build_object('accounts',COALESCE((SELECT jsonb_agg(x) FROM jsonb_array_elements(result->'accounts') x JOIN public.galx_shard_accounts s ON s.id=x->>'id' WHERE s.credential_retired_at IS NULL),'[]'::jsonb));
 END IF;
 IF p_action='connect' THEN
  IF principal->>'kind'<>'registrar' THEN RAISE EXCEPTION 'Registrar required' USING ERRCODE='42501';END IF;
  -- Existing base functions verify ticket, scope, removal, class, fingerprint and encrypted revision.
  result:=private.relay_control_before_connections(p_token_sha256,'review',p_body||jsonb_build_object('purpose','review'));
  UPDATE private.galx_relay_registrations SET ticket_sha256=p_body->>'ticketSha256',ticket_purpose='register',ticket_expires_at=clock_timestamp()+interval '1 minute' WHERE id=(p_body->>'id')::uuid;
  result:=private.relay_control_before_connections(p_token_sha256,'register',p_body||jsonb_build_object('purpose','register'));
  UPDATE private.galx_relay_account_control SET connection_checked_at=clock_timestamp() WHERE account_id=result->>'accountId';
  RETURN result;
 END IF;
 IF p_action='refresh' THEN
  -- Authorize and lock the original registration before inspecting account connection state.
  result:=private.relay_control_before_connections(p_token_sha256,'registration_context',p_body);
  PERFORM 1 FROM public.galx_shard_accounts WHERE id=result->>'accountId' FOR UPDATE;
  SELECT * INTO c FROM private.galx_relay_account_control WHERE account_id=result->>'accountId' FOR UPDATE;
  IF c.connection_state='sign_in_required' AND c.rejected_credential_revision=p_body->>'credentialRevision' THEN RAISE EXCEPTION 'Fresh sign-in required' USING ERRCODE='GR001';END IF;
  result:=private.relay_control_before_connections(p_token_sha256,p_action,p_body);
  UPDATE private.galx_relay_account_control SET connection_state='connected',rejected_credential_revision=NULL,connection_checked_at=clock_timestamp() WHERE account_id=result->>'accountId';
  RETURN result;
 END IF;
 IF p_action='credential_failed' THEN
  IF principal->>'kind'<>'runtime' THEN RAISE EXCEPTION 'Runtime required' USING ERRCODE='42501';END IF;
  SELECT * INTO i FROM private.galx_relay_installation_runtime WHERE installation_id=(principal->>'installationId')::uuid FOR SHARE;
  IF i.owner_epoch IS DISTINCT FROM (p_body->>'epoch')::uuid OR i.last_seen_at IS NULL OR i.last_seen_at<clock_timestamp()-interval '45 seconds' THEN RAISE EXCEPTION 'Stale runtime' USING ERRCODE='42501';END IF;
  SELECT * INTO a FROM private.galx_relay_account_assignments WHERE account_id=p_body->>'accountId' AND installation_id=i.installation_id AND pool_id=principal->>'pool';
  IF NOT FOUND THEN RAISE EXCEPTION 'Account unavailable' USING ERRCODE='42501';END IF;
  SELECT * INTO c FROM private.galx_relay_account_control WHERE account_id=a.account_id FOR UPDATE;
  IF c.credential_revision IS DISTINCT FROM p_body->>'credentialRevision' OR c.desired_revision IS DISTINCT FROM (p_body->>'revision')::bigint THEN RETURN jsonb_build_object('recorded',false);END IF;
  IF c.removed_at IS NULL AND c.desired_state<>'revoked' AND c.connection_state<>'sign_in_required' THEN
   UPDATE private.galx_relay_account_control SET connection_state='sign_in_required',rejected_credential_revision=credential_revision,desired_revision=desired_revision+1,updated_at=clock_timestamp() WHERE account_id=a.account_id;
  END IF;
  RETURN jsonb_build_object('recorded',true);
 END IF;
 IF p_action IN ('acquire','renew') AND EXISTS(SELECT 1 FROM private.galx_relay_account_control WHERE account_id=p_body->>'accountId' AND connection_state='sign_in_required') THEN RAISE EXCEPTION 'Reconnect required' USING ERRCODE='42501';END IF;
 result:=private.relay_control_before_connections(p_token_sha256,p_action,p_body);
 IF p_action IN ('status','projection') THEN
  result:=result||jsonb_build_object('accounts',COALESCE((SELECT jsonb_agg(CASE WHEN p_action='projection' AND control_row.connection_state='sign_in_required' THEN x||jsonb_build_object('envelope',NULL) ELSE x END || jsonb_build_object('connectionState',control_row.connection_state,'connectionCheckedAt',control_row.connection_checked_at))
   FROM jsonb_array_elements(result->'accounts') x JOIN private.galx_relay_account_control control_row ON control_row.account_id=x->>'id'),'[]'::jsonb));
 END IF;
 RETURN result;
END $$;
REVOKE ALL ON FUNCTION private.relay_control(text,text,jsonb) FROM PUBLIC,anon,authenticated,service_role,galx_desktop_writer;
GRANT EXECUTE ON FUNCTION private.relay_control(text,text,jsonb) TO galx_relay_control;
COMMENT ON COLUMN public.galx_shard_accounts.credential_retired_at IS 'Purged legacy credential tombstone. IDs and operational history remain; never eligible for enrollment or execution.';
