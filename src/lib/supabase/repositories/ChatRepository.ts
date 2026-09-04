/**
 * GALXAI: Supabase Hybrid Chat Repository
 * High-performance chat session management, pin/archive persistence, message streams,
 * and BroccoliDB L1 reactive in-memory caching with PostgreSQL durable substrate.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '../client';
import { executePostgresQuery } from '../../db/postgres';
import { BroccoliDbTable } from '../../../core/broccolidb/broccolidb-table';
import type { ChatSession } from '../../../components/chat/ChatSidebar';
import type { ChatMessage } from '../../../components/chat/ChatMessageItem';
import type { CustomPersona } from '../../../components/chat/PersonaContracts';
import { PersonaRepository } from './PersonaRepository';

export interface DbChatConversationRow {
  id: string;
  user_id: string | null;
  persona_id: string | null;
  title: string;
  model_id: string;
  is_pinned: boolean;
  is_archived: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbChatMessageRow {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  alternative_contents: string[];
  active_index: number;
  thinking_content: string | null;
  model_id: string | null;
  persona_id: string | null;
  metrics: any;
  attachments: any;
  created_at: string;
}

type OwnedChatSession = ChatSession & { ownerId: string };
type OwnedChatMessage = ChatMessage & { conversationId: string; ownerId: string };

export class ChatRepositoryAccessError extends Error {
  constructor(message = 'Chat resource was not found or is not accessible.') {
    super(message);
    this.name = 'ChatRepositoryAccessError';
  }
}

export class ChatRepository {
  private static instance: ChatRepository;
  private readonly sessionTable: BroccoliDbTable<OwnedChatSession>;
  private readonly messageTable: BroccoliDbTable<OwnedChatMessage>;

  private constructor() {
    this.sessionTable = new BroccoliDbTable<OwnedChatSession>('galx_chat_sessions_l1');
    this.sessionTable.createIndex('id');
    this.sessionTable.createIndex('ownerId');
    this.sessionTable.createIndex('personaId');
    this.sessionTable.createIndex('isPinned');
    this.sessionTable.createIndex('isArchived');
    this.sessionTable.createSortedIndex('updatedAt');

    this.messageTable = new BroccoliDbTable<OwnedChatMessage>('galx_chat_messages_l1');
    this.messageTable.createIndex('id');
    this.messageTable.createIndex('conversationId');
    this.messageTable.createIndex('ownerId');
    this.messageTable.createSortedIndex('createdAt');
  }

  public static getInstance(): ChatRepository {
    if (!ChatRepository.instance) {
      ChatRepository.instance = new ChatRepository();
    }
    return ChatRepository.instance;
  }

  private requireUserId(userId?: string): string {
    if (!userId) throw new ChatRepositoryAccessError('Authentication is required for persisted chat data.');
    return userId;
  }

  private sessionCacheKey(userId: string, sessionId: string): string {
    return `${userId}:${sessionId}`;
  }

  private messageCacheKey(userId: string, messageId: string): string {
    return `${userId}:${messageId}`;
  }

  private async assertConversationOwner(conversationId: string, userId: string): Promise<void> {
    const cached = this.sessionTable.get(this.sessionCacheKey(userId, conversationId));
    if (cached) return;
    if (!isSupabaseConfigured()) throw new ChatRepositoryAccessError();

    const supabase = getSupabaseAdmin();
    const { data, error } = await (supabase.from as any)('chat_conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .is('deleted_at', null)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw new ChatRepositoryAccessError();
  }

  /**
   * List all active conversations for a user (or sandbox guest)
   */
  async getSessions(userId?: string): Promise<ChatSession[]> {
    const ownerId = this.requireUserId(userId);

    // 1. Server-authorized query with an exact-owner predicate (<1.5ms)
    const poolRes = await executePostgresQuery<DbChatConversationRow>(
      'SELECT * FROM public.chat_conversations WHERE user_id = $1 AND deleted_at IS NULL ORDER BY updated_at DESC;',
      [ownerId]
    );
    if (poolRes && poolRes.rows && poolRes.rows.length > 0) {
      const sessions: ChatSession[] = poolRes.rows.map((row: DbChatConversationRow) => this.mapRowToSession(row));
      for (const s of sessions) {
        this.sessionTable.put(this.sessionCacheKey(ownerId, s.id), { ...s, ownerId });
      }
      return sessions;
    }

    // 2. Supabase PostgREST Fallback
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        let query = (supabase.from as any)('chat_conversations')
          .select('*')
          .is('deleted_at', null)
          .order('updated_at', { ascending: false });

        query = query.eq('user_id', ownerId);

        const { data, error } = await query;
        if (!error && data && Array.isArray(data)) {
          const sessions: ChatSession[] = data.map((row: DbChatConversationRow) => this.mapRowToSession(row));
          for (const s of sessions) {
            this.sessionTable.put(this.sessionCacheKey(ownerId, s.id), { ...s, ownerId });
          }
          return sessions;
        }
      } catch (err) {
        console.warn('[ChatRepository] Supabase getSessions query fallback to L1:', err);
      }
    }

    // Fallback to in-memory L1 cache
    const cached = this.sessionTable.getAll().filter((session) => session.ownerId === ownerId);
    return cached.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  /**
   * Get single conversation session
   */
  async getSession(id: string, userId?: string): Promise<ChatSession | null> {
    const ownerId = this.requireUserId(userId);
    const cached = this.sessionTable.get(this.sessionCacheKey(ownerId, id));
    if (cached) return cached;

    // 1. Server-authorized query with an exact-owner predicate (<1.5ms)
    const poolRes = await executePostgresQuery<DbChatConversationRow>(
      'SELECT * FROM public.chat_conversations WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL LIMIT 1;',
      [id, ownerId]
    );
    if (poolRes && poolRes.rows && poolRes.rows[0]) {
      const session = this.mapRowToSession(poolRes.rows[0]);
      this.sessionTable.put(this.sessionCacheKey(ownerId, session.id), { ...session, ownerId });
      return session;
    }

    // 2. Supabase PostgREST Fallback
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await (supabase.from as any)('chat_conversations')
          .select('*')
          .eq('id', id)
          .eq('user_id', ownerId)
          .is('deleted_at', null)
          .maybeSingle();

        if (error) throw error;
        if (data) {
          const session = this.mapRowToSession(data);
          this.sessionTable.put(this.sessionCacheKey(ownerId, session.id), { ...session, ownerId });
          return session;
        }
      } catch {}
    }

    return null;
  }

  /**
   * Save / Upsert a chat session
   */
  async saveSession(session: ChatSession, userId?: string): Promise<ChatSession> {
    const ownerId = this.requireUserId(userId);

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseAdmin();
      const mutableValues = {
        title: session.title,
        model_id: session.modelId || 'gpt-5.6-sol',
        persona_id: session.personaId || null,
        is_pinned: Boolean(session.isPinned),
        is_archived: Boolean(session.isArchived),
        updated_at: new Date(session.updatedAt || Date.now()).toISOString(),
      };
      const { data: updated, error: updateError } = await (supabase.from as any)('chat_conversations')
        .update(mutableValues)
        .eq('id', session.id)
        .eq('user_id', ownerId)
        .select('id')
        .maybeSingle();
      if (updateError) throw updateError;

      if (!updated) {
        const { error: insertError } = await (supabase.from as any)('chat_conversations').insert({
          id: session.id,
          user_id: ownerId,
          ...mutableValues,
          created_at: new Date(session.createdAt || Date.now()).toISOString(),
        });
        if (insertError) {
          if (insertError.code === '23505') throw new ChatRepositoryAccessError();
          throw insertError;
        }
      }
    }

    this.sessionTable.put(this.sessionCacheKey(ownerId, session.id), { ...session, ownerId });
    return session;
  }

  /**
   * Delete or archive a chat conversation (and cascade its messages)
   */
  async deleteSession(id: string, userId?: string, hardDelete: boolean = true): Promise<boolean> {
    const ownerId = this.requireUserId(userId);

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseAdmin();
      const query = hardDelete
        ? (supabase.from as any)('chat_conversations').delete()
        : (supabase.from as any)('chat_conversations').update({
            is_archived: true,
            deleted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
      const { data, error } = await query
        .eq('id', id)
        .eq('user_id', ownerId)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new ChatRepositoryAccessError();
    }

    this.sessionTable.delete(this.sessionCacheKey(ownerId, id));
    for (const msg of this.messageTable.getAll()) {
      if (msg.ownerId === ownerId && msg.conversationId === id) {
        this.messageTable.delete(this.messageCacheKey(ownerId, msg.id));
      }
    }
    return true;
  }

  /**
   * Toggle Pin Status
   */
  async togglePin(id: string, isPinned: boolean, userId?: string): Promise<boolean> {
    const ownerId = this.requireUserId(userId);

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseAdmin();
      const { data, error } = await (supabase.from as any)('chat_conversations')
        .update({ is_pinned: isPinned, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', ownerId)
        .is('deleted_at', null)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new ChatRepositoryAccessError();
    }

    const key = this.sessionCacheKey(ownerId, id);
    const existing = this.sessionTable.get(key);
    if (existing) this.sessionTable.put(key, { ...existing, isPinned, updatedAt: Date.now() });
    return true;
  }

  /**
   * Toggle Archive Status (or delete)
   */
  async toggleArchive(id: string, isArchived: boolean, userId?: string): Promise<boolean> {
    const ownerId = this.requireUserId(userId);

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseAdmin();
      const { data, error } = await (supabase.from as any)('chat_conversations')
        .update({ is_archived: isArchived, updated_at: new Date().toISOString() })
        .eq('id', id)
        .eq('user_id', ownerId)
        .is('deleted_at', null)
        .select('id')
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new ChatRepositoryAccessError();
    }

    const key = this.sessionCacheKey(ownerId, id);
    const existing = this.sessionTable.get(key);
    if (existing) this.sessionTable.put(key, { ...existing, isArchived, updatedAt: Date.now() });
    return true;
  }

  /**
   * Retrieve messages for a given conversation
   */
  async getMessages(conversationId: string, userId?: string): Promise<ChatMessage[]> {
    const ownerId = this.requireUserId(userId);
    await this.assertConversationOwner(conversationId, ownerId);

    // 1. Server-authorized query after the exact-owner parent check (<1.5ms)
    const poolRes = await executePostgresQuery<DbChatMessageRow>(
      'SELECT * FROM public.chat_messages WHERE conversation_id = $1 ORDER BY created_at ASC;',
      [conversationId]
    );
    if (poolRes && poolRes.rows && poolRes.rows.length > 0) {
      const messages: ChatMessage[] = poolRes.rows.map((row: DbChatMessageRow) => this.mapRowToMessage(row));
      for (const msg of messages) {
        this.messageTable.put(this.messageCacheKey(ownerId, msg.id), { ...msg, conversationId, ownerId });
      }
      return messages;
    }

    // 2. Supabase PostgREST Fallback
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await (supabase.from as any)('chat_messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .order('created_at', { ascending: true });

        if (!error && data && Array.isArray(data)) {
          const messages: ChatMessage[] = data.map((row: DbChatMessageRow) => this.mapRowToMessage(row));
          for (const msg of messages) {
            this.messageTable.put(this.messageCacheKey(ownerId, msg.id), { ...msg, conversationId, ownerId });
          }
          return messages;
        }
      } catch (err) {
        console.warn('[ChatRepository] Supabase getMessages fallback to L1:', err);
      }
    }

    // Fallback to L1 cache
    const cached = this.messageTable.getAll().filter(
      (message) => message.ownerId === ownerId && message.conversationId === conversationId
    );
    return cached.sort((a, b) => a.createdAt - b.createdAt);
  }

  /**
   * Batch upsert messages for a conversation
   */
  async saveMessages(conversationId: string, messages: ChatMessage[], userId?: string): Promise<boolean> {
    const ownerId = this.requireUserId(userId);
    await this.assertConversationOwner(conversationId, ownerId);

    if (isSupabaseConfigured() && messages.length > 0) {
      const supabase = getSupabaseAdmin();
      const rows = messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        alternative_contents: m.alternativeContents || [m.content],
        active_index: m.activeIndex || 0,
        thinking_content: m.thinkingContent || null,
        model_id: m.modelId || null,
        persona_id: m.personaId || null,
        metrics: m.metrics || null,
        attachments: m.attachments || null,
        created_at: new Date(m.createdAt || Date.now()).toISOString(),
      }));
      const { data, error } = await (supabase.rpc as any)('fn_upsert_owned_chat_messages', {
        p_conversation_id: conversationId,
        p_user_id: ownerId,
        p_messages: rows,
      });
      if (error) throw error;
      if (!data?.success) throw new ChatRepositoryAccessError();
    }

    for (const msg of messages) {
      this.messageTable.put(this.messageCacheKey(ownerId, msg.id), {
        ...msg,
        conversationId,
        ownerId,
      });
    }
    return true;
  }

  /**
   * World-Class Keyset Delta Sync with ETag Caching (HTTP 304 Fast-Path)
   */
  async getChatDeltaSync(
    userId?: string,
    clientEtag?: string,
    sinceEpoch?: number,
    activeSessionId?: string
  ): Promise<{
    notModified: boolean;
    etag: string;
    sessions?: ChatSession[];
    activeSessionId?: string;
    messages?: ChatMessage[];
    multiSessionMessages?: Record<string, ChatMessage[]>;
    personas?: CustomPersona[];
  }> {
    const ownerId = this.requireUserId(userId);
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await (supabase.rpc as any)('fn_get_chat_delta_sync', {
          p_user_id: ownerId,
          p_client_etag: clientEtag || null,
          p_since_epoch: sinceEpoch || null,
          p_active_session_id: activeSessionId || null,
        });

        if (!error && data && data.success) {
          if (data.notModified) {
            return { notModified: true, etag: data.etag };
          }

          const sessions: ChatSession[] = (data.sessions || []).map((s: any) => ({
            id: s.id,
            title: s.title,
            modelId: s.modelId || 'gpt-5.6-sol',
            personaId: s.personaId || undefined,
            isPinned: Boolean(s.isPinned),
            isArchived: Boolean(s.isArchived),
            createdAt: Number(s.createdAt) || Date.now(),
            updatedAt: Number(s.updatedAt) || Date.now(),
          }));

          const messages: ChatMessage[] = (data.messages || []).map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            alternativeContents: m.alternativeContents || [m.content],
            activeIndex: m.activeIndex || 0,
            thinkingContent: m.thinkingContent || undefined,
            modelId: m.modelId || undefined,
            personaId: m.personaId || undefined,
            metrics: m.metrics || undefined,
            attachments: m.attachments || undefined,
            createdAt: Number(m.createdAt) || Date.now(),
          }));

          // Multi-Session Message Mesh Pre-warming (Top 5 Sessions)
          const multiSessionMessages: Record<string, ChatMessage[]> = {};
          if (data.multiSessionMessages && typeof data.multiSessionMessages === 'object') {
            for (const [sessId, rawMsgs] of Object.entries(data.multiSessionMessages)) {
              if (Array.isArray(rawMsgs)) {
                const parsedMsgs: ChatMessage[] = rawMsgs.map((m: any) => ({
                  id: m.id,
                  role: m.role,
                  content: m.content,
                  alternativeContents: m.alternativeContents || [m.content],
                  activeIndex: m.activeIndex || 0,
                  thinkingContent: m.thinkingContent || undefined,
                  modelId: m.modelId || undefined,
                  personaId: m.personaId || undefined,
                  metrics: m.metrics || undefined,
                  attachments: m.attachments || undefined,
                  createdAt: Number(m.createdAt) || Date.now(),
                }));
                multiSessionMessages[sessId] = parsedMsgs;
                // Pre-warm L1 memory table for this session
                for (const pm of parsedMsgs) {
                  this.messageTable.put(this.messageCacheKey(ownerId, pm.id), {
                    ...pm,
                    conversationId: sessId,
                    ownerId,
                  });
                }
              }
            }
          }

          const personas: CustomPersona[] = Array.isArray(data.personas)
            ? data.personas.map((p: any) => ({
                id: p.id,
                name: p.name,
                tagline: p.tagline || '',
                description: p.description || '',
                nickname: p.name,
                handle: `@${p.name.toLowerCase().replace(/[^a-z0-9_]/g, '')}`,
                animeArchetype: p.category || 'Anime AI Companion',
                avatarIcon: 'Sparkles',
                avatarGradient: 'from-purple-600 to-pink-600',
                greetingMessage: p.greetingMessage || 'Hello!',
                systemPrompt: p.systemPrompt || '',
                baseModelId: p.baseModelId || 'gpt-5.6-sol',
                conversationStarters: [],
                capabilities: { webSearch: true, deepReasoning: true },
                isPublic: Boolean(p.isPublic),
                isBuiltIn: Boolean(p.isBuiltIn),
                chatCount: p.interactionCount || 0,
                rating: 4.9,
                createdAt: Number(p.createdAt) || Date.now(),
              }))
            : [];

          for (const s of sessions) {
            this.sessionTable.put(this.sessionCacheKey(ownerId, s.id), { ...s, ownerId });
          }
          const resolvedActiveId = data.activeSessionId || activeSessionId;
          if (resolvedActiveId) {
            for (const m of messages) {
              this.messageTable.put(this.messageCacheKey(ownerId, m.id), {
                ...m,
                conversationId: resolvedActiveId,
                ownerId,
              });
            }
          }

          return {
            notModified: false,
            etag: data.etag,
            sessions,
            activeSessionId: resolvedActiveId,
            messages,
            multiSessionMessages,
            personas,
          };
        }
      } catch (err) {
        console.warn('[ChatRepository] fn_get_chat_delta_sync RPC fallback:', err);
      }
    }

    // Fallback: Full bootstrap resolution
    const bootstrap = await this.getChatCompositeBootstrap(ownerId, activeSessionId);
    return {
      notModified: false,
      etag: `"l1_${Date.now()}_${bootstrap.sessions.length}"`,
      sessions: bootstrap.sessions,
      activeSessionId: bootstrap.activeSessionId,
      messages: bootstrap.messages,
      personas: bootstrap.personas,
    };
  }

  /**
   * 1-Hop Atomic Composite Bootstrap:
   * Returns all sessions AND active messages in a single database roundtrip
   */
  async getChatCompositeBootstrap(
    userId?: string,
    activeSessionId?: string
  ): Promise<{ sessions: ChatSession[]; activeSessionId?: string; messages: ChatMessage[]; personas?: CustomPersona[] }> {
    const ownerId = this.requireUserId(userId);
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await (supabase.rpc as any)('fn_get_chat_composite_bootstrap', {
          p_user_id: ownerId,
          p_active_session_id: activeSessionId || null,
        });

        if (!error && data && data.success) {
          const sessions: ChatSession[] = (data.sessions || []).map((s: any) => ({
            id: s.id,
            title: s.title,
            modelId: s.modelId || 'gpt-5.6-sol',
            personaId: s.personaId || undefined,
            isPinned: Boolean(s.isPinned),
            isArchived: Boolean(s.isArchived),
            createdAt: Number(s.createdAt) || Date.now(),
            updatedAt: Number(s.updatedAt) || Date.now(),
          }));

          const messages: ChatMessage[] = (data.messages || []).map((m: any) => ({
            id: m.id,
            role: m.role,
            content: m.content,
            alternativeContents: m.alternativeContents || [m.content],
            activeIndex: m.activeIndex || 0,
            thinkingContent: m.thinkingContent || undefined,
            modelId: m.modelId || undefined,
            personaId: m.personaId || undefined,
            metrics: m.metrics || undefined,
            attachments: m.attachments || undefined,
            createdAt: Number(m.createdAt) || Date.now(),
          }));

          // Seed L1 cache
          for (const s of sessions) {
            this.sessionTable.put(this.sessionCacheKey(ownerId, s.id), { ...s, ownerId });
          }
          const resolvedActiveId = data.activeSessionId || activeSessionId;
          if (resolvedActiveId) {
            for (const m of messages) {
              this.messageTable.put(this.messageCacheKey(ownerId, m.id), {
                ...m,
                conversationId: resolvedActiveId,
                ownerId,
              });
            }
          }

          const personas = await PersonaRepository.getInstance().getAllPublicPersonas();
          return { sessions, activeSessionId: resolvedActiveId, messages, personas };
        }
      } catch (err) {
        console.warn('[ChatRepository] fn_get_chat_composite_bootstrap RPC fallback:', err);
      }
    }

    // Fallback: Resolve using L1 in-memory tables
    const sessions = await this.getSessions(ownerId);
    const resolvedActiveId = activeSessionId || (sessions.length > 0 ? sessions[0].id : undefined);
    const messages = resolvedActiveId ? await this.getMessages(resolvedActiveId, ownerId) : [];
    const personas = await PersonaRepository.getInstance().getAllPublicPersonas();
    return { sessions, activeSessionId: resolvedActiveId, messages, personas };
  }

  /**
   * Server-Side Stream Tap Persistence (Zero Extra Roundtrips)
   * Asynchronously records user prompt and completed streaming generation in volatile background RAM
   */
  public recordStreamCompletion(payload: {
    conversationId: string;
    userMessage?: { id: string; content: string; role?: 'user' };
    assistantMessage: {
      id: string;
      content: string;
      role?: 'assistant';
      modelId?: string;
      personaId?: string;
      thinkingContent?: string;
      metrics?: any;
    };
    userId?: string;
  }): void {
    const { conversationId, userMessage, assistantMessage, userId } = payload;
    const msgsToPersist: ChatMessage[] = [];

    if (userMessage) {
      msgsToPersist.push({
        id: userMessage.id,
        role: userMessage.role || 'user',
        content: userMessage.content,
        alternativeContents: [userMessage.content],
        activeIndex: 0,
        createdAt: Date.now() - 1000,
      });
    }

    msgsToPersist.push({
      id: assistantMessage.id,
      role: assistantMessage.role || 'assistant',
      content: assistantMessage.content,
      alternativeContents: [assistantMessage.content],
      activeIndex: 0,
      thinkingContent: assistantMessage.thinkingContent,
      modelId: assistantMessage.modelId,
      personaId: assistantMessage.personaId,
      metrics: assistantMessage.metrics,
      createdAt: Date.now(),
    });

    // Fire-and-forget sync to Postgres + BroccoliDB L1 cache (0 blocking latency on client stream)
    this.saveMessages(conversationId, msgsToPersist, userId).catch((err) => {
      console.warn('[ChatRepository] Stream tap async persistence warning:', err);
    });
  }

  /**
   * 1-Hop Atomic Bundle Sync:
   * Batches session metadata and messages in a single atomic database roundtrip
   */
  async syncChatBundle(payload: {
    session?: Partial<ChatSession>;
    messages?: ChatMessage[];
    deleteSessionId?: string;
    userId?: string;
  }): Promise<{ success: boolean; sessionId?: string; messagesSynced?: number }> {
    const { session, messages, deleteSessionId, userId } = payload;
    const ownerId = this.requireUserId(userId);
    const conversationId = session?.id || deleteSessionId;
    if (messages?.length && !session?.id) {
      throw new ChatRepositoryAccessError('A session ID is required when synchronizing messages.');
    }

    if (isSupabaseConfigured()) {
      const supabase = getSupabaseAdmin();
      const formattedMessages = (messages || []).map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        alternative_contents: m.alternativeContents || [m.content],
        active_index: m.activeIndex || 0,
        thinking_content: m.thinkingContent || null,
        model_id: m.modelId || null,
        persona_id: m.personaId || null,
        metrics: m.metrics || null,
        attachments: m.attachments || null,
        created_at_ms: m.createdAt || Date.now(),
      }));

      const { data, error } = await (supabase.rpc as any)('fn_sync_chat_bundle', {
        p_session: session ? {
          id: session.id,
          title: session.title,
          modelId: session.modelId,
          personaId: session.personaId || null,
          isPinned: Boolean(session.isPinned),
          isArchived: Boolean(session.isArchived),
        } : null,
        p_messages: formattedMessages.length > 0 ? formattedMessages : null,
        p_user_id: ownerId,
        p_delete_session_id: deleteSessionId || null,
      });
      if (error) throw error;
      if (!data?.success) throw new ChatRepositoryAccessError();
    }

    if (deleteSessionId) {
      this.sessionTable.delete(this.sessionCacheKey(ownerId, deleteSessionId));
      for (const message of this.messageTable.getAll()) {
        if (message.ownerId === ownerId && message.conversationId === deleteSessionId) {
          this.messageTable.delete(this.messageCacheKey(ownerId, message.id));
        }
      }
    }

    if (session?.id) {
      const existing = this.sessionTable.get(this.sessionCacheKey(ownerId, session.id));
      const completeSession = { ...existing, ...session } as ChatSession;
      this.sessionTable.put(this.sessionCacheKey(ownerId, session.id), { ...completeSession, ownerId });
    }

    if (messages?.length && conversationId) {
      for (const message of messages) {
        this.messageTable.put(this.messageCacheKey(ownerId, message.id), {
          ...message,
          conversationId,
          ownerId,
        });
      }
    }

    return { success: true, sessionId: session?.id, messagesSynced: messages?.length || 0 };
  }

  // --- Row Mappers ---

  private mapRowToSession(row: DbChatConversationRow): ChatSession {
    return {
      id: row.id,
      title: row.title,
      createdAt: new Date(row.created_at).getTime(),
      updatedAt: new Date(row.updated_at).getTime(),
      modelId: row.model_id || 'gpt-5.6-sol',
      personaId: row.persona_id || undefined,
      isPinned: Boolean(row.is_pinned),
      isArchived: Boolean(row.is_archived),
    };
  }

  private mapRowToMessage(row: DbChatMessageRow): ChatMessage {
    return {
      id: row.id,
      role: row.role,
      content: row.content,
      alternativeContents: Array.isArray(row.alternative_contents) ? row.alternative_contents : [row.content],
      activeIndex: row.active_index || 0,
      thinkingContent: row.thinking_content || undefined,
      modelId: row.model_id || undefined,
      personaId: row.persona_id || undefined,
      metrics: row.metrics || undefined,
      attachments: row.attachments || undefined,
      createdAt: new Date(row.created_at).getTime(),
    };
  }
}
