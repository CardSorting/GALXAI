-- An administrator's allocation applies to the active usage period on the
-- next reservation. Keep the durable message ledger and atomic reservation
-- semantics; only synchronize the existing period's assigned cap.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '10s';

CREATE OR REPLACE FUNCTION public.fn_reserve_nova_message(
  p_user_id text,
  p_request_id text,
  p_unit_amount_micros bigint DEFAULT 20000,
  p_cap_micros bigint DEFAULT 25000000
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_period date := date_trunc('month', now())::date;
  v_reservation private.galx_nova_message_reservations;
  v_period_row private.galx_nova_message_usage_periods;
  v_limit_units bigint;
BEGIN
  IF NULLIF(trim(p_user_id), '') IS NULL OR NULLIF(trim(p_request_id), '') IS NULL
     OR p_user_id = 'anonymous_developer' OR p_unit_amount_micros <= 0 OR p_cap_micros <= 0 THEN
    RETURN jsonb_build_object('allowed', false, 'code', 'invalid_usage_identity');
  END IF;

  INSERT INTO private.galx_nova_message_usage_periods (user_id, period_start, unit_amount_micros, cap_micros)
  VALUES (p_user_id, v_period, p_unit_amount_micros, p_cap_micros)
  ON CONFLICT (user_id, period_start) DO UPDATE
    SET unit_amount_micros = EXCLUDED.unit_amount_micros,
        cap_micros = EXCLUDED.cap_micros,
        updated_at = now();

  SELECT * INTO v_period_row FROM private.galx_nova_message_usage_periods
  WHERE user_id = p_user_id AND period_start = v_period FOR UPDATE;

  SELECT * INTO v_reservation FROM private.galx_nova_message_reservations
  WHERE user_id = p_user_id AND request_id = p_request_id FOR UPDATE;

  IF v_reservation.user_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'allowed', v_reservation.state <> 'released', 'idempotent', true, 'state', v_reservation.state,
      'periodStart', v_reservation.period_start, 'completedUnits', v_period_row.completed_units,
      'reservedUnits', v_period_row.reserved_units,
      'capUnits', floor(v_period_row.cap_micros / v_period_row.unit_amount_micros)
    );
  END IF;

  v_limit_units := floor(v_period_row.cap_micros / v_period_row.unit_amount_micros);
  IF v_period_row.completed_units + v_period_row.reserved_units + 1 > v_limit_units THEN
    RETURN jsonb_build_object(
      'allowed', false, 'code', 'nova_message_monthly_cap_exceeded', 'periodStart', v_period,
      'completedUnits', v_period_row.completed_units, 'reservedUnits', v_period_row.reserved_units,
      'capUnits', v_limit_units, 'capUsd', round((v_period_row.cap_micros::numeric / 1000000), 2)
    );
  END IF;

  INSERT INTO private.galx_nova_message_reservations (user_id, request_id, period_start)
  VALUES (p_user_id, p_request_id, v_period);
  UPDATE private.galx_nova_message_usage_periods
  SET reserved_units = reserved_units + 1, updated_at = now()
  WHERE user_id = p_user_id AND period_start = v_period;

  RETURN jsonb_build_object('allowed', true, 'idempotent', false, 'state', 'reserved',
    'periodStart', v_period, 'completedUnits', v_period_row.completed_units,
    'reservedUnits', v_period_row.reserved_units + 1, 'capUnits', v_limit_units);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_reserve_nova_message(text, text, bigint, bigint) FROM PUBLIC, anon, authenticated;
