-- ============================================================================
-- MIGRATION: 20260903200417_galxai_tenant_id_constraints_and_leakproof_rls_armor.sql
-- DESCRIPTION: Idempotent CHECK constraints on tenant ID validity, LEAKPROOF RLS optimization, and session validation
-- GOVERNANCE: Paranoid Database Governance (AOP-DB Phase 3)
-- ============================================================================

-- 1. IDEMPOTENT CHECK CONSTRAINTS ON TENANT IDENTIFIERS
-- Prevents whitespace, empty strings, or oversized identifiers from polluting multi-tenant isolation
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_dev_keys_user_id_valid'
          AND conrelid = 'public.galx_developer_keys'::regclass
    ) THEN
        ALTER TABLE public.galx_developer_keys
        ADD CONSTRAINT chk_dev_keys_user_id_valid
        CHECK (user_id IS NOT NULL AND length(trim(user_id)) > 0 AND length(user_id) <= 128);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_chat_conv_user_id_valid'
          AND conrelid = 'public.chat_conversations'::regclass
    ) THEN
        ALTER TABLE public.chat_conversations
        ADD CONSTRAINT chk_chat_conv_user_id_valid
        CHECK (user_id IS NULL OR (length(trim(user_id)) > 0 AND length(user_id) <= 128));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_personas_user_id_valid'
          AND conrelid = 'public.custom_personas'::regclass
    ) THEN
        ALTER TABLE public.custom_personas
        ADD CONSTRAINT chk_personas_user_id_valid
        CHECK (user_id IS NULL OR (length(trim(user_id)) > 0 AND length(user_id) <= 128));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_images_user_id_valid'
          AND conrelid = 'public.image_generations'::regclass
    ) THEN
        ALTER TABLE public.image_generations
        ADD CONSTRAINT chk_images_user_id_valid
        CHECK (user_id IS NULL OR (length(trim(user_id)) > 0 AND length(user_id) <= 128));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_tasks_user_id_valid'
          AND conrelid = 'public.galx_tasks'::regclass
    ) THEN
        ALTER TABLE public.galx_tasks
        ADD CONSTRAINT chk_tasks_user_id_valid
        CHECK (user_id IS NOT NULL AND length(trim(user_id)) > 0 AND length(user_id) <= 128);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_wallets_user_id_valid'
          AND conrelid = 'public.galx_wallets'::regclass
    ) THEN
        ALTER TABLE public.galx_wallets
        ADD CONSTRAINT chk_wallets_user_id_valid
        CHECK (user_id IS NOT NULL AND length(trim(user_id)) > 0 AND length(user_id) <= 128);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_audit_logs_user_id_valid'
          AND conrelid = 'public.galx_audit_logs'::regclass
    ) THEN
        ALTER TABLE public.galx_audit_logs
        ADD CONSTRAINT chk_audit_logs_user_id_valid
        CHECK (user_id IS NULL OR (length(trim(user_id)) > 0 AND length(user_id) <= 128));
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_chat_rolling_mem_user_id_valid'
          AND conrelid = 'public.galx_chat_rolling_memory'::regclass
    ) THEN
        ALTER TABLE public.galx_chat_rolling_memory
        ADD CONSTRAINT chk_chat_rolling_mem_user_id_valid
        CHECK (user_id IS NOT NULL AND length(trim(user_id)) > 0 AND length(user_id) <= 128);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_budget_alerts_user_id_valid'
          AND conrelid = 'public.galx_budget_alerts'::regclass
    ) THEN
        ALTER TABLE public.galx_budget_alerts
        ADD CONSTRAINT chk_budget_alerts_user_id_valid
        CHECK (user_id IS NOT NULL AND length(trim(user_id)) > 0 AND length(user_id) <= 128);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'chk_stripe_customers_user_id_valid'
          AND conrelid = 'public.galx_stripe_customers'::regclass
    ) THEN
        ALTER TABLE public.galx_stripe_customers
        ADD CONSTRAINT chk_stripe_customers_user_id_valid
        CHECK (user_id IS NOT NULL AND length(trim(user_id)) > 0 AND length(user_id) <= 128);
    END IF;
END $$;

-- 2. LEAKPROOF RLS OPTIMIZATION
-- Grants the query optimizer authority to push down predicates without side-channel data leakage
DO $$ BEGIN
    ALTER FUNCTION public.fn_is_tenant_resource_owner(text) LEAKPROOF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$ BEGIN
    ALTER FUNCTION public.fn_can_access_conversation(text) LEAKPROOF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. SESSION REVOCATION CHECK PROCEDURE
-- Fast verification that an in-flight token has not been revoked in the token revocation registry
CREATE OR REPLACE FUNCTION public.fn_validate_session_active(p_token_hash text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF p_token_hash IS NULL OR trim(p_token_hash) = '' THEN
        RETURN FALSE;
    END IF;

    -- Verify absence from the active revocation log
    IF EXISTS (
        SELECT 1 FROM public.galx_token_revocation_log
        WHERE token_hash = p_token_hash
          AND expires_at_ms > (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint
    ) THEN
        RETURN FALSE;
    END IF;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_validate_session_active(text) TO authenticated, service_role;
