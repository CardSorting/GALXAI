-- ROLLBACK: Migration 44 (Seat Dual Rolling Windows and Concurrency Mesh)
DROP FUNCTION IF EXISTS public.fn_release_seat_concurrency_slot(VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS public.fn_acquire_seat_concurrency_slot(VARCHAR, VARCHAR, INT);
DROP FUNCTION IF EXISTS public.fn_get_seat_rolling_telemetry(VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS public.fn_record_seat_rolling_usage(VARCHAR, VARCHAR, VARCHAR, NUMERIC, INT, NUMERIC, VARCHAR);
DROP FUNCTION IF EXISTS public.fn_format_rolling_duration(BIGINT);
DROP TABLE IF EXISTS public.galx_seat_rolling_windows_state CASCADE;
DROP TABLE IF EXISTS public.galx_seat_rolling_usage_events CASCADE;
