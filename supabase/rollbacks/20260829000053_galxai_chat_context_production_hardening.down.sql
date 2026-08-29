-- ==========================================================================
-- GALXAI V53 emergency compatibility rollback
-- ==========================================================================
-- Security corrections are intentionally sticky: this rollback never restores
-- the permissive guest/null RLS policies or PUBLIC SECURITY DEFINER grants from
-- V39-V52. Roll back the application before running this script, then roll
-- forward with a corrective migration for any database behavior regression.

DROP FUNCTION IF EXISTS public.fn_release_seat_request_lease_v2(VARCHAR, VARCHAR);
DROP FUNCTION IF EXISTS public.fn_settle_seat_request_lease_v2(
  VARCHAR, VARCHAR, VARCHAR, INTEGER, NUMERIC, NUMERIC, VARCHAR, JSONB, JSONB
);
DROP FUNCTION IF EXISTS public.fn_evaluate_and_acquire_seat_gate_v2(
  VARCHAR, VARCHAR, VARCHAR, VARCHAR, BOOLEAN, NUMERIC, INTEGER, VARCHAR
);
DROP FUNCTION IF EXISTS public.fn_evaluate_and_acquire_seat_gate_v2(
  VARCHAR, VARCHAR, VARCHAR, VARCHAR, BOOLEAN, NUMERIC, INTEGER
);

DROP INDEX IF EXISTS public.idx_galx_seat_request_leases_active;
DROP TABLE IF EXISTS public.galx_seat_request_leases;

DROP FUNCTION IF EXISTS public.fn_upsert_owned_chat_messages(TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS public.fn_upsert_semantic_rolling_memory_v2(
  VARCHAR, VARCHAR, TEXT, INTEGER, VARCHAR, JSONB, JSONB, JSONB, JSONB,
  INTEGER, VARCHAR, VARCHAR, INTEGER, JSONB
);
DROP INDEX IF EXISTS public.uq_galx_seat_usage_request_id;
DROP INDEX IF EXISTS public.uq_galx_chat_document_chunk_natural_key;
DROP INDEX IF EXISTS public.uq_galx_chat_episode_natural_key;

-- Existing chat/context functions remain in their V53 exact-owner form. Restoring
-- vulnerable definitions is not a safe rollback operation.
