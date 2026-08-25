-- ============================================================================
-- Rollback: 20260822000016_galxai_project_allocations_and_smart_routing_mesh.down.sql
-- Description: Deterministic 1-click rollback for Migration 16.
-- ============================================================================

DROP FUNCTION IF EXISTS public.galx_allocate_department_spend(UUID, TEXT, NUMERIC);
DROP FUNCTION IF EXISTS public.galx_evaluate_smart_model_route(UUID, TEXT, NUMERIC);

DROP TABLE IF EXISTS public.galx_department_cost_allocations CASCADE;
DROP TABLE IF EXISTS public.galx_billing_notification_channels CASCADE;
DROP TABLE IF EXISTS public.galx_model_routing_rules CASCADE;
DROP TABLE IF EXISTS public.galx_project_spend_allocations CASCADE;
