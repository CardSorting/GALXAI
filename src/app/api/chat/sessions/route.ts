import { withDeveloperAccess } from '@/lib/security/developer-access';
import { NextRequest, NextResponse } from 'next/server';
import {
  ChatRepository,
  ChatRepositoryAccessError,
} from '@/lib/supabase/repositories/ChatRepository';
import { GalxAuthEngine } from '@/core/auth/GalxAuthEngine';
import {
  ChatRequestValidationError,
  createChatResourceId,
  normalizeChatResourceId,
  parseChatJsonBody,
} from '@/core/chat/GalxChatRequestNormalizer';
import type { PersistedChatSession as ChatSession } from '@/core/chat/GalxChatPersistenceContracts';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function routeError(error: unknown, fallback: string): NextResponse {
  if (error instanceof ChatRequestValidationError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  if (error instanceof ChatRepositoryAccessError) {
    return NextResponse.json({ error: 'Chat session not found.' }, { status: 404 });
  }
  console.error(`[chat/sessions] ${fallback}:`, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

/**
 * GET /api/chat/sessions
 * Fetch all chat sessions for the authenticated user
 */
async function previewGET(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const repo = ChatRepository.getInstance();
    const sessions = await repo.getSessions(authResult.userId);

    return NextResponse.json({ success: true, sessions });
  } catch (error) {
    return routeError(error, 'Failed to fetch sessions.');
  }
}

/**
 * POST /api/chat/sessions
 * Create, update, pin, or rename a chat session
 */
async function previewPOST(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = (await parseChatJsonBody(req)) as Partial<ChatSession> & { action?: string };
    const requestedSessionId = normalizeChatResourceId(body.id, 'session_id');
    const sessionId = requestedSessionId || createChatResourceId('session');
    if (body.action && !['toggle-pin', 'toggle-archive'].includes(body.action)) {
      throw new ChatRequestValidationError('Unsupported session action.', 'invalid_session_action');
    }
    if (body.action && !requestedSessionId) {
      throw new ChatRequestValidationError(
        'session_id is required for session actions.',
        'missing_session_id'
      );
    }

    const repo = ChatRepository.getInstance();

    // Handle Quick Action: toggle-pin
    if (body.action === 'toggle-pin') {
      const isPinned = Boolean(body.isPinned);
      await repo.togglePin(sessionId, isPinned, authResult.userId);
      return NextResponse.json({ success: true, isPinned });
    }

    // Handle Quick Action: toggle-archive
    if (body.action === 'toggle-archive') {
      const isArchived = Boolean(body.isArchived);
      await repo.toggleArchive(sessionId, isArchived, authResult.userId);
      return NextResponse.json({ success: true, isArchived });
    }

    const session: ChatSession = {
      id: sessionId,
      title: typeof body.title === 'string' ? body.title.slice(0, 200) : 'New conversation',
      createdAt: body.createdAt || Date.now(),
      updatedAt: body.updatedAt || Date.now(),
      modelId: body.modelId || 'galx-nova',
      personaId: body.personaId,
      isPinned: Boolean(body.isPinned),
      isArchived: Boolean(body.isArchived),
    };

    const saved = await repo.saveSession(session, authResult.userId);
    return NextResponse.json({ success: true, session: saved }, { status: requestedSessionId ? 200 : 201 });
  } catch (error) {
    return routeError(error, 'Failed to save session.');
  }
}

/**
 * DELETE /api/chat/sessions?id=session_123&hardDelete=true
 * Delete or archive (which deletes) a chat conversation
 */
async function previewDELETE(req: NextRequest) {
  try {
    const authEngine = GalxAuthEngine.getInstance();
    const authResult = await authEngine.resolveAuthIdentity(req);
    if (!authResult.authenticated || !authResult.userId) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = normalizeChatResourceId(searchParams.get('id'), 'session_id');
    const hardDelete = searchParams.get('hardDelete') !== 'false';

    if (!id) {
      return NextResponse.json({ error: 'Missing session id parameter' }, { status: 400 });
    }

    const repo = ChatRepository.getInstance();
    const success = await repo.deleteSession(id, authResult.userId, hardDelete);

    return NextResponse.json({ success, id, action: hardDelete ? 'deleted' : 'archived' });
  } catch (error) {
    return routeError(error, 'Failed to delete session.');
  }
}

export const GET = withDeveloperAccess(previewGET);
export const POST = withDeveloperAccess(previewPOST);
export const DELETE = withDeveloperAccess(previewDELETE);
