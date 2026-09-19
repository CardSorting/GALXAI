-- Atomic monthly reservation and completion ledger for Nova's per-message contract.
-- The customer unit remains one completed message; this table only enforces spend safety.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '10s';

CREATE TABLE IF NOT EXISTS private.galx_nova_message_usage_periods (
  user_id text NOT NULL,
  period_start date NOT NULL,
  unit_amount_micros bigint NOT NULL DEFAULT 20000 CHECK (unit_amount_micros > 0),
  cap_micros bigint NOT NULL DEFAULT 25000000 CHECK (cap_micros > 0),
  reserved_units bigint NOT NULL DEFAULT 0 CHECK (reserved_units >= 0),
  completed_units bigint NOT NULL DEFAULT 0 CHECK (completed_units >= 0),
  alert_50_sent_at timestamptz,
  alert_80_sent_at timestamptz,
  alert_100_sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, period_start)
);

CREATE TABLE IF NOT EXISTS private.galx_nova_message_reservations (
  user_id text NOT NULL,
  request_id text NOT NULL,
  period_start date NOT NULL,
  state text NOT NULL DEFAULT 'reserved' CHECK (state IN ('reserved', 'completed', 'released')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  released_at timestamptz,
  PRIMARY KEY (user_id, request_id),
  FOREIGN KEY (user_id, period_start)
    REFERENCES private.galx_nova_message_usage_periods(user_id, period_start)
    ON DELETE CASCADE
);

ALTER TABLE private.galx_nova_message_usage_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE private.galx_nova_message_reservations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.galx_nova_message_usage_periods, private.galx_nova_message_reservations FROM PUBLIC, anon, authenticated, service_role;

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
  ON CONFLICT (user_id, period_start) DO NOTHING;

  SELECT * INTO v_period_row FROM private.galx_nova_message_usage_periods
  WHERE user_id = p_user_id AND period_start = v_period FOR UPDATE;

  SELECT * INTO v_reservation FROM private.galx_nova_message_reservations
  WHERE user_id = p_user_id AND request_id = p_request_id FOR UPDATE;

  IF v_reservation.user_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'allowed', v_reservation.state <> 'released',
      'idempotent', true,
      'state', v_reservation.state,
      'periodStart', v_reservation.period_start,
      'completedUnits', v_period_row.completed_units,
      'reservedUnits', v_period_row.reserved_units,
      'capUnits', floor(v_period_row.cap_micros / v_period_row.unit_amount_micros)
    );
  END IF;

  v_limit_units := floor(v_period_row.cap_micros / v_period_row.unit_amount_micros);
  IF v_period_row.completed_units + v_period_row.reserved_units + 1 > v_limit_units THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'code', 'nova_message_monthly_cap_exceeded',
      'periodStart', v_period,
      'completedUnits', v_period_row.completed_units,
      'reservedUnits', v_period_row.reserved_units,
      'capUnits', v_limit_units,
      'capUsd', round((v_period_row.cap_micros::numeric / 1000000), 2)
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

CREATE OR REPLACE FUNCTION public.fn_commit_nova_message(p_user_id text, p_request_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE v_reservation private.galx_nova_message_reservations;
BEGIN
  SELECT * INTO v_reservation FROM private.galx_nova_message_reservations
  WHERE user_id = p_user_id AND request_id = p_request_id FOR UPDATE;
  IF v_reservation.user_id IS NULL THEN RETURN jsonb_build_object('committed', false, 'reason', 'reservation_not_found'); END IF;
  IF v_reservation.state = 'completed' THEN RETURN jsonb_build_object('committed', true, 'idempotent', true); END IF;
  IF v_reservation.state = 'released' THEN RETURN jsonb_build_object('committed', false, 'reason', 'reservation_released'); END IF;
  UPDATE private.galx_nova_message_reservations SET state = 'completed', completed_at = now()
    WHERE user_id = p_user_id AND request_id = p_request_id;
  UPDATE private.galx_nova_message_usage_periods SET reserved_units = GREATEST(0, reserved_units - 1), completed_units = completed_units + 1, updated_at = now()
    WHERE user_id = p_user_id AND period_start = v_reservation.period_start;
  RETURN jsonb_build_object('committed', true, 'idempotent', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_release_nova_message(p_user_id text, p_request_id text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE v_reservation private.galx_nova_message_reservations;
BEGIN
  SELECT * INTO v_reservation FROM private.galx_nova_message_reservations
  WHERE user_id = p_user_id AND request_id = p_request_id FOR UPDATE;
  IF v_reservation.user_id IS NULL THEN RETURN jsonb_build_object('released', false, 'reason', 'reservation_not_found'); END IF;
  IF v_reservation.state <> 'reserved' THEN RETURN jsonb_build_object('released', true, 'idempotent', true, 'state', v_reservation.state); END IF;
  UPDATE private.galx_nova_message_reservations SET state = 'released', released_at = now()
    WHERE user_id = p_user_id AND request_id = p_request_id;
  UPDATE private.galx_nova_message_usage_periods SET reserved_units = GREATEST(0, reserved_units - 1), updated_at = now()
    WHERE user_id = p_user_id AND period_start = v_reservation.period_start;
  RETURN jsonb_build_object('released', true, 'idempotent', false);
END;
$$;

REVOKE ALL ON FUNCTION public.fn_reserve_nova_message(text, text, bigint, bigint) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_commit_nova_message(text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_release_nova_message(text, text) FROM PUBLIC, anon, authenticated;
