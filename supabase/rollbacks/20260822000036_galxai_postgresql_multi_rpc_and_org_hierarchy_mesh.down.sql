-- Rollback for 20260822000036_galxai_postgresql_multi_rpc_and_org_hierarchy_mesh.sql

DROP FUNCTION IF EXISTS fn_get_organization_full_hierarchy_state(UUID);
DROP FUNCTION IF EXISTS fn_batch_multi_rpc_dispatch(JSONB);
