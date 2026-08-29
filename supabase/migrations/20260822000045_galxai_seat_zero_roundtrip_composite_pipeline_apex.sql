-- ============================================================================
-- GALXAI SUBSTRATE POSTGRESQL MIGRATION: V45
-- Sovereign Seat Zero-Roundtrip Composite Pipeline & CTE Mesh Apex
-- Consolidates Auth, Tier Resolution, Concurrency Slot Acquisition,
-- Rolling Quota Verification, Stream Tap Settlement & Spend Ledger into 1-Hop CTEs
-- Version: 45.0.0
-- ============================================================================

-- 1. ATOMIC 1-HOP COMPOSITE PRE-INFERENCE GATE
-- Evaluates Organization, Member Tier, Spend Cap, Model Whitelist, Rolling Quotas & Concurrency Slot in 1 single hop!
CREATE OR REPLACE FUNCTION public.fn_evaluate_and_acquire_seat_gate(
    p_user_id VARCHAR(255),
    p_requested_model VARCHAR(128) DEFAULT 'gpt-5.6-sol',
    p_org_id VARCHAR(64) DEFAULT NULL,
    p_is_stream BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_five_hour_cutoff TIMESTAMPTZ := v_now - INTERVAL '5 hours';
    v_weekly_cutoff TIMESTAMPTZ := v_now - INTERVAL '7 days';

    v_tier VARCHAR(32) := 'developer';
    v_tier_label TEXT := 'Solo Developer Seat';
    v_role VARCHAR(32) := 'developer';
    v_org_id VARCHAR(64) := p_org_id;
    v_member_id VARCHAR(64) := NULL;
    v_spend_cap NUMERIC(14,6) := 25.0;
    v_current_spend NUMERIC(14,6) := 0.0;
    v_throttle_mode VARCHAR(16) := 'hard';

    v_5h_limit NUMERIC(10,4) := 30.0;
    v_weekly_limit NUMERIC(10,4) := 200.0;
    v_concurrency_limit INT := 20;

    v_5h_used NUMERIC(10,4) := 0.0;
    v_weekly_used NUMERIC(10,4) := 0.0;
    v_5h_pct INT := 100;
    v_weekly_pct INT := 100;

    v_oldest_5h TIMESTAMPTZ;
    v_oldest_weekly TIMESTAMPTZ;
    v_reset_5h_sec BIGINT := 0;
    v_reset_weekly_sec BIGINT := 0;
    v_refresh_5h_str TEXT := 'fully refreshed';
    v_refresh_weekly_str TEXT := 'fully refreshed';

    v_active_streams INT := 0;
    v_slot_acquired BOOLEAN := FALSE;
    v_clean_model TEXT := LOWER(TRIM(p_requested_model));
    v_model_allowed BOOLEAN := TRUE;
BEGIN
    -- 1. Resolve Organization & Member if provided or lookup by user_id
    IF p_user_id IS NOT NULL AND p_user_id <> 'anonymous_developer' THEN
        SELECT 
            m.id, m.org_id, m.role, m.monthly_spend_usd, m.monthly_spend_cap_usd, m.throttle_mode,
            COALESCE(o.tier, 'developer')
        INTO 
            v_member_id, v_org_id, v_role, v_current_spend, v_spend_cap, v_throttle_mode, v_tier
        FROM public.galx_organization_members m
        LEFT JOIN public.galx_organizations o ON o.id = m.org_id
        WHERE (m.user_id = p_user_id OR m.id = p_user_id)
        LIMIT 1;

        -- If not member but org_id provided
        IF v_member_id IS NULL AND p_org_id IS NOT NULL THEN
            SELECT o.tier INTO v_tier
            FROM public.galx_organizations o
            WHERE o.id = p_org_id;
        END IF;
    END IF;

    -- Tier configuration matrix
    IF v_tier = 'apex' THEN
        v_tier_label := 'Apex Sovereign (Dedicated Cluster)';
        v_5h_limit := 1500.0;
        v_weekly_limit := 25000.0;
        v_concurrency_limit := 500;
    ELSIF v_tier = 'enterprise' THEN
        v_tier_label := 'Enterprise Fleet (Sovereign Governance)';
        v_5h_limit := 350.0;
        v_weekly_limit := 5000.0;
        v_concurrency_limit := 200;
    ELSIF v_tier = 'small-business' THEN
        v_tier_label := 'Small Business & Squads';
        v_5h_limit := 100.0;
        v_weekly_limit := 1000.0;
        v_concurrency_limit := 50;
    ELSE
        v_tier := 'developer';
        v_tier_label := 'Solo Developer Seat';
        v_5h_limit := 30.0;
        v_weekly_limit := 200.0;
        v_concurrency_limit := 20;
    END IF;

    -- 2. Model Whitelist Check
    IF v_tier = 'developer' THEN
        IF v_clean_model LIKE '%terra%' OR v_clean_model LIKE '%codex%' OR v_clean_model LIKE '%image%' THEN
            v_model_allowed := FALSE;
        END IF;
    ELSIF v_tier = 'small-business' THEN
        IF v_clean_model LIKE '%image%' THEN
            v_model_allowed := FALSE;
        END IF;
    END IF;

    IF NOT v_model_allowed THEN
        RETURN jsonb_build_object(
            'allowed', FALSE,
            'rejectionCode', 'tier_model_restricted',
            'rejectionMessage', 'Model ''' || p_requested_model || ''' requires an upgraded Small Business or Enterprise seat license.',
            'tier', v_tier,
            'tierLabel', v_tier_label
        );
    END IF;

    -- 3. Monthly Spend Cap Check
    IF v_throttle_mode = 'hard' AND v_current_spend >= v_spend_cap THEN
        RETURN jsonb_build_object(
            'allowed', FALSE,
            'rejectionCode', 'seat_spend_cap_exceeded',
            'rejectionMessage', 'Monthly seat compute quota reached. Please contact your organization administrator to increase limits.',
            'tier', v_tier,
            'tierLabel', v_tier_label,
            'currentSpendUsd', v_current_spend,
            'spendCapUsd', v_spend_cap
        );
    END IF;

    -- 4. Calculate Rolling Quotas
    SELECT 
        COALESCE(SUM(units), 0.0), MIN(created_at)
    INTO v_5h_used, v_oldest_5h
    FROM public.galx_seat_rolling_usage_events
    WHERE user_id = p_user_id AND created_at >= v_five_hour_cutoff;

    SELECT 
        COALESCE(SUM(units), 0.0), MIN(created_at)
    INTO v_weekly_used, v_oldest_weekly
    FROM public.galx_seat_rolling_usage_events
    WHERE user_id = p_user_id AND created_at >= v_weekly_cutoff;

    v_5h_pct := GREATEST(0, LEAST(100, ROUND(((v_5h_limit - v_5h_used) / v_5h_limit) * 100)))::INT;
    v_weekly_pct := GREATEST(0, LEAST(100, ROUND(((v_weekly_limit - v_weekly_used) / v_weekly_limit) * 100)))::INT;

    IF v_oldest_5h IS NOT NULL AND v_5h_used > 0 THEN
        v_reset_5h_sec := GREATEST(0, EXTRACT(EPOCH FROM ((v_oldest_5h + INTERVAL '5 hours') - v_now))::BIGINT);
        v_refresh_5h_str := public.fn_format_rolling_duration(v_reset_5h_sec);
    END IF;

    IF v_oldest_weekly IS NOT NULL AND v_weekly_used > 0 THEN
        v_reset_weekly_sec := GREATEST(0, EXTRACT(EPOCH FROM ((v_oldest_weekly + INTERVAL '7 days') - v_now))::BIGINT);
        v_refresh_weekly_str := public.fn_format_rolling_duration(v_reset_weekly_sec);
    END IF;

    -- Check 5h limit
    IF v_5h_used >= v_5h_limit THEN
        RETURN jsonb_build_object(
            'allowed', FALSE,
            'rejectionCode', 'seat_5hour_limit_exceeded',
            'rejectionMessage', 'You have used all of your 5-hour limit for flagship models on ' || v_tier_label || '. It will begin refreshing in ' || v_refresh_5h_str || '.',
            'refreshIn', v_refresh_5h_str,
            'tier', v_tier,
            'tierLabel', v_tier_label,
            'fiveHourWindow', jsonb_build_object('percentRemaining', 0, 'refreshIn', v_refresh_5h_str, 'limitUnits', v_5h_limit, 'usedUnits', v_5h_used),
            'weeklyWindow', jsonb_build_object('percentRemaining', v_weekly_pct, 'refreshIn', v_refresh_weekly_str, 'limitUnits', v_weekly_limit, 'usedUnits', v_weekly_used)
        );
    END IF;

    -- Check weekly limit
    IF v_weekly_used >= v_weekly_limit THEN
        RETURN jsonb_build_object(
            'allowed', FALSE,
            'rejectionCode', 'seat_weekly_limit_exceeded',
            'rejectionMessage', 'You have reached your weekly sustained limit on ' || v_tier_label || '. It will begin refreshing in ' || v_refresh_weekly_str || '.',
            'refreshIn', v_refresh_weekly_str,
            'tier', v_tier,
            'tierLabel', v_tier_label,
            'fiveHourWindow', jsonb_build_object('percentRemaining', v_5h_pct, 'refreshIn', v_refresh_5h_str, 'limitUnits', v_5h_limit, 'usedUnits', v_5h_used),
            'weeklyWindow', jsonb_build_object('percentRemaining', 0, 'refreshIn', v_refresh_weekly_str, 'limitUnits', v_weekly_limit, 'usedUnits', v_weekly_used)
        );
    END IF;

    -- 5. Concurrency Slot Acquisition (if streaming)
    IF p_is_stream THEN
        INSERT INTO public.galx_seat_rolling_windows_state (user_id, active_concurrent_streams, concurrency_limit, tier, updated_at)
        VALUES (p_user_id, 1, v_concurrency_limit, v_tier, v_now)
        ON CONFLICT (user_id) DO UPDATE SET
            active_concurrent_streams = CASE 
                WHEN galx_seat_rolling_windows_state.active_concurrent_streams < v_concurrency_limit 
                THEN galx_seat_rolling_windows_state.active_concurrent_streams + 1
                ELSE galx_seat_rolling_windows_state.active_concurrent_streams
            END,
            tier = v_tier,
            concurrency_limit = v_concurrency_limit,
            updated_at = v_now
        RETURNING active_concurrent_streams INTO v_active_streams;

        IF v_active_streams > v_concurrency_limit THEN
            RETURN jsonb_build_object(
                'allowed', FALSE,
                'rejectionCode', 'seat_concurrency_limit_exceeded',
                'rejectionMessage', 'Seat concurrency limit of ' || v_concurrency_limit || ' active streams reached for ' || v_tier_label || '. Upgrade your seat plan or wait for active streams to complete.',
                'concurrencyLimit', v_concurrency_limit,
                'activeStreams', v_active_streams,
                'tier', v_tier,
                'tierLabel', v_tier_label
            );
        END IF;

        v_slot_acquired := TRUE;
    END IF;

    -- 6. Grant Gate Clearance
    RETURN jsonb_build_object(
        'allowed', TRUE,
        'tier', v_tier,
        'tierLabel', v_tier_label,
        'role', v_role,
        'concurrencySlotAcquired', v_slot_acquired,
        'activeStreams', v_active_streams,
        'concurrencyLimit', v_concurrency_limit,
        'fiveHourWindow', jsonb_build_object(
            'percentRemaining', v_5h_pct,
            'usedUnits', v_5h_used,
            'limitUnits', v_5h_limit,
            'refreshIn', v_refresh_5h_str,
            'resetAtMs', EXTRACT(EPOCH FROM COALESCE(v_oldest_5h + INTERVAL '5 hours', v_now))::BIGINT * 1000
        ),
        'weeklyWindow', jsonb_build_object(
            'percentRemaining', v_weekly_pct,
            'usedUnits', v_weekly_used,
            'limitUnits', v_weekly_limit,
            'refreshIn', v_refresh_weekly_str,
            'resetAtMs', EXTRACT(EPOCH FROM COALESCE(v_oldest_weekly + INTERVAL '7 days', v_now))::BIGINT * 1000
        )
    );
END;
$$;


-- 2. ATOMIC 1-HOP COMPOSITE STREAM TAP SETTLEMENT CTE
-- Collapses message persistence + concurrency release + rolling usage logging + spend sync into 1 atomic CTE!
CREATE OR REPLACE FUNCTION public.fn_settle_seat_stream_completion_composite(
    p_user_id VARCHAR(255),
    p_model_id VARCHAR(128),
    p_tokens INT DEFAULT 0,
    p_cost_usd NUMERIC(14,6) DEFAULT 0.0,
    p_units NUMERIC(10,4) DEFAULT 1.0,
    p_request_id VARCHAR(128) DEFAULT NULL,
    p_conversation_id VARCHAR(64) DEFAULT NULL,
    p_user_message JSONB DEFAULT NULL,
    p_assistant_message JSONB DEFAULT NULL,
    p_is_stream BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_now TIMESTAMPTZ := NOW();
    v_user_msg_id VARCHAR(64);
    v_asst_msg_id VARCHAR(64);
BEGIN
    -- Multi-Table Atomic Transaction Loop
    
    -- A. Append user message if provided
    IF p_conversation_id IS NOT NULL AND p_user_message IS NOT NULL THEN
        v_user_msg_id := COALESCE(p_user_message->>'id', 'msg_u_' || replace(gen_random_uuid()::text, '-', ''));
        INSERT INTO public.chat_messages (
            id, conversation_id, role, content, created_at
        ) VALUES (
            v_user_msg_id,
            p_conversation_id,
            COALESCE(p_user_message->>'role', 'user'),
            COALESCE(p_user_message->>'content', ''),
            v_now - INTERVAL '100 milliseconds'
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    -- B. Append assistant message if provided
    IF p_conversation_id IS NOT NULL AND p_assistant_message IS NOT NULL THEN
        v_asst_msg_id := COALESCE(p_assistant_message->>'id', 'msg_a_' || replace(gen_random_uuid()::text, '-', ''));
        INSERT INTO public.chat_messages (
            id, conversation_id, role, content, thinking_content, model_id, persona_id, created_at
        ) VALUES (
            v_asst_msg_id,
            p_conversation_id,
            'assistant',
            COALESCE(p_assistant_message->>'content', ''),
            p_assistant_message->>'thinkingContent',
            p_model_id,
            p_assistant_message->>'personaId',
            v_now
        )
        ON CONFLICT (id) DO UPDATE SET
            content = EXCLUDED.content,
            thinking_content = EXCLUDED.thinking_content;

        -- Touch conversation updated_at
        UPDATE public.chat_conversations
        SET updated_at = v_now
        WHERE id = p_conversation_id;
    END IF;

    -- C. Append rolling compute usage event
    IF p_user_id IS NOT NULL AND p_user_id <> 'anonymous_developer' THEN
        INSERT INTO public.galx_seat_rolling_usage_events (
            user_id, model_id, units, tokens_consumed, cost_usd, request_id, created_at
        ) VALUES (
            p_user_id, p_model_id, GREATEST(0.01, p_units), p_tokens, p_cost_usd, p_request_id, v_now
        );

        -- D. Decrement active concurrency streams
        IF p_is_stream THEN
            UPDATE public.galx_seat_rolling_windows_state
            SET active_concurrent_streams = GREATEST(0, active_concurrent_streams - 1),
                updated_at = v_now
            WHERE user_id = p_user_id;
        END IF;

        -- E. Increment organization member spend ledger
        IF p_cost_usd > 0 THEN
            UPDATE public.galx_organization_members
            SET monthly_spend_usd = monthly_spend_usd + p_cost_usd,
                last_active_at = v_now,
                updated_at = v_now
            WHERE user_id = p_user_id OR id = p_user_id;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', TRUE,
        'userId', p_user_id,
        'conversationId', p_conversation_id,
        'userMessageId', v_user_msg_id,
        'assistantMessageId', v_asst_msg_id,
        'settledAt', v_now
    );
END;
$$;


-- 3. ATOMIC 1-HOP DELTA SYNC WITH PRE-WARMED SEAT TELEMETRY
CREATE OR REPLACE FUNCTION public.fn_get_chat_delta_sync_with_seat_telemetry(
    p_user_id TEXT DEFAULT NULL,
    p_client_etag TEXT DEFAULT NULL,
    p_active_session_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_base_sync JSONB;
    v_seat_telemetry JSONB;
BEGIN
    -- Call base delta sync
    v_base_sync := public.fn_get_chat_delta_sync(p_user_id, p_client_etag, NULL, p_active_session_id);

    -- If client ETag matched (HTTP 304 equivalent), return directly
    IF (v_base_sync->>'notModified')::BOOLEAN = TRUE THEN
        RETURN v_base_sync;
    END IF;

    -- Otherwise attach pre-warmed seat telemetry in the SAME roundtrip!
    IF p_user_id IS NOT NULL AND p_user_id <> 'anonymous_developer' THEN
        v_seat_telemetry := public.fn_get_seat_rolling_telemetry(p_user_id, 'developer');
    ELSE
        v_seat_telemetry := jsonb_build_object(
            'tier', 'developer',
            'fiveHourWindow', jsonb_build_object('percentRemaining', 100, 'refreshIn', 'fully refreshed'),
            'weeklyWindow', jsonb_build_object('percentRemaining', 100, 'refreshIn', 'fully refreshed')
        );
    END IF;

    RETURN v_base_sync || jsonb_build_object('seatTelemetry', v_seat_telemetry);
END;
$$;
