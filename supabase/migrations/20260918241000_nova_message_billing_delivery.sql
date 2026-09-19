-- Private outbox lease/ack protocol for Stripe Billing Meter delivery.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '10s';

ALTER TABLE private.galx_message_billing_events
  ADD COLUMN IF NOT EXISTS lease_until timestamptz;

CREATE OR REPLACE FUNCTION public.fn_lease_nova_message_billing_events(p_limit integer DEFAULT 25)
RETURNS SETOF jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT e.id
    FROM private.galx_message_billing_events e
    WHERE e.status IN ('pending', 'failed')
      AND e.next_attempt_at <= now()
      AND (e.lease_until IS NULL OR e.lease_until <= now())
    ORDER BY e.next_attempt_at ASC, e.created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 25), 100))
  ), leased AS (
    UPDATE private.galx_message_billing_events e
    SET status = 'failed',
        attempt_count = e.attempt_count + 1,
        lease_until = now() + interval '5 minutes',
        next_attempt_at = now() + interval '5 minutes'
    FROM candidates c
    WHERE e.id = c.id
    RETURNING e.*
  )
  SELECT jsonb_build_object(
    'id', l.id,
    'userId', l.user_id,
    'requestId', l.request_id,
    'stripeCustomerId', customer.stripe_customer_id,
    'stripeMeterEventIdentifier', l.stripe_meter_event_identifier,
    'attemptCount', l.attempt_count,
    'createdAt', l.created_at
  )
  FROM leased l
  LEFT JOIN public.galx_stripe_customers customer ON customer.user_id = l.user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_mark_nova_message_billing_sent(p_id uuid, p_stripe_customer_id text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
BEGIN
  UPDATE private.galx_message_billing_events
  SET status = 'sent', stripe_customer_id = p_stripe_customer_id, sent_at = now(), lease_until = NULL, last_error_code = NULL
  WHERE id = p_id AND status = 'failed';
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_mark_nova_message_billing_failed(p_id uuid, p_error_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, pg_temp
AS $$
BEGIN
  UPDATE private.galx_message_billing_events
  SET status = 'failed', last_error_code = left(COALESCE(p_error_code, 'delivery_failed'), 120),
      next_attempt_at = now() + LEAST(interval '1 hour', (interval '30 seconds' * GREATEST(1, attempt_count))),
      lease_until = NULL
  WHERE id = p_id AND status = 'failed';
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_lease_nova_message_billing_events(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_mark_nova_message_billing_sent(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fn_mark_nova_message_billing_failed(uuid, text) FROM PUBLIC, anon, authenticated;
