import { NextRequest, NextResponse } from 'next/server';
import { PersonaRepository } from '@/lib/supabase/repositories/PersonaRepository';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import { GalxSeatTierEngine } from '@/core/subscription/GalxSeatTierEngine';
import type { CustomPersona } from '@/components/chat/PersonaContracts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>?/gm, '').trim();
}

function sanitizeHandle(raw: string): string {
  const clean = raw.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase().slice(0, 32);
  return `@${clean || 'companion'}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const handle = searchParams.get('handle');
    const repo = PersonaRepository.getInstance();

    if (handle) {
      const persona = await repo.getPersonaByHandle(handle);
      if (!persona) {
        return NextResponse.json({ error: 'Persona not found' }, { status: 404 });
      }
      return NextResponse.json({ persona });
    }

    const personas = await repo.getAllPublicPersonas();
    return NextResponse.json({ personas });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch personas' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);

    const body = (await req.json().catch(() => ({}))) as Partial<CustomPersona>;
    const rawName = stripHtml(body.name || '');
    const rawGreeting = stripHtml(body.greetingMessage || '');
    const rawSystemPrompt = stripHtml(body.systemPrompt || '');

    if (!rawName || !rawGreeting || !rawSystemPrompt) {
      return NextResponse.json(
        { error: 'Missing or empty required companion fields: name, greetingMessage, systemPrompt' },
        { status: 400 }
      );
    }

    const cleanHandle = sanitizeHandle(body.handle || rawName);
    const baseModelId = body.baseModelId || 'gpt-5.6-sol';

    // Validate Model Entitlement for the companion's base engine
    const seatEngine = GalxSeatTierEngine.getInstance();
    const entitlement = await seatEngine.resolveUserSeatTier(authResult);

    try {
      seatEngine.validateModelEntitlement(entitlement, baseModelId);
    } catch {
      // Graceful fallback to default allowed model if requested model exceeds tier
      body.baseModelId = entitlement.allowedModels[0] || 'gpt-5.6-sol';
    }

    const repo = PersonaRepository.getInstance();
    const personaId = body.id || `persona_custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newPersona: CustomPersona = {
      id: personaId,
      userId: authResult.userId || undefined,
      name: rawName.slice(0, 64),
      japaneseName: body.japaneseName ? stripHtml(body.japaneseName).slice(0, 32) : undefined,
      nickname: rawName.slice(0, 64),
      handle: cleanHandle,
      animeArchetype: stripHtml(body.animeArchetype || 'Custom Companion').slice(0, 48),
      tagline: stripHtml(body.tagline || `${body.animeArchetype || 'AI'} Companion`).slice(0, 140),
      description: stripHtml(body.description || body.tagline || '').slice(0, 280),
      avatarIcon: body.avatarIcon || 'Sparkles',
      avatarGradient: body.avatarGradient || 'from-cyan-500 via-indigo-500 to-purple-600',
      avatarBadge: stripHtml(body.avatarBadge || 'COMPANION').toUpperCase().slice(0, 24),
      greetingMessage: rawGreeting.slice(0, 1000),
      systemPrompt: rawSystemPrompt.slice(0, 4000),
      exampleDialogue: Array.isArray(body.exampleDialogue) ? body.exampleDialogue.slice(0, 6) : [],
      baseModelId: body.baseModelId || 'gpt-5.6-sol',
      conversationStarters: Array.isArray(body.conversationStarters)
        ? body.conversationStarters.slice(0, 6).map((s) => ({
            title: stripHtml(s.title || '').slice(0, 60),
            prompt: stripHtml(s.prompt || '').slice(0, 300),
          }))
        : [],
      capabilities: {
        webSearch: Boolean(body.capabilities?.webSearch),
        deepReasoning: body.capabilities?.deepReasoning !== false,
        codeInterpreter: body.capabilities?.codeInterpreter !== false,
      },
      isPublic: body.isPublic !== false,
      isBuiltIn: false,
      chatCount: 0,
      rating: 5.0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const saved = await repo.savePersona(newPersona);
    return NextResponse.json({ success: true, persona: saved }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to save custom companion' }, { status: 500 });
  }
}
