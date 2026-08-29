-- ============================================================================
-- GALXAI: PostgreSQL Multi-RPC Multiplexer & Enterprise Hierarchy Mesh
-- Version: 36.0.0
-- Standards: Heterogenous Multi-RPC Batch Dispatcher & Complete 1-Hop
-- Organizational Graph Hydration Substrate.
-- ============================================================================

-- 1. HETEROGENOUS MULTI-RPC BATCH DISPATCHER (N-IN-1 NETWORK ROUNDTRIP)
CREATE OR REPLACE FUNCTION fn_batch_multi_rpc_dispatch(
    p_calls JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_call RECORD;
    v_results JSONB := '[]'::jsonb;
    v_item_result JSONB;
    v_call_name VARCHAR(64);
    v_call_id VARCHAR(64);
    v_args JSONB;
BEGIN
    FOR v_call IN
        SELECT
            (item->>'id')::VARCHAR(64) AS call_id,
            (item->>'procedure')::VARCHAR(64) AS procedure_name,
            COALESCE((item->>'args')::jsonb, '{}'::jsonb) AS args
        FROM jsonb_array_elements(p_calls) AS item
    LOOP
        v_call_id := v_call.call_id;
        v_call_name := v_call.procedure_name;
        v_args := v_call.args;

        -- Safe dynamic routing for allowed high-frequency RPCs
        IF v_call_name = 'get_wallet' THEN
            SELECT fn_get_wallet_by_user((v_args->>'user_id')::VARCHAR) INTO v_item_result;
        ELSIF v_call_name = 'get_workspace' THEN
            SELECT fn_get_workspace_composite_state((v_args->>'workspace_id')::UUID) INTO v_item_result;
        ELSIF v_call_name = 'verify_tokens' THEN
            SELECT fn_batch_verify_tokens(ARRAY(SELECT jsonb_array_elements_text(v_args->'token_hashes'))) INTO v_item_result;
        ELSIF v_call_name = 'verify_merkle' THEN
            SELECT fn_verify_merkle_chain_window((v_args->>'wallet_id')::UUID, COALESCE((v_args->>'limit')::INTEGER, 100)) INTO v_item_result;
        ELSIF v_call_name = 'route_model' THEN
            SELECT fn_route_model_atomic_eval((v_args->>'workspace_id')::UUID, (v_args->>'requested_model')::VARCHAR) INTO v_item_result;
        ELSE
            v_item_result := jsonb_build_object('success', false, 'error', 'UNSUPPORTED_PROCEDURE');
        END IF;

        v_results := v_results || jsonb_build_object(
            'id', v_call_id,
            'procedure', v_call_name,
            'result', v_item_result
        );
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'total_calls_executed', jsonb_array_length(v_results),
        'results', v_results,
        'executed_at', NOW()
    );
END;
$$;

-- 2. FULL ORGANIZATIONAL HIERARCHY HYDRATION (1-HOP ENTERPRISE GRAPH)
DROP FUNCTION IF EXISTS fn_get_organization_full_hierarchy_state(UUID);

CREATE OR REPLACE FUNCTION fn_get_organization_full_hierarchy_state(
    p_org_id VARCHAR(64)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_org JSONB;
    v_members JSONB;
    v_cost_centers JSONB;
    v_spend_policies JSONB;
    v_canaries JSONB;
BEGIN
    -- 1. Organization Metadata
    SELECT to_jsonb(o.*) INTO v_org
    FROM galx_organizations o
    WHERE o.id = p_org_id;

    IF v_org IS NULL THEN
        RETURN jsonb_build_object(
            'success', false,
            'error_code', 'ORGANIZATION_NOT_FOUND'
        );
    END IF;

    -- 2. Members & Roles
    SELECT COALESCE(jsonb_agg(to_jsonb(m.*)), '[]'::jsonb) INTO v_members
    FROM galx_organization_members m
    WHERE m.org_id = p_org_id;

    -- 3. Team Cost Centers
    SELECT COALESCE(jsonb_agg(to_jsonb(tc.*)), '[]'::jsonb) INTO v_cost_centers
    FROM galx_team_cost_centers tc
    WHERE tc.org_id = p_org_id;

    -- 4. Governance Audit Events
    SELECT COALESCE(jsonb_agg(to_jsonb(ae.*)), '[]'::jsonb) INTO v_spend_policies
    FROM galx_governance_audit_events ae
    WHERE ae.org_id = p_org_id;

    -- 5. Synthetic Canaries
    SELECT COALESCE(jsonb_agg(to_jsonb(sc.*)), '[]'::jsonb) INTO v_canaries
    FROM (
        SELECT *
        FROM galx_synthetic_canary_probes
        ORDER BY created_at DESC
        LIMIT 20
    ) sc;

    RETURN jsonb_build_object(
        'success', true,
        'organization', v_org,
        'members', v_members,
        'cost_centers', v_cost_centers,
        'governance_audit_events', v_spend_policies,
        'canaries', v_canaries,
        'hydrated_at', NOW()
    );
END;
$$;

-- 3. SECURITY DEFINER CREATE ORGANIZATION PROCEDURE
CREATE OR REPLACE FUNCTION fn_create_organization(
    p_id VARCHAR(64),
    p_name VARCHAR(255),
    p_slug VARCHAR(128),
    p_tier VARCHAR(32) DEFAULT 'small-business',
    p_seat_capacity INT DEFAULT 10,
    p_billing_email VARCHAR(255) DEFAULT 'billing@galxai.dev'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_org galx_organizations%ROWTYPE;
BEGIN
    INSERT INTO galx_organizations (
        id,
        name,
        slug,
        tier,
        seat_capacity,
        billing_email,
        created_at,
        updated_at
    ) VALUES (
        p_id,
        p_name,
        p_slug,
        p_tier,
        p_seat_capacity,
        p_billing_email,
        NOW(),
        NOW()
    ) RETURNING * INTO v_org;

    RETURN jsonb_build_object(
        'success', true,
        'organization', to_jsonb(v_org)
    );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION fn_batch_multi_rpc_dispatch(JSONB) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION fn_get_organization_full_hierarchy_state(VARCHAR) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION fn_create_organization(VARCHAR, VARCHAR, VARCHAR, VARCHAR, INT, VARCHAR) TO authenticated, service_role, anon;
