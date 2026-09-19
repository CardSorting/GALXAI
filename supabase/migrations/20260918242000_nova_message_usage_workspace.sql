-- Customer-facing usage summary and durable in-app threshold notices.
-- The public API exposes only message units and safe billing terms; the
-- private ledger remains inaccessible to browser roles.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '10s';

CREATE TABLE IF NOT EXISTS private.galx_nova_usage_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  period_start date NOT NULL,
  threshold_percent integer NOT NULL CHECK (threshold_percent IN (50, 80, 100)),
  title text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  UNIQUE (user_id, period_start, threshold_percent)
);

ALTER TABLE private.galx_nova_usage_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.galx_nova_usage_notifications FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_get_nova_message_usage_summary(p_user_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_period date := date_trunc('month', now())::date;
  v_next_period date := (v_period + interval '1 month')::date;
  v_period_row private.galx_nova_message_usage_periods;
  v_cap_units bigint;
  v_used_units bigint;
  v_usage_micros bigint;
  v_alerts jsonb;
BEGIN
  IF NULLIF(trim(p_user_id), '') IS NULL OR p_user_id = 'anonymous_developer' THEN
    RETURN jsonb_build_object('status', 'unavailable');
  END IF;

  SELECT * INTO v_period_row
  FROM private.galx_nova_message_usage_periods
  WHERE user_id = p_user_id AND period_start = v_period;

  v_cap_units := COALESCE(floor(v_period_row.cap_micros / NULLIF(v_period_row.unit_amount_micros, 0)), 1250);
  v_used_units := COALESCE(v_period_row.completed_units, 0) + COALESCE(v_period_row.reserved_units, 0);
  v_usage_micros := v_used_units * COALESCE(v_period_row.unit_amount_micros, 20000);

  IF v_period_row.user_id IS NOT NULL THEN
    INSERT INTO private.galx_nova_usage_notifications (user_id, period_start, threshold_percent, title, body)
    SELECT p_user_id, v_period, threshold.value,
      CASE threshold.value WHEN 50 THEN 'Half of your monthly usage cap is used'
        WHEN 80 THEN 'You are nearing your monthly usage cap'
        ELSE 'Your monthly usage cap has been reached' END,
      CASE threshold.value WHEN 50 THEN 'You have used about half of this month’s included usage allowance.'
        WHEN 80 THEN 'Requests will stop when the monthly usage cap is reached.'
        ELSE 'New billable messages are paused until the next monthly reset.' END
    FROM (VALUES (50), (80), (100)) AS threshold(value)
    WHERE v_used_units * 100 >= v_cap_units * threshold.value
    ON CONFLICT (user_id, period_start, threshold_percent) DO NOTHING;
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'id', id,
      'thresholdPercent', threshold_percent,
      'title', title,
      'body', body,
      'createdAt', created_at,
      'readAt', read_at
    ) ORDER BY threshold_percent), '[]'::jsonb)
  INTO v_alerts
  FROM private.galx_nova_usage_notifications
  WHERE user_id = p_user_id AND period_start = v_period;

  RETURN jsonb_build_object(
    'status', 'active',
    'periodStart', v_period,
    'periodEnd', v_next_period,
    'resetAt', v_next_period,
    'completedUnits', COALESCE(v_period_row.completed_units, 0),
    'reservedUnits', COALESCE(v_period_row.reserved_units, 0),
    'capUnits', v_cap_units,
    'unitAmountMicros', COALESCE(v_period_row.unit_amount_micros, 20000),
    'capMicros', COALESCE(v_period_row.cap_micros, 25000000),
    'notifications', v_alerts
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_get_nova_message_usage_summary(text) FROM PUBLIC, anon, authenticated;

