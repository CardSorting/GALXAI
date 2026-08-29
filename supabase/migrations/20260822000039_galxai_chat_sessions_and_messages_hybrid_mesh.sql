-- =========================================================================
-- GALXAI SUBSTRATE POSTGRESQL MIGRATION: V39
-- Hybrid Chat Sessions, Messages, Pins, Archive & BroccoliDB Sync Mesh
-- =========================================================================

-- 1. Create or Update Chat Conversations Table
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  persona_id TEXT REFERENCES public.custom_personas(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  model_id TEXT NOT NULL DEFAULT 'gpt-5.6-sol',
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure columns exist if table was created in an earlier partial migration
DO $$ BEGIN
  ALTER TABLE public.chat_conversations ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;
  ALTER TABLE public.chat_conversations ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;
  ALTER TABLE public.chat_conversations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  ALTER TABLE public.chat_conversations ALTER COLUMN user_id DROP NOT NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 2. Create or Update Chat Messages Table
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  alternative_contents JSONB NOT NULL DEFAULT '[]'::jsonb,
  active_index INTEGER NOT NULL DEFAULT 0,
  thinking_content TEXT,
  model_id TEXT,
  persona_id TEXT,
  metrics JSONB,
  attachments JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure columns exist if table was created in earlier migration
DO $$ BEGIN
  ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS persona_id TEXT;
  ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS attachments JSONB;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- 3. High-Performance Secondary & Partial Indexes
CREATE INDEX IF NOT EXISTS idx_chat_conv_user_updated 
  ON public.chat_conversations (user_id, updated_at DESC) 
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_chat_conv_pinned 
  ON public.chat_conversations (user_id, updated_at DESC) 
  WHERE is_pinned = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_chat_conv_archived 
  ON public.chat_conversations (user_id, updated_at DESC) 
  WHERE is_archived = true AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_chat_conv_deleted 
  ON public.chat_conversations (deleted_at) 
  WHERE deleted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_conv_created 
  ON public.chat_messages (conversation_id, created_at ASC);

-- 4. Enable Row Level Security
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for Chat Conversations
DO $$ BEGIN
  CREATE POLICY "Users and guests can read their own conversations" ON public.chat_conversations
    FOR SELECT USING (
      auth.uid() IS NULL 
      OR user_id = auth.uid()::text 
      OR user_id IS NULL 
      OR user_id LIKE 'guest_%'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users and guests can insert conversations" ON public.chat_conversations
    FOR INSERT WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users and guests can update their own conversations" ON public.chat_conversations
    FOR UPDATE USING (
      auth.uid() IS NULL 
      OR user_id = auth.uid()::text 
      OR user_id IS NULL 
      OR user_id LIKE 'guest_%'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users and guests can delete their own conversations" ON public.chat_conversations
    FOR DELETE USING (
      auth.uid() IS NULL 
      OR user_id = auth.uid()::text 
      OR user_id IS NULL 
      OR user_id LIKE 'guest_%'
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 6. RLS Policies for Chat Messages
DO $$ BEGIN
  CREATE POLICY "Users can read messages of accessible conversations" ON public.chat_messages
    FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.chat_conversations c
        WHERE c.id = chat_messages.conversation_id
          AND (
            auth.uid() IS NULL 
            OR c.user_id = auth.uid()::text 
            OR c.user_id IS NULL 
            OR c.user_id LIKE 'guest_%'
          )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can insert messages into accessible conversations" ON public.chat_messages
    FOR INSERT WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.chat_conversations c
        WHERE c.id = chat_messages.conversation_id
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users can delete messages of accessible conversations" ON public.chat_messages
    FOR DELETE USING (
      EXISTS (
        SELECT 1 FROM public.chat_conversations c
        WHERE c.id = chat_messages.conversation_id
          AND (
            auth.uid() IS NULL 
            OR c.user_id = auth.uid()::text 
            OR c.user_id IS NULL 
            OR c.user_id LIKE 'guest_%'
          )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 7. Atomic Stored Procedures for High-Throughput Hybrid Sync
CREATE OR REPLACE FUNCTION public.galx_sync_chat_session(
  p_id TEXT,
  p_user_id TEXT,
  p_title TEXT,
  p_model_id TEXT,
  p_persona_id TEXT DEFAULT NULL,
  p_is_pinned BOOLEAN DEFAULT false,
  p_is_archived BOOLEAN DEFAULT false
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result JSONB;
BEGIN
  INSERT INTO public.chat_conversations (
    id, user_id, title, model_id, persona_id, is_pinned, is_archived, updated_at
  ) VALUES (
    p_id, p_user_id, p_title, p_model_id, p_persona_id, p_is_pinned, p_is_archived, NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    model_id = EXCLUDED.model_id,
    persona_id = COALESCE(EXCLUDED.persona_id, chat_conversations.persona_id),
    is_pinned = EXCLUDED.is_pinned,
    is_archived = EXCLUDED.is_archived,
    updated_at = NOW()
  WHERE chat_conversations.id = p_id;

  SELECT row_to_json(c)::jsonb INTO v_result
  FROM public.chat_conversations c
  WHERE c.id = p_id;

  RETURN v_result;
END;
$$;

CREATE OR REPLACE FUNCTION public.galx_delete_chat_conversation(
  p_id TEXT,
  p_user_id TEXT DEFAULT NULL,
  p_hard_delete BOOLEAN DEFAULT true
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF p_hard_delete THEN
    DELETE FROM public.chat_conversations
    WHERE id = p_id
      AND (p_user_id IS NULL OR user_id = p_user_id OR user_id IS NULL OR user_id LIKE 'guest_%');
  ELSE
    UPDATE public.chat_conversations
    SET is_archived = true, deleted_at = NOW(), updated_at = NOW()
    WHERE id = p_id
      AND (p_user_id IS NULL OR user_id = p_user_id OR user_id IS NULL OR user_id LIKE 'guest_%');
  END IF;

  RETURN FOUND;
END;
$$;
