-- Durable, idempotent handoff for completed Nova Developer messages.
-- This stores internal billing work only; it does not create a Stripe meter,
-- publish a rate, or charge a customer.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '10s';

CREATE TABLE IF NOT EXISTS private.galx_message_billing_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  model_id text NOT NULL,
  request_id text NOT NULL,
  contract_version text NOT NULL,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity = 1),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'void')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  stripe_customer_id text,
  stripe_meter_event_identifier text,
  last_error_code text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  UNIQUE (user_id, request_id, contract_version)
);

ALTER TABLE private.galx_message_billing_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS galx_message_billing_events_pending_idx
  ON private.galx_message_billing_events (next_attempt_at, created_at)
  WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.fn_enqueue_message_billing_event(
  p_user_id text,
  p_model_id text,
  p_request_id text,
  p_contract_version text DEFAULT 'nova-message-v1'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
DECLARE
  v_event private.galx_message_billing_events;
BEGIN
  IF NULLIF(trim(p_user_id), '') IS NULL
     OR p_user_id = 'anonymous_developer'
     OR NULLIF(trim(p_request_id), '') IS NULL THEN
    RETURN jsonb_build_object('enqueued', false, 'reason', 'missing_identity_or_request');
  END IF;

  INSERT INTO private.galx_message_billing_events (
    user_id, model_id, request_id, contract_version, stripe_meter_event_identifier
  ) VALUES (
    p_user_id, p_model_id, p_request_id, p_contract_version,
    'galx_' || replace(p_request_id, '-', '') || '_' || p_contract_version
  )
  ON CONFLICT (user_id, request_id, contract_version) DO NOTHING
  RETURNING * INTO v_event;

  IF v_event.id IS NULL THEN
    SELECT * INTO v_event
    FROM private.galx_message_billing_events
    WHERE user_id = p_user_id
      AND request_id = p_request_id
      AND contract_version = p_contract_version;
  END IF;

  RETURN jsonb_build_object(
    'enqueued', true,
    'eventId', v_event.id,
    'status', v_event.status,
    'deduplicated', v_event.created_at < now() - interval '1 second'
  );
END;
$$;

REVOKE ALL ON FUNCTION public.fn_enqueue_message_billing_event(text, text, text, text) FROM PUBLIC;
COMMENT ON TABLE private.galx_message_billing_events IS
  'Private idempotent outbox for future per-message billing. No public rate or live Stripe meter is implied.';
