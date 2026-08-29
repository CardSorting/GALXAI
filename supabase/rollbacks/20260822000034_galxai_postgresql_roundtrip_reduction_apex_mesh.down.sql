-- Rollback for 20260822000034_galxai_postgresql_roundtrip_reduction_apex_mesh.sql

DROP FUNCTION IF EXISTS fn_route_model_atomic_eval(UUID, VARCHAR, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS fn_bulk_verify_deposit_and_match(JSONB);
DROP FUNCTION IF EXISTS fn_get_workspace_composite_state(UUID);
