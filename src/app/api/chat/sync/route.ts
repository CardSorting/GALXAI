import { NextRequest, NextResponse } from 'next/server';
import {
  ChatRepository,
  ChatRepositoryAccessError,
} from '@/lib/supabase/repositories/ChatRepository';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import type { ChatSession } from '@/components/chat/ChatSidebar';
import type { ChatMessage } from '@/components/chat/ChatMessageItem';
import {
  ChatRequestValidationError,
  normalizeChatResourceId,
  optionalFiniteNumber,
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
  console.error(`[chat/sync] ${fallback}:`, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

/**
 * GET /api/chat/sync?activeSessionId=session_123&since=1787980000000
 * World-Class Keyset Delta Sync with ETag Caching (HTTP 304 Fast-Path)
 * Returns 304 Not Modified with 0-byte body if client state is fresh, or single-hop delta payload.
 */
export async function GET(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const activeSessionId = normalizeChatResourceId(searchParams.get('activeSessionId'), 'active_session_id');
    const sinceParam = searchParams.get('since');
    const sinceEpoch = optionalFiniteNumber(sinceParam, 'since', {
      min: 0,
      max: Number.MAX_SAFE_INTEGER,
      integer: true,
    });
    const ifNoneMatch = req.headers.get('if-none-match') || undefined;
    if (ifNoneMatch && ifNoneMatch.length > 512) {
      throw new ChatRequestValidationError('If-None-Match is too long.', 'invalid_if_none_match');
    }

    const repo = ChatRepository.getInstance();
    const delta = await repo.getChatDeltaSync(authResult.userId, ifNoneMatch, sinceEpoch, activeSessionId);

    if (delta.notModified) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: delta.etag,
          'Cache-Control': 'private, no-cache',
        },
      });
    }

    return NextResponse.json(
      {
        success: true,
        etag: delta.etag,
        sessions: delta.sessions || [],
        activeSessionId: delta.activeSessionId,
        messages: delta.messages || [],
        multiSessionMessages: delta.multiSessionMessages || {},
        personas: delta.personas || [],
      },
      {
        headers: {
          ETag: delta.etag,
          'Cache-Control': 'private, no-cache',
        },
      }
    );
  } catch (error) {
    return routeError(error, 'Failed to fetch chat synchronization state.');
  }
}

/**
 * POST /api/chat/sync
 * 1-Hop Atomic Bundle Sync:
 * Batches session updates, message streams, or deletions into a single network & database roundtrip.
 */
export async function POST(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const rawBody = await parseChatJsonBody(req);
    const body = rawBody as {
      session?: Partial<ChatSession>;
      messages?: unknown;
      deleteSessionId?: string;
    };
    if (body.session !== undefined && (!body.session || typeof body.session !== 'object' || Array.isArray(body.session))) {
      throw new ChatRequestValidationError('session must be an object.', 'invalid_session');
    }
    const sessionId = body.session
      ? normalizeChatResourceId(body.session.id, 'session_id')
      : undefined;
    const deleteSessionId = normalizeChatResourceId(body.deleteSessionId, 'delete_session_id');
    if (body.session && !sessionId) {
      throw new ChatRequestValidationError('session.id is required.', 'missing_session_id');
    }
    if (body.session && deleteSessionId) {
      throw new ChatRequestValidationError(
        'A bundle cannot update and delete a session at the same time.',
        'conflicting_sync_operations'
      );
    }
    const messages = body.messages === undefined ? undefined : normalizeStoredChatMessages(body.messages);
    if (messages?.length && !sessionId) {
      throw new ChatRequestValidationError(
        'session.id is required when synchronizing messages.',
        'missing_session_id'
      );
    }
    if (!body.session && !deleteSessionId && !messages?.length) {
      throw new ChatRequestValidationError('The sync bundle contains no operation.', 'empty_sync_bundle');
    }

    const repo = ChatRepository.getInstance();
    const result = await repo.syncChatBundle({
      session: body.session ? { ...body.session, id: sessionId } : undefined,
      messages: messages as ChatMessage[] | undefined,
      deleteSessionId,
      userId: authResult.userId,
    });

    return NextResponse.json(result);
  } catch (error) {
    return routeError(error, 'Failed to synchronize chat bundle.');
  }
}
