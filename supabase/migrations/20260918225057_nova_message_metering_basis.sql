-- Developer API consumption is measured as one completed message per request.
-- Keep the historical token and cost columns for private reconciliation only;
-- they are not a customer-facing pricing basis.
SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '10s';

ALTER TABLE public.galx_seat_rolling_usage_events
  ADD COLUMN IF NOT EXISTS metering_basis text
  GENERATED ALWAYS AS (
    CASE
      WHEN units = 1.0 AND tokens_consumed = 0 AND cost_usd = 0.0 THEN 'message'
      ELSE 'legacy_token'
    END
  ) STORED;

ALTER TABLE public.galx_seat_rolling_usage_events
  DROP CONSTRAINT IF EXISTS galx_seat_rolling_metering_basis_check;

ALTER TABLE public.galx_seat_rolling_usage_events
  ADD CONSTRAINT galx_seat_rolling_metering_basis_check
  CHECK (metering_basis IN ('message', 'legacy_token'));

CREATE INDEX IF NOT EXISTS idx_galx_seat_rolling_message_usage
  ON public.galx_seat_rolling_usage_events (user_id, created_at DESC)
  WHERE metering_basis = 'message';

COMMENT ON COLUMN public.galx_seat_rolling_usage_events.metering_basis IS
  'Private accounting classification. Developer API usage is message-based; legacy token rows remain historical/provider reconciliation data.';
