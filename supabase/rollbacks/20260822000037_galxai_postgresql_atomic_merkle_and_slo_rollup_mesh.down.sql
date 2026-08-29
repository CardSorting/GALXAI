-- Rollback for 20260822000037_galxai_postgresql_atomic_merkle_and_slo_rollup_mesh.sql

DROP FUNCTION IF EXISTS fn_ingest_canary_probe_and_eval_slo(JSONB);
DROP FUNCTION IF EXISTS fn_atomic_merkle_leaf_append(UUID, VARCHAR, VARCHAR, NUMERIC, TEXT, JSONB);
