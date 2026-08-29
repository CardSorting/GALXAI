import { NextRequest, NextResponse } from 'next/server';
import {
  ChatRepository,
  ChatRepositoryAccessError,
} from '@/lib/supabase/repositories/ChatRepository';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import {
  ChatRequestValidationError,
  normalizeChatResourceId,
  parseChatJsonBody,
} from '@/core/chat/GalxChatRequestNormalizer';
import { normalizeStoredChatMessages } from '@/core/chat/GalxChatPersistenceValidation';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function routeError(error: unknown, fallback: string): NextResponse {
  if (error instanceof ChatRequestValidationError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof ChatRepositoryAccessError) {
    return NextResponse.json({ error: 'Chat session not found.' }, { status: 404 });
  }
  console.error(`[chat/messages] ${fallback}:`, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

/**
 * GET /api/chat/messages?sessionId=session_123
 * Retrieve messages for a given chat session
 */
export async function GET(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = normalizeChatResourceId(
      searchParams.get('sessionId') || searchParams.get('conversationId'),
      'session_id'
    );

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId parameter' }, { status: 400 });
    }

    const repo = ChatRepository.getInstance();
    const messages = await repo.getMessages(sessionId, authResult.userId);

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    return routeError(error, 'Failed to fetch messages.');
  }
}

/**
 * POST /api/chat/messages
 * Batch save/sync messages for a given chat session
 */
export async function POST(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = await parseChatJsonBody(req);
    const sessionId = normalizeChatResourceId(body.sessionId || body.conversationId, 'session_id');
    const messages = normalizeStoredChatMessages(body.messages);

    if (!sessionId) {
      return NextResponse.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const repo = ChatRepository.getInstance();
    const success = await repo.saveMessages(sessionId, messages, authResult.userId);

    return NextResponse.json({ success, count: messages.length });
  } catch (error) {
    return routeError(error, 'Failed to save messages.');
  }
}
