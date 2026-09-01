-- ==============================================================================
-- GALXAI HYPERSCALE SUBSTRATE: AUTHORITATIVE MERKLE EPOCHS & GOVERNOR MESH
-- Migration: 20260901000071_galxai_authoritative_merkle_epochs_and_governor_mesh.sql
-- Description:
--   Cemented Postgres data authority with Merkle epoch tracking and circuit governor:
--   1. Authoritative Data Epochs Table (galx_authoritative_data_epochs).
--   2. Atomic Epoch Validation & Advance RPCs (rpc_validate_authoritative_data_epoch, rpc_advance_authoritative_epoch).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLE: galx_authoritative_data_epochs
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.galx_authoritative_data_epochs (
  id VARCHAR(64) PRIMARY KEY DEFAULT ('ep_' || gen_random_uuid()::text),
  entity_type VARCHAR(64) NOT NULL,
  entity_id VARCHAR(64) NOT NULL,
  version_epoch BIGINT NOT NULL DEFAULT 1,
  merkle_root_hash VARCHAR(64) NOT NULL DEFAULT '0000000000000000000000000000000000000000000000000000000000000000',
  last_authoritative_write_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_entity_epoch UNIQUE (entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_authoritative_epochs_lookup
  ON public.galx_authoritative_data_epochs (entity_type, entity_id, version_epoch DESC);

-- ------------------------------------------------------------------------------
-- 2. SECURITY & ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.galx_authoritative_data_epochs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_authoritative_data_epochs FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_data_epochs" ON public.galx_authoritative_data_epochs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "public_read_data_epochs" ON public.galx_authoritative_data_epochs
  FOR SELECT TO authenticated USING (true);

-- ------------------------------------------------------------------------------
-- 3. ATOMIC STORED PROCEDURE: rpc_validate_authoritative_data_epoch
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_validate_authoritative_data_epoch(
  p_entity_type VARCHAR(64),
  p_entity_id VARCHAR(64),
  p_client_epoch BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_server_epoch BIGINT;
  v_merkle_hash VARCHAR(64);
BEGIN
  SELECT version_epoch, merkle_root_hash
  INTO v_server_epoch, v_merkle_hash
  FROM public.galx_authoritative_data_epochs
  WHERE entity_type = p_entity_type AND entity_id = p_entity_id;

  IF v_server_epoch IS NULL THEN
    -- Initialize if first probe
    INSERT INTO public.galx_authoritative_data_epochs (
      entity_type, entity_id, version_epoch, merkle_root_hash
    ) VALUES (
      p_entity_type, p_entity_id, 1, md5(p_entity_type || ':' || p_entity_id)
    )
    ON CONFLICT (entity_type, entity_id) DO NOTHING;

    RETURN jsonb_build_object(
      'is_authoritative_current', (p_client_epoch = 1),
      'server_epoch', 1,
      'merkle_hash', md5(p_entity_type || ':' || p_entity_id)
    );
  END IF;

  RETURN jsonb_build_object(
    'is_authoritative_current', (p_client_epoch = v_server_epoch),
    'server_epoch', v_server_epoch,
    'merkle_hash', v_merkle_hash
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. ATOMIC STORED PROCEDURE: rpc_advance_authoritative_epoch
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_advance_authoritative_epoch(
  p_entity_type VARCHAR(64),
  p_entity_id VARCHAR(64),
  p_new_merkle_hash VARCHAR(64)
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_record RECORD;
BEGIN
  INSERT INTO public.galx_authoritative_data_epochs (
    entity_type, entity_id, version_epoch, merkle_root_hash,
    last_authoritative_write_at, created_at, updated_at
  ) VALUES (
    p_entity_type, p_entity_id, 1, p_new_merkle_hash,
    v_now, v_now, v_now
  )
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    version_epoch = public.galx_authoritative_data_epochs.version_epoch + 1,
    merkle_root_hash = p_new_merkle_hash,
    last_authoritative_write_at = v_now,
    updated_at = v_now
  RETURNING * INTO v_record;

  RETURN jsonb_build_object(
    'success', true,
    'entity_type', v_record.entity_type,
    'entity_id', v_record.entity_id,
    'version_epoch', v_record.version_epoch,
    'merkle_root_hash', v_record.merkle_root_hash,
    'updated_at', v_record.updated_at
  );
END;
$$;
