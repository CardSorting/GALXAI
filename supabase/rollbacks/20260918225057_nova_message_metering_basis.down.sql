SET LOCAL lock_timeout = '3s';
SET LOCAL statement_timeout = '10s';

DROP INDEX IF EXISTS public.idx_galx_seat_rolling_message_usage;
ALTER TABLE public.galx_seat_rolling_usage_events
  DROP CONSTRAINT IF EXISTS galx_seat_rolling_metering_basis_check;
ALTER TABLE public.galx_seat_rolling_usage_events
  DROP COLUMN IF EXISTS metering_basis;
