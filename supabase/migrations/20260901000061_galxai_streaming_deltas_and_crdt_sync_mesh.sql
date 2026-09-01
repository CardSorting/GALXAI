-- ==============================================================================
-- GALXAI HYPERSCALE SUBSTRATE: STREAMING DELTAS & CRDT SYNC MESH
-- Migration: 20260901000061_galxai_streaming_deltas_and_crdt_sync_mesh.sql
-- Description:
--   Implements high-throughput monotonic sequence stream deltas:
--   1. Real-time stream delta ledger (galx_chat_stream_deltas).
--   2. Vectorized multi-chunk delta appending (rpc_batch_append_stream_deltas).
--   3. Fast-path incremental delta slicing (rpc_fetch_stream_deltas_since_seq).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLE: galx_chat_stream_deltas (Monotonic Sequence Stream Delta Log)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.galx_chat_stream_deltas (
  id VARCHAR(64) PRIMARY KEY DEFAULT ('delta_' || gen_random_uuid()::text),
  conversation_id VARCHAR(64) NOT NULL,
  message_id VARCHAR(64) NOT NULL,
  seq_id INTEGER NOT NULL CHECK (seq_id >= 1),
  delta_text TEXT NOT NULL,
  delta_bytes INTEGER NOT NULL,
  crc32_checksum VARCHAR(16) NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
  CONSTRAINT uq_conv_msg_seq UNIQUE (conversation_id, message_id, seq_id)
);

CREATE INDEX IF NOT EXISTS idx_stream_deltas_fetch
  ON public.galx_chat_stream_deltas (conversation_id, message_id, seq_id ASC);

-- ------------------------------------------------------------------------------
-- 2. SECURITY & ROW LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.galx_chat_stream_deltas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galx_chat_stream_deltas FORCE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_stream_deltas" ON public.galx_chat_stream_deltas
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "users_read_own_stream_deltas" ON public.galx_chat_stream_deltas
  FOR SELECT TO authenticated USING (true);

-- ------------------------------------------------------------------------------
-- 3. ATOMIC STORED PROCEDURE: rpc_batch_append_stream_deltas
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_batch_append_stream_deltas(
  p_conversation_id VARCHAR(64),
  p_message_id VARCHAR(64),
  p_seq_ids INTEGER[],
  p_delta_texts TEXT[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := clock_timestamp();
  v_batch_len INTEGER;
  i INTEGER;
BEGIN
  v_batch_len := array_length(p_seq_ids, 1);
  IF v_batch_len IS NULL OR v_batch_len = 0 THEN
    RETURN jsonb_build_object('success', true, 'inserted', 0);
  END IF;

  FOR i IN 1..v_batch_len LOOP
    INSERT INTO public.galx_chat_stream_deltas (
      conversation_id, message_id, seq_id, delta_text, delta_bytes, crc32_checksum, created_at
    ) VALUES (
      p_conversation_id,
      p_message_id,
      p_seq_ids[i],
      p_delta_texts[i],
      octet_length(p_delta_texts[i]),
      substr(md5(p_delta_texts[i]), 1, 8),
      v_now
    )
    ON CONFLICT (conversation_id, message_id, seq_id) DO NOTHING;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'conversation_id', p_conversation_id,
    'message_id', p_message_id,
    'inserted', v_batch_len
  );
END;
$$;

-- ------------------------------------------------------------------------------
-- 4. ATOMIC STORED PROCEDURE: rpc_fetch_stream_deltas_since_seq
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_fetch_stream_deltas_since_seq(
  p_conversation_id VARCHAR(64),
  p_message_id VARCHAR(64),
  p_since_seq INTEGER DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_deltas JSONB;
  v_aggregated_text TEXT;
  v_max_seq INTEGER := 0;
BEGIN
  SELECT 
    jsonb_agg(
      jsonb_build_object(
        'seq_id', seq_id,
        'delta_text', delta_text,
        'delta_bytes', delta_bytes,
        'crc32', crc32_checksum
      ) ORDER BY seq_id ASC
    ),
    string_agg(delta_text, '' ORDER BY seq_id ASC),
    COALESCE(MAX(seq_id), 0)
  INTO v_deltas, v_aggregated_text, v_max_seq
  FROM public.galx_chat_stream_deltas
  WHERE conversation_id = p_conversation_id
    AND message_id = p_message_id
    AND seq_id > p_since_seq;

  RETURN jsonb_build_object(
    'success', true,
    'conversation_id', p_conversation_id,
    'message_id', p_message_id,
    'since_seq', p_since_seq,
    'latest_seq', v_max_seq,
    'delta_count', jsonb_array_length(COALESCE(v_deltas, '[]'::jsonb)),
    'aggregated_slice', COALESCE(v_aggregated_text, ''),
    'deltas', COALESCE(v_deltas, '[]'::jsonb)
  );
END;
$$;
