-- ============================================================================
-- GALXAI: Quantum-Grade Shard Health Probes & Webhook Audit Substrate
-- Migration: 20260822000005_galxai_schema_quantum.sql
-- Version: 3.4.0
-- ============================================================================

-- 1. SHARD HEALTH PROBES TABLE
CREATE TABLE IF NOT EXISTS galx_shard_health_probes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shard_id VARCHAR(64) NOT NULL REFERENCES galx_shard_accounts(id) ON DELETE CASCADE,
    worker_id VARCHAR(128) NOT NULL,
    latency_ms NUMERIC(10, 2) NOT NULL,
    status_code INTEGER NOT NULL,
    is_success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT DEFAULT NULL,
    probe_timestamp_ms BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_galx_health_shard_time ON galx_shard_health_probes(shard_id, probe_timestamp_ms DESC);

-- 2. WEBHOOK DELIVERIES AUDIT TABLE
CREATE TABLE IF NOT EXISTS galx_webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(64) NOT NULL,
    target_url TEXT NOT NULL,
    status_code INTEGER,
    attempt_number INTEGER NOT NULL DEFAULT 1,
    duration_ms INTEGER,
    is_success BOOLEAN NOT NULL DEFAULT false,
    response_body TEXT DEFAULT NULL,
    error_message TEXT DEFAULT NULL,
    delivered_at_ms BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_galx_webhooks_event ON galx_webhook_deliveries(event_type, delivered_at_ms DESC);

-- 3. AUTONOMOUS SHARD HEALTH & AUTO-DRAIN STORED PROCEDURE
CREATE OR REPLACE FUNCTION fn_report_shard_health_cf(
    p_probes JSONB -- Array of { shardId, workerId, latencyMs, statusCode, isSuccess, errorMessage, timestampMs }
)
RETURNS JSONB AS $$
DECLARE
    v_item JSONB;
    v_shard_id VARCHAR(64);
    v_success BOOLEAN;
    v_latency NUMERIC(10, 2);
    v_status INTEGER;
    v_consecutive_failures INTEGER;
    v_avg_latency NUMERIC(10, 2);
    v_updated_shards JSONB := '[]'::jsonb;
BEGIN
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_probes)
    LOOP
        v_shard_id := v_item->>'shardId';
        v_latency := CAST(v_item->>'latencyMs' AS NUMERIC(10, 2));
        v_status := COALESCE(CAST(v_item->>'statusCode' AS INTEGER), 200);
        v_success := COALESCE(CAST(v_item->>'isSuccess' AS BOOLEAN), true);

        INSERT INTO galx_shard_health_probes (
            shard_id, worker_id, latency_ms, status_code, is_success, error_message, probe_timestamp_ms
        ) VALUES (
            v_shard_id,
            v_item->>'workerId',
            v_latency,
            v_status,
            v_success,
            v_item->>'errorMessage',
            COALESCE(CAST(v_item->>'timestampMs' AS BIGINT), CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT))
        );

        -- Calculate rolling health over last 10 probes
        SELECT 
            COUNT(*) FILTER (WHERE is_success = false),
            COALESCE(AVG(latency_ms), 200.0)
        INTO v_consecutive_failures, v_avg_latency
        FROM (
            SELECT is_success, latency_ms
            FROM galx_shard_health_probes
            WHERE shard_id = v_shard_id
            ORDER BY probe_timestamp_ms DESC
            LIMIT 10
        ) sub;

        -- Auto-degrade or auto-drain if consecutive failure threshold breached
        IF v_consecutive_failures >= 5 THEN
            UPDATE galx_shard_accounts
            SET status = 'draining',
                updated_at_ms = CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT),
                updated_at = NOW()
            WHERE id = v_shard_id;

            v_updated_shards := v_updated_shards || jsonb_build_object(
                'shardId', v_shard_id,
                'newStatus', 'draining',
                'reason', 'CONSECUTIVE_FAILURES_EXCEEDED'
            );
        ELSIF v_consecutive_failures >= 2 THEN
            UPDATE galx_shard_accounts
            SET status = 'degraded',
                updated_at_ms = CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT),
                updated_at = NOW()
            WHERE id = v_shard_id AND status = 'healthy';
        ELSIF v_consecutive_failures = 0 THEN
            UPDATE galx_shard_accounts
            SET status = 'healthy',
                updated_at_ms = CAST(EXTRACT(EPOCH FROM NOW()) * 1000 AS BIGINT),
                updated_at = NOW()
            WHERE id = v_shard_id AND status = 'degraded';
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'success', true,
        'probesIngested', jsonb_array_length(p_probes),
        'statusTransitions', v_updated_shards
    );
END;
$$ LANGUAGE plpgsql;

ALTER TABLE galx_shard_health_probes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_galx_shard_health" ON galx_shard_health_probes;
CREATE POLICY "service_role_all_galx_shard_health" ON galx_shard_health_probes FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE galx_webhook_deliveries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "service_role_all_galx_webhook_deliveries" ON galx_webhook_deliveries;
CREATE POLICY "service_role_all_galx_webhook_deliveries" ON galx_webhook_deliveries FOR ALL USING (auth.role() = 'service_role');
