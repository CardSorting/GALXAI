/**
 * GALXAI: Supabase Custom Personas & Anime Characters Repository
 * Real-time character resolution, user-created character management, and BroccoliDB L1 caching.
 */

import { getSupabaseAdmin, isSupabaseConfigured } from '../client';
import { CustomPersona, BUILTIN_ANIME_PERSONAS } from '../../../components/chat/PersonaContracts';
import { BroccoliDbTable } from '../../../core/broccolidb/broccolidb-table';

export class PersonaRepository {
  private static instance: PersonaRepository;
  private readonly personaTable: BroccoliDbTable<CustomPersona>;

  private constructor() {
    this.personaTable = new BroccoliDbTable<CustomPersona>('custom_personas_cache');
    this.personaTable.createIndex('handle');
    this.personaTable.createIndex('userId');
    this.personaTable.createIndex('isBuiltIn');
    this.personaTable.createIndex('animeArchetype');

    // Preload built-in anime personas into L1 cache
    for (const p of BUILTIN_ANIME_PERSONAS) {
      this.personaTable.put(p.id, p);
    }
  }

  public static getInstance(): PersonaRepository {
    if (!PersonaRepository.instance) {
      PersonaRepository.instance = new PersonaRepository();
    }
    return PersonaRepository.instance;
  }

  /**
   * Retrieves all public and built-in anime characters
   */
  async getAllPublicPersonas(): Promise<CustomPersona[]> {
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await (supabase.from as any)('custom_personas')
          .select('*')
          .or('is_public.eq.true,is_built_in.eq.true')
          .order('chat_count', { ascending: false });

        if (!error && data && data.length > 0) {
          const mapped = data.map((row: any) => this.mapRowToPersona(row));
          for (const p of mapped) {
            this.personaTable.put(p.id, p);
          }
          return mapped;
        }
      } catch {}
    }

    // Fallback to L1 cache
    const cached = this.personaTable.query({}) as CustomPersona[];
    if (cached.length > 0) return cached;
    return BUILTIN_ANIME_PERSONAS;
  }

  /**
   * Find persona by handle (e.g. "@aiko", "@kage")
   */
  async getPersonaByHandle(handle: string): Promise<CustomPersona | null> {
    const cleanHandle = handle.toLowerCase().startsWith('@') ? handle.toLowerCase() : `@${handle.toLowerCase()}`;

    // 1. Check L1 cache
    const cachedMatches = this.personaTable.query({
      where: { handle: { $eq: cleanHandle } }
    }) as CustomPersona[];
    if (cachedMatches.length > 0) return cachedMatches[0];

    // 2. Query Supabase
    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        const { data, error } = await (supabase.from as any)('custom_personas')
          .select('*')
          .ilike('handle', cleanHandle)
          .single();

        if (!error && data) {
          const mapped = this.mapRowToPersona(data);
          this.personaTable.put(mapped.id, mapped);
          return mapped;
        }
      } catch {}
    }

    return BUILTIN_ANIME_PERSONAS.find((p) => p.handle.toLowerCase() === cleanHandle) || null;
  }

  /**
   * Save or update a custom persona
   */
  async savePersona(persona: CustomPersona): Promise<CustomPersona> {
    this.personaTable.put(persona.id, persona);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await (supabase.from as any)('custom_personas').upsert({
          id: persona.id,
          user_id: persona.userId || null,
          name: persona.name,
          japanese_name: persona.japaneseName || null,
          nickname: persona.nickname,
          handle: persona.handle,
          anime_archetype: persona.animeArchetype,
          tagline: persona.tagline,
          description: persona.description,
          avatar_icon: persona.avatarIcon,
          avatar_gradient: persona.avatarGradient,
          avatar_badge: persona.avatarBadge || null,
          greeting_message: persona.greetingMessage,
          system_prompt: persona.systemPrompt,
          example_dialogue: persona.exampleDialogue || [],
          base_model_id: persona.baseModelId,
          conversation_starters: persona.conversationStarters || [],
          capabilities: persona.capabilities || {},
          is_public: persona.isPublic,
          is_built_in: persona.isBuiltIn,
          chat_count: persona.chatCount || 0,
          rating: persona.rating || 5.0,
          updated_at: new Date().toISOString(),
        });
      } catch {}
    }

    return persona;
  }

  /**
   * Delete a custom persona
   */
  async deletePersona(id: string, userId?: string): Promise<boolean> {
    this.personaTable.delete(id);

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        let query = (supabase.from as any)('custom_personas').delete().eq('id', id);
        if (userId) {
          query = query.eq('user_id', userId);
        }
        await query;
        return true;
      } catch {
        return false;
      }
    }

    return true;
  }

  /**
   * Increment chat interaction counter
   */
  async incrementChatCount(id: string): Promise<void> {
    const existing = this.personaTable.get(id);
    if (existing) {
      existing.chatCount = (existing.chatCount || 0) + 1;
      this.personaTable.put(id, existing);
    }

    if (isSupabaseConfigured()) {
      try {
        const supabase = getSupabaseAdmin();
        await (supabase.rpc as any)('fn_increment_persona_chat_count', { p_persona_id: id });
      } catch {}
    }
  }

  private mapRowToPersona(row: any): CustomPersona {
    return {
      id: row.id,
      userId: row.user_id || undefined,
      name: row.name,
      japaneseName: row.japanese_name || undefined,
      nickname: row.nickname,
      handle: row.handle,
      animeArchetype: row.anime_archetype || 'Specialist',
      tagline: row.tagline,
      description: row.description,
      avatarIcon: row.avatar_icon || 'Zap',
      avatarGradient: row.avatar_gradient || 'from-cyan-500 to-indigo-600',
      avatarBadge: row.avatar_badge || undefined,
      greetingMessage: row.greeting_message,
      systemPrompt: row.system_prompt,
      exampleDialogue: row.example_dialogue || [],
      baseModelId: row.base_model_id || 'gpt-5.6-sol',
      conversationStarters: row.conversation_starters || [],
      capabilities: row.capabilities || { webSearch: false, deepReasoning: true, codeInterpreter: true },
      isPublic: Boolean(row.is_public),
      isBuiltIn: Boolean(row.is_built_in),
      chatCount: Number(row.chat_count || 0),
      rating: Number(row.rating || 5.0),
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
      updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
    };
  }
}
