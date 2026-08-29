-- ============================================================================
-- GALXAI SUBSTRATE POSTGRESQL MIGRATION: V44
-- Sovereign Seat Dual Rolling Windows (5-Hour & Weekly Quotas) & Concurrency Mesh
-- Version: 44.0.0
-- ============================================================================

-- 1. SEAT ROLLING USAGE EVENTS TABLE
CREATE TABLE IF NOT EXISTS public.galx_seat_rolling_usage_events (
    id VARCHAR(64) PRIMARY KEY DEFAULT ('ev_' || replace(gen_random_uuid()::text, '-', '')),
    user_id VARCHAR(255) NOT NULL,
    org_id VARCHAR(64) REFERENCES public.galx_organizations(id) ON DELETE CASCADE,
    model_id VARCHAR(128) NOT NULL,
    units NUMERIC(10,4) NOT NULL DEFAULT 1.0 CHECK (units >= 0),
    tokens_consumed INT NOT NULL DEFAULT 0 CHECK (tokens_consumed >= 0),
    cost_usd NUMERIC(14,6) NOT NULL DEFAULT 0.0 CHECK (cost_usd >= 0),
    request_id VARCHAR(128) DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indices for sub-millisecond sliding window range scans
CREATE INDEX IF NOT EXISTS idx_galx_seat_rolling_user_created 
    ON public.galx_seat_rolling_usage_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_galx_seat_rolling_created 
    ON public.galx_seat_rolling_usage_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_galx_seat_rolling_org 
    ON public.galx_seat_rolling_usage_events (org_id);


-- 2. SEAT ROLLING WINDOWS AGGREGATED STATE TABLE
CREATE TABLE IF NOT EXISTS public.galx_seat_rolling_windows_state (
    user_id VARCHAR(255) PRIMARY KEY,
    org_id VARCHAR(64) REFERENCES public.galx_organizations(id) ON DELETE SET NULL,
    tier VARCHAR(32) NOT NULL DEFAULT 'developer' CHECK (tier IN ('developer', 'small-business', 'enterprise', 'apex')),
    five_hour_used_units NUMERIC(10,4) NOT NULL DEFAULT 0.0 CHECK (five_hour_used_units >= 0),
    five_hour_limit_units NUMERIC(10,4) NOT NULL DEFAULT 30.0 CHECK (five_hour_limit_units > 0),
    five_hour_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    weekly_used_units NUMERIC(10,4) NOT NULL DEFAULT 0.0 CHECK (weekly_used_units >= 0),
    weekly_limit_units NUMERIC(10,4) NOT NULL DEFAULT 200.0 CHECK (weekly_limit_units > 0),
    weekly_reset_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    active_concurrent_streams INT NOT NULL DEFAULT 0 CHECK (active_concurrent_streams >= 0),
    concurrency_limit INT NOT NULL DEFAULT 20 CHECK (concurrency_limit > 0),
    last_event_at TIMESTAMPTZ DEFAULT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_galx_seat_state_org 
    ON public.galx_seat_rolling_windows_state (org_id);


-- 3. FUNCTION: DURATION FORMATTER HELPER (PL/pgSQL)
CREATE OR REPLACE FUNCTION public.fn_format_rolling_duration(p_seconds BIGINT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    v_days INT;
    v_hours INT;
    v_mins INT;
BEGIN
    IF p_seconds <= 0 THEN
        RETURN 'a moment';
    END IF;

    IF p_seconds >= 86400 THEN
        v_days := p_seconds / 86400;
        v_hours := (p_seconds % 86400) / 3600;
        IF v_hours = 0 OR v_days >= 3 THEN
            RETURN v_days::text || ' day' || CASE WHEN v_days > 1 THEN 's' ELSE '' END;
        ELSE
            RETURN v_days::text || ' day' || CASE WHEN v_days > 1 THEN 's' ELSE '' END || ', ' || v_hours::text || ' hour' || CASE WHEN v_hours > 1 THEN 's' ELSE '' END;
        END IF;
    ELSIF p_seconds >= 3600 THEN
        v_hours := p_seconds / 3600;
        v_mins := (p_seconds % 3600) / 60;
        IF v_mins = 0 THEN
            RETURN v_hours::text || ' hour' || CASE WHEN v_hours > 1 THEN 's' ELSE '' END;
        ELSE
            RETURN v_hours::text || ' hour' || CASE WHEN v_hours > 1 THEN 's' ELSE '' END || ', ' || v_mins::text || ' minute' || CASE WHEN v_mins > 1 THEN 's' ELSE '' END;
        END IF;
    ELSE
        v_mins := GREATEST(1, p_seconds / 60);
        RETURN v_mins::text || ' minute' || CASE WHEN v_mins > 1 THEN 's' ELSE '' END;
    END IF;
END;
$$;


-- 4. FUNCTION: RECORD SEAT USAGE EVENT & ATOMICALLY RECALCULATE ROLLING WINDOWS
CREATE OR REPLACE FUNCTION public.fn_record_seat_rolling_usage(
    p_user_id VARCHAR(255),
    p_model_id VARCHAR(128),
    p_units NUMERIC(10,4) DEFAULT 1.0,
    p_tokens INT DEFAULT 0,
    p_cost_usd NUMERIC(14,6) DEFAULT 0.0,
    p_request_id VARCHAR(128) DEFAULT NULL,
    p_tier VARCHAR(32) DEFAULT 'developer',
    p_org_id VARCHAR(64) DEFAULT NULL
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
    
    v_tier VARCHAR(32) := COALESCE(p_tier, 'developer');
    v_5h_limit NUMERIC(10,4);
    v_weekly_limit NUMERIC(10,4);
    v_concurrency_limit INT;

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
    v_msg_5h TEXT;
    v_msg_weekly TEXT;
BEGIN
    -- Configure tier capacities
    IF v_tier = 'apex' THEN
        v_5h_limit := 1500.0;
        v_weekly_limit := 25000.0;
        v_concurrency_limit := 500;
    ELSIF v_tier = 'enterprise' THEN
        v_5h_limit := 350.0;
        v_weekly_limit := 5000.0;
        v_concurrency_limit := 200;
    ELSIF v_tier = 'small-business' THEN
        v_5h_limit := 100.0;
        v_weekly_limit := 1000.0;
        v_concurrency_limit := 50;
    ELSE
        v_tier := 'developer';
        v_5h_limit := 30.0;
        v_weekly_limit := 200.0;
        v_concurrency_limit := 20;
    END IF;

    -- 1. Insert active usage event
    INSERT INTO public.galx_seat_rolling_usage_events (
        user_id, org_id, model_id, units, tokens_consumed, cost_usd, request_id, created_at
    ) VALUES (
        p_user_id, p_org_id, p_model_id, GREATEST(0.01, p_units), p_tokens, p_cost_usd, p_request_id, v_now
    );

    -- 2. Clean up stale records older than 7 days
    DELETE FROM public.galx_seat_rolling_usage_events
    WHERE user_id = p_user_id AND created_at < v_weekly_cutoff;

    -- 3. Calculate 5-Hour usage & oldest event
    SELECT 
        COALESCE(SUM(units), 0.0),
        MIN(created_at)
    INTO v_5h_used, v_oldest_5h
    FROM public.galx_seat_rolling_usage_events
    WHERE user_id = p_user_id AND created_at >= v_five_hour_cutoff;

    -- 4. Calculate Weekly usage & oldest event
    SELECT 
        COALESCE(SUM(units), 0.0),
        MIN(created_at)
    INTO v_weekly_used, v_oldest_weekly
    FROM public.galx_seat_rolling_usage_events
    WHERE user_id = p_user_id AND created_at >= v_weekly_cutoff;

    -- Compute remaining percentages
    v_5h_pct := GREATEST(0, LEAST(100, ROUND(((v_5h_limit - v_5h_used) / v_5h_limit) * 100)))::INT;
    v_weekly_pct := GREATEST(0, LEAST(100, ROUND(((v_weekly_limit - v_weekly_used) / v_weekly_limit) * 100)))::INT;

    -- Compute 5h duration
    IF v_oldest_5h IS NOT NULL AND v_5h_used > 0 THEN
        v_reset_5h_sec := GREATEST(0, EXTRACT(EPOCH FROM ((v_oldest_5h + INTERVAL '5 hours') - v_now))::BIGINT);
        v_refresh_5h_str := public.fn_format_rolling_duration(v_reset_5h_sec);
        IF v_5h_pct > 0 THEN
            v_msg_5h := 'You have used some of your 5-hour limit, it will fully refresh in ' || v_refresh_5h_str || '.';
        ELSE
            v_msg_5h := 'You have reached your 5-hour limit, it will begin refreshing in ' || v_refresh_5h_str || '.';
        END IF;
    ELSE
        v_msg_5h := 'You have 100% of your 5-hour limit remaining.';
    END IF;

    -- Compute Weekly duration
    IF v_oldest_weekly IS NOT NULL AND v_weekly_used > 0 THEN
        v_reset_weekly_sec := GREATEST(0, EXTRACT(EPOCH FROM ((v_oldest_weekly + INTERVAL '7 days') - v_now))::BIGINT);
        v_refresh_weekly_str := public.fn_format_rolling_duration(v_reset_weekly_sec);
        IF v_weekly_pct > 0 THEN
            v_msg_weekly := 'You have used some of your weekly limit, it will fully refresh in ' || v_refresh_weekly_str || '.';
        ELSE
            v_msg_weekly := 'You have reached your weekly limit, it will begin refreshing in ' || v_refresh_weekly_str || '.';
        END IF;
    ELSE
        v_msg_weekly := 'You have 100% of your weekly limit remaining.';
    END IF;

    -- 5. Upsert aggregated state row
    INSERT INTO public.galx_seat_rolling_windows_state (
        user_id, org_id, tier, five_hour_used_units, five_hour_limit_units, five_hour_reset_at,
        weekly_used_units, weekly_limit_units, weekly_reset_at, concurrency_limit, last_event_at, updated_at
    ) VALUES (
        p_user_id, p_org_id, v_tier, v_5h_used, v_5h_limit, COALESCE(v_oldest_5h + INTERVAL '5 hours', v_now),
        v_weekly_used, v_weekly_limit, COALESCE(v_oldest_weekly + INTERVAL '7 days', v_now), v_concurrency_limit, v_now, v_now
    )
    ON CONFLICT (user_id) DO UPDATE SET
        org_id = COALESCE(EXCLUDED.org_id, galx_seat_rolling_windows_state.org_id),
        tier = EXCLUDED.tier,
        five_hour_used_units = EXCLUDED.five_hour_used_units,
        five_hour_limit_units = EXCLUDED.five_hour_limit_units,
        five_hour_reset_at = EXCLUDED.five_hour_reset_at,
        weekly_used_units = EXCLUDED.weekly_used_units,
        weekly_limit_units = EXCLUDED.weekly_limit_units,
        weekly_reset_at = EXCLUDED.weekly_reset_at,
        concurrency_limit = EXCLUDED.concurrency_limit,
        last_event_at = EXCLUDED.last_event_at,
        updated_at = EXCLUDED.updated_at;

    -- 6. Return standard telemetry JSON matching SeatTierPublicSummary
    RETURN jsonb_build_object(
        'success', true,
        'userId', p_user_id,
        'tier', v_tier,
        'fiveHourWindow', jsonb_build_object(
            'percentRemaining', v_5h_pct,
            'usedUnits', v_5h_used,
            'limitUnits', v_5h_limit,
            'refreshIn', v_refresh_5h_str,
            'refreshMessage', v_msg_5h,
            'resetAtMs', EXTRACT(EPOCH FROM COALESCE(v_oldest_5h + INTERVAL '5 hours', v_now))::BIGINT * 1000,
            'isExceeded', (v_5h_used >= v_5h_limit)
        ),
        'weeklyWindow', jsonb_build_object(
            'percentRemaining', v_weekly_pct,
            'usedUnits', v_weekly_used,
            'limitUnits', v_weekly_limit,
            'refreshIn', v_refresh_weekly_str,
            'refreshMessage', v_msg_weekly,
            'resetAtMs', EXTRACT(EPOCH FROM COALESCE(v_oldest_weekly + INTERVAL '7 days', v_now))::BIGINT * 1000,
            'isExceeded', (v_weekly_used >= v_weekly_limit)
        )
    );
END;
$$;


-- 5. FUNCTION: GET SEAT ROLLING TELEMETRY WITHOUT RECORDING NEW USAGE
CREATE OR REPLACE FUNCTION public.fn_get_seat_rolling_telemetry(
    p_user_id VARCHAR(255),
    p_tier VARCHAR(32) DEFAULT 'developer'
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
    
    v_tier VARCHAR(32) := COALESCE(p_tier, 'developer');
    v_5h_limit NUMERIC(10,4);
    v_weekly_limit NUMERIC(10,4);
    v_concurrency_limit INT;

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
    v_msg_5h TEXT;
    v_msg_weekly TEXT;
BEGIN
    IF v_tier = 'apex' THEN
        v_5h_limit := 1500.0;
        v_weekly_limit := 25000.0;
        v_concurrency_limit := 500;
    ELSIF v_tier = 'enterprise' THEN
        v_5h_limit := 350.0;
        v_weekly_limit := 5000.0;
        v_concurrency_limit := 200;
    ELSIF v_tier = 'small-business' THEN
        v_5h_limit := 100.0;
        v_weekly_limit := 1000.0;
        v_concurrency_limit := 50;
    ELSE
        v_tier := 'developer';
        v_5h_limit := 30.0;
        v_weekly_limit := 200.0;
        v_concurrency_limit := 20;
    END IF;

    SELECT 
        COALESCE(SUM(units), 0.0),
        MIN(created_at)
    INTO v_5h_used, v_oldest_5h
    FROM public.galx_seat_rolling_usage_events
    WHERE user_id = p_user_id AND created_at >= v_five_hour_cutoff;

    SELECT 
        COALESCE(SUM(units), 0.0),
        MIN(created_at)
    INTO v_weekly_used, v_oldest_weekly
    FROM public.galx_seat_rolling_usage_events
    WHERE user_id = p_user_id AND created_at >= v_weekly_cutoff;

    v_5h_pct := GREATEST(0, LEAST(100, ROUND(((v_5h_limit - v_5h_used) / v_5h_limit) * 100)))::INT;
    v_weekly_pct := GREATEST(0, LEAST(100, ROUND(((v_weekly_limit - v_weekly_used) / v_weekly_limit) * 100)))::INT;

    IF v_oldest_5h IS NOT NULL AND v_5h_used > 0 THEN
        v_reset_5h_sec := GREATEST(0, EXTRACT(EPOCH FROM ((v_oldest_5h + INTERVAL '5 hours') - v_now))::BIGINT);
        v_refresh_5h_str := public.fn_format_rolling_duration(v_reset_5h_sec);
        IF v_5h_pct > 0 THEN
            v_msg_5h := 'You have used some of your 5-hour limit, it will fully refresh in ' || v_refresh_5h_str || '.';
        ELSE
            v_msg_5h := 'You have reached your 5-hour limit, it will begin refreshing in ' || v_refresh_5h_str || '.';
        END IF;
    ELSE
        v_msg_5h := 'You have 100% of your 5-hour limit remaining.';
    END IF;

    IF v_oldest_weekly IS NOT NULL AND v_weekly_used > 0 THEN
        v_reset_weekly_sec := GREATEST(0, EXTRACT(EPOCH FROM ((v_oldest_weekly + INTERVAL '7 days') - v_now))::BIGINT);
        v_refresh_weekly_str := public.fn_format_rolling_duration(v_reset_weekly_sec);
        IF v_weekly_pct > 0 THEN
            v_msg_weekly := 'You have used some of your weekly limit, it will fully refresh in ' || v_refresh_weekly_str || '.';
        ELSE
            v_msg_weekly := 'You have reached your weekly limit, it will begin refreshing in ' || v_refresh_weekly_str || '.';
        END IF;
    ELSE
        v_msg_weekly := 'You have 100% of your weekly limit remaining.';
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'userId', p_user_id,
        'tier', v_tier,
        'fiveHourWindow', jsonb_build_object(
            'percentRemaining', v_5h_pct,
            'usedUnits', v_5h_used,
            'limitUnits', v_5h_limit,
            'refreshIn', v_refresh_5h_str,
            'refreshMessage', v_msg_5h,
            'resetAtMs', EXTRACT(EPOCH FROM COALESCE(v_oldest_5h + INTERVAL '5 hours', v_now))::BIGINT * 1000,
            'isExceeded', (v_5h_used >= v_5h_limit)
        ),
        'weeklyWindow', jsonb_build_object(
            'percentRemaining', v_weekly_pct,
            'usedUnits', v_weekly_used,
            'limitUnits', v_weekly_limit,
            'refreshIn', v_refresh_weekly_str,
            'refreshMessage', v_msg_weekly,
            'resetAtMs', EXTRACT(EPOCH FROM COALESCE(v_oldest_weekly + INTERVAL '7 days', v_now))::BIGINT * 1000,
            'isExceeded', (v_weekly_used >= v_weekly_limit)
        )
    );
END;
$$;


-- 6. FUNCTION: ATOMIC SEAT CONCURRENCY SLOT ACQUISITION
CREATE OR REPLACE FUNCTION public.fn_acquire_seat_concurrency_slot(
    p_user_id VARCHAR(255),
    p_limit INT DEFAULT 20
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_current INT;
BEGIN
    INSERT INTO public.galx_seat_rolling_windows_state (user_id, active_concurrent_streams, concurrency_limit, updated_at)
    VALUES (p_user_id, 1, p_limit, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
        active_concurrent_streams = CASE 
            WHEN galx_seat_rolling_windows_state.active_concurrent_streams < p_limit 
            THEN galx_seat_rolling_windows_state.active_concurrent_streams + 1
            ELSE galx_seat_rolling_windows_state.active_concurrent_streams
        END,
        updated_at = NOW()
    RETURNING active_concurrent_streams INTO v_current;

    RETURN (v_current <= p_limit);
END;
$$;


-- 7. FUNCTION: ATOMIC SEAT CONCURRENCY SLOT RELEASE
CREATE OR REPLACE FUNCTION public.fn_release_seat_concurrency_slot(
    p_user_id VARCHAR(255)
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    UPDATE public.galx_seat_rolling_windows_state
    SET active_concurrent_streams = GREATEST(0, active_concurrent_streams - 1),
        updated_at = NOW()
    WHERE user_id = p_user_id;
END;
$$;


-- 8. ROW LEVEL SECURITY POLICIES
ALTER TABLE public.galx_seat_rolling_usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_seat_rolling_windows_state ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own events & state
CREATE POLICY "Users can view own seat rolling usage events" 
    ON public.galx_seat_rolling_usage_events
    FOR SELECT 
    USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view own seat rolling windows state" 
    ON public.galx_seat_rolling_windows_state
    FOR SELECT 
    USING (auth.uid()::text = user_id);

-- Service Role Full Access
CREATE POLICY "Service role full access on seat rolling usage events" 
    ON public.galx_seat_rolling_usage_events
    FOR ALL 
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access on seat rolling windows state" 
    ON public.galx_seat_rolling_windows_state
    FOR ALL 
    USING (auth.role() = 'service_role');
