-- ============================================================================
-- GALXAI: PostgreSQL Bulk Array Resolution & Batch Audit Mesh
-- Version: 30.0.0
-- Standards: Bulk array multi-key resolution for DataLoader patterns,
-- and high-velocity bulk audit event ingestion.
-- ============================================================================

-- 1. MULTI-USER WALLET ARRAY RESOLUTION (DATA-LOADER COALESCING)
CREATE OR REPLACE FUNCTION fn_batch_get_wallets_by_users(
    p_user_ids VARCHAR[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_results JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'found', true,
            'id', w.id,
            'user_id', w.user_id,
            'workspace_id', w.workspace_id,
            'balance_usd', w.balance_usd,
            'introductory_grant_usd', w.introductory_grant_usd,
            'deposited_total_usd', w.deposited_total_usd,
            'promotional_match_usd', w.promotional_match_usd,
            'lifetime_spent_usd', w.lifetime_spent_usd,
            'auto_reload_enabled', w.auto_reload_enabled,
            'auto_reload_threshold_usd', w.auto_reload_threshold_usd,
            'auto_reload_amount_usd', w.auto_reload_amount_usd,
            'auto_reload_payment_method_id', w.auto_reload_payment_method_id,
            'proof_of_deposit_verified', w.proof_of_deposit_verified,
            'verified_at', w.verified_at,
            'created_at', w.created_at,
            'updated_at', w.updated_at
        )
    ), '[]'::jsonb) INTO v_results
    FROM galx_wallets w
    WHERE w.user_id = ANY(p_user_ids);

    RETURN v_results;
END;
$$;

-- 2. MULTI-HASH DEVELOPER KEY ARRAY RESOLUTION (DATA-LOADER COALESCING)
CREATE OR REPLACE FUNCTION fn_batch_get_developer_keys_by_hashes(
    p_key_hashes VARCHAR[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_results JSONB;
BEGIN
    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', k.id,
            'name', k.name,
            'user_id', k.user_id,
            'workspace_id', k.workspace_id,
            'prefix', k.prefix,
            'key_hash', k.key_hash,
            'rate_limit_per_minute', k.rate_limit_per_minute,
            'spend_cap_usd', k.spend_cap_usd,
            'current_spend_usd', k.current_spend_usd,
            'allowed_models', k.allowed_models,
            'is_revoked', k.is_revoked,
            'created_at', k.created_at,
            'last_used_at', k.last_used_at
        )
    ), '[]'::jsonb) INTO v_results
    FROM galx_developer_keys k
    WHERE k.key_hash = ANY(p_key_hashes)
      AND k.is_revoked = false;

    RETURN v_results;
END;
$$;

-- 3. BULK AUDIT EVENT INGESTION PROCEDURE (HIGH VELOCITY JSONB_TO_RECORDSET)
CREATE OR REPLACE FUNCTION fn_batch_record_audit_events(
    p_events JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_inserted_count INTEGER;
BEGIN
    WITH inserted_rows AS (
        INSERT INTO galx_audit_logs (
            id,
            workspace_id,
            user_id,
            shard_id,
            action,
            resource_type,
            resource_id,
            metadata,
            ip_address,
            user_agent,
            timestamp_ms
        )
        SELECT 
            COALESCE(e.id, 'audit_' || CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT) || '_' || substr(md5(random()::text), 1, 6)),
            (e.workspace_id)::uuid,
            e.user_id,
            e.shard_id,
            e.action,
            e.resource_type,
            e.resource_id,
            COALESCE(e.metadata, '{}'::jsonb),
            e.ip_address,
            e.user_agent,
            COALESCE(e.timestamp_ms, CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT))
        FROM jsonb_to_recordset(p_events) AS e (
            id text,
            workspace_id text,
            user_id text,
            shard_id text,
            action text,
            resource_type text,
            resource_id text,
            metadata jsonb,
            ip_address text,
            user_agent text,
            timestamp_ms bigint
        )
        RETURNING id
    )
    SELECT COUNT(*) INTO v_inserted_count FROM inserted_rows;

    RETURN jsonb_build_object(
        'success', true,
        'inserted_events_count', v_inserted_count,
        'timestamp', NOW()
    );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION fn_batch_get_wallets_by_users(VARCHAR[]) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION fn_batch_get_developer_keys_by_hashes(VARCHAR[]) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION fn_batch_record_audit_events(JSONB) TO authenticated, service_role, anon;
