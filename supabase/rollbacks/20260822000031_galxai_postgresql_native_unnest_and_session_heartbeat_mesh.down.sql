-- Rollback for 20260822000031_galxai_postgresql_native_unnest_and_session_heartbeat_mesh.sql

DROP FUNCTION IF EXISTS fn_bulk_touch_sessions(VARCHAR[], BIGINT);
DROP FUNCTION IF EXISTS fn_bulk_unnest_draw_wallet_tokens(VARCHAR[], NUMERIC[], TEXT[], VARCHAR[], BIGINT[], BIGINT[], BIGINT[]);
