-- Rollback for 20260822000033_galxai_postgresql_composite_gateway_pipeline_mesh.sql

DROP FUNCTION IF EXISTS fn_gateway_postflight_composite_mesh(VARCHAR, UUID, VARCHAR, VARCHAR, NUMERIC, VARCHAR, INTEGER, INTEGER, INTEGER, INTEGER, INTEGER, VARCHAR);
DROP FUNCTION IF EXISTS fn_gateway_preflight_composite_mesh(VARCHAR, VARCHAR, NUMERIC, VARCHAR);
