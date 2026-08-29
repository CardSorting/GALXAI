-- ROLLBACK: Migration 45 (Seat Zero Roundtrip Composite Pipeline Apex)
DROP FUNCTION IF EXISTS public.fn_get_chat_delta_sync_with_seat_telemetry(VARCHAR, TIMESTAMPTZ, VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS public.fn_settle_seat_stream_completion_composite(VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, VARCHAR, NUMERIC, INT, NUMERIC, VARCHAR, VARCHAR, JSONB, JSONB);
DROP FUNCTION IF EXISTS public.fn_evaluate_and_acquire_seat_gate(VARCHAR, VARCHAR, VARCHAR, NUMERIC, INT);
