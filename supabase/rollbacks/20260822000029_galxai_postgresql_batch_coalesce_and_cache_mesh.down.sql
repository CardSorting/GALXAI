-- Rollback for 20260822000029_galxai_postgresql_batch_coalesce_and_cache_mesh.sql

DROP FUNCTION IF EXISTS fn_batch_record_telemetry(JSONB);
DROP FUNCTION IF EXISTS fn_coalesced_wallet_batch_draw(JSONB);
